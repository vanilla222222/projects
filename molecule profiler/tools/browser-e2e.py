#!/usr/bin/env python3
"""Browser integration tests for Molecule Profiler.

Run: python -m pip install playwright
     python -m playwright install chromium
     python tools/browser-e2e.py

Set CHROMIUM_PATH to use an existing browser executable. Tests run a temporary
localhost static server, do not contact remote services, and use fixture SMILES.
"""
from __future__ import annotations

import csv
import io
import json
import os
import pathlib
import tempfile
import threading
import unittest
import zipfile
import zlib
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

SITE = pathlib.Path(__file__).resolve().parent.parent
ARTIFACTS = pathlib.Path(os.environ.get("BROWSER_TEST_ARTIFACTS", "browser-test-artifacts")).resolve()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


class BrowserWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), partial(QuietHandler, directory=str(SITE))
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}/index.html"
        cls.pw = sync_playwright().start()
        opts = {"headless": True}
        if os.environ.get("CHROMIUM_PATH"):
            opts["executable_path"] = os.environ["CHROMIUM_PATH"]
        cls.browser = cls.pw.chromium.launch(**opts)
        print("Chromium version:", cls.browser.version, flush=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(accept_downloads=True)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda err: self.errors.append(str(err)))
        self.context.tracing.start(screenshots=True, snapshots=True, sources=True)
        self.page.set_default_timeout(40000)
        self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=60000)
        self.page.locator("#run").wait_for()
        self.page.wait_for_function(
            "() => !document.getElementById('results').hidden", timeout=120000
        )

    def tearDown(self):
        name = self.id().rsplit(".", 1)[-1]
        failure_cases = self._outcome.result.errors + self._outcome.result.failures
        failed = any(case is self for case, _ in failure_cases)
        try:
            if failed or self.errors:
                self.page.screenshot(path=str(ARTIFACTS / f"{name}.png"), full_page=True)
                (ARTIFACTS / f"{name}-errors.txt").write_text(
                    "\n".join(self.errors) or "Assertion failed; inspect trace.",
                    encoding="utf-8",
                )
        finally:
            self.context.tracing.stop(path=str(ARTIFACTS / f"{name}.zip") if failed else None)
            self.context.close()

    def analyze(self, text, expected):
        self.page.locator("#smiles-input").fill(text)
        self.page.locator("#run").click()
        self.page.wait_for_function(
            "expected => document.getElementById('status').textContent.includes(expected)",
            arg=expected, timeout=120000
        )
        self.assertFalse(self.page.locator("#results").evaluate("(el) => el.hidden"))

    def test_analysis_validation_and_switching(self):
        self.analyze("Water, O\nEthanol, CCO\nBroken, C1CC", "2 analyzed")
        status = self.page.locator("#status").inner_text()
        self.assertIn("1 skipped", status)
        self.assertIn("Line 3:", self.page.locator("#input-errors").inner_text())
        tabs = self.page.locator("#molecule-tabs [data-index]")
        self.assertEqual(tabs.count(), 2)
        tabs.nth(1).click()
        self.assertEqual(tabs.nth(1).get_attribute("aria-selected"), "true")
        self.assertEqual(tabs.nth(0).get_attribute("aria-selected"), "false")
        self.assertIn("Ethanol", self.page.locator("#report-title").inner_text())
        self.assertFalse(self.page.locator("#quality-summary").evaluate("(el) => el.hidden"))
        tabs.nth(0).click()
        self.assertEqual(tabs.nth(0).get_attribute("aria-selected"), "true")
        self.assertIn("Water", self.page.locator("#report-title").inner_text())
        self.assertEqual(self.errors, [], "Browser JavaScript errors: " + repr(self.errors))

    def test_batch_chart_and_csv(self):
        self.analyze("Water, O\nEthanol, CCO\nPropane, CCC", "3 analyzed")
        self.page.locator('#workspace-nav button[data-view="data"]').click()
        self.assertFalse(self.page.locator("#descriptor-distributions").evaluate("(el) => el.hidden"))
        self.page.locator("#distribution-metric").select_option("mw")
        self.assertIn("3 valid of 3", self.page.locator("#distribution-summary").inner_text())
        self.assertEqual(self.page.locator("#distribution-plot svg rect").count(), 12)
        self.page.locator("#batch-search").fill("Ethanol")
        self.assertIn("of 1 matching", self.page.locator("#batch-count").inner_text())
        self.assertEqual(self.page.locator("#batch tbody tr[data-index]").count(), 1)
        with self.page.expect_download(timeout=120000) as event:
            self.page.locator("#export").click()
        csv_text = pathlib.Path(event.value.path()).read_text(encoding="utf-8-sig")
        rows = list(csv.reader(io.StringIO(csv_text)))
        self.assertEqual(len(rows), 4)
        self.assertTrue(any("Ethanol" in row for row in rows))
        self.assertEqual(self.errors, [], "Browser JavaScript errors: " + repr(self.errors))

    def test_workspace_navigation(self):
        self.page.locator('#workspace-nav button[data-view="data"]').click()
        self.assertFalse(self.page.locator("#descriptor-distributions").evaluate("(el) => el.hidden"))
        self.page.locator("#module-search").fill("distribution")
        self.assertIn("section", self.page.locator("#workspace-description").inner_text().lower())
        self.page.locator("#module-search").fill("")
        self.page.locator('#workspace-nav button[data-view="overview"]').click()
        self.assertTrue(self.page.locator("#descriptor-distributions").evaluate("(el) => el.hidden"))
        self.assertEqual(self.errors, [])

    def test_import_snapshot_research_archive_and_clear(self):
        self.page.locator("#molecule-file").set_input_files({
            "name": "examples.csv",
            "mimeType": "text/csv",
            "buffer": b"name,smiles\nWater,O\nEthanol,CCO\n",
        })
        self.page.wait_for_function(
            "() => document.getElementById('status').textContent.includes('2 analyzed')",
            timeout=120000,
        )
        with self.page.expect_download(timeout=120000) as event:
            self.page.locator("#export-snapshot").click()
        snapshot = json.loads(pathlib.Path(event.value.path()).read_text(encoding="utf-8"))
        self.assertEqual(len(snapshot["molecules"]), 2)
        self.assertEqual(snapshot["molecules"][0]["name"], "Water")
        with self.page.expect_download(timeout=120000) as event:
            self.page.locator("#export-research").click()
        with zipfile.ZipFile(event.value.path()) as archive:
            self.assertIsNone(archive.testzip())
            names = set(archive.namelist())
            self.assertTrue(
                {"molecules.csv", "descriptors.csv", "quality.csv",
                 "validation.csv", "data_dictionary.csv", "manifest.json",
                 "README.txt"}.issubset(names)
            )
            manifest = json.loads(archive.read("manifest.json"))
            self.assertEqual(manifest["moleculeCount"], 2)
            for file in manifest["files"]:
                data = archive.read(file["name"])
                self.assertEqual(len(data), file["bytes"])
                self.assertEqual(f"{zlib.crc32(data):08x}", file["crc32"])
            molecules = list(csv.DictReader(
                io.StringIO(archive.read("molecules.csv").decode("utf-8-sig"))
            ))
            self.assertEqual(len(molecules), 2)
        self.page.locator("#clear").click()
        self.assertTrue(self.page.locator("#results").evaluate("(el) => el.hidden"))
        self.assertTrue(self.page.locator("#export-research").is_disabled())
        self.assertEqual(self.errors, [], "Browser JavaScript errors: " + repr(self.errors))

    def test_full_csv_schema_and_limit(self):
        self.analyze("Water, O", "1 analyzed")
        with self.page.expect_download(timeout=180000) as event:
            self.page.locator("#export-full").click()
        data = pathlib.Path(event.value.path()).read_text(encoding="utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(data)))
        self.assertTrue(rows)
        for key in ("schema_version", "molecule_id", "section", "item",
                    "field", "value", "unit", "evidence_type"):
            self.assertIn(key, rows[0])
        ranked = [r for r in rows if r["section"] == "similarity"
                  and r["item"].startswith("rank ")]
        self.assertLessEqual(len({r["item"] for r in ranked}), 50)
        targets = [r for r in rows if r["section"] == "targets"
                   and r["item"].startswith("rank ")]
        self.assertLessEqual(len({r["item"] for r in targets}), 50)
        with self.page.expect_download(timeout=60000) as event:
            self.page.locator("#export-full-dictionary").click()
        dictionary = pathlib.Path(event.value.path()).read_text(encoding="utf-8-sig")
        self.assertIn("evidence_type", dictionary)
        self.assertEqual(self.errors, [], "Browser JavaScript errors: " + repr(self.errors))


if __name__ == "__main__":
    unittest.main(verbosity=2)
