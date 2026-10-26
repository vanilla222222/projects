"""Offline orchestration regressions; never regenerate the project's datasets."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('repin', Path(__file__).with_name('repin.py'))
repin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repin)


class RepinTests(unittest.TestCase):
    def test_changed_source_cannot_keep_its_old_pin(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source.js'
            source.write_text('reviewed graph')
            pins = {'source.js': repin.sha(source)}
            self.assertEqual(repin.check_hashes(root, pins), [])
            source.write_text('reviewed graph plus a new entry')
            self.assertEqual(len(repin.check_hashes(root, pins)), 1)
            self.assertEqual(pins['source.js'], hashlib.sha256(b'reviewed graph').hexdigest())

    def test_missing_output_is_not_fresh(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(len(repin.check_hashes(Path(directory), {'missing.js':'0'*64})), 1)

    def test_a_pin_cannot_escape_the_project(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIn('escapes project', repin.check_hashes(Path(directory), {'../outside.js':'0'*64})[0])

    def test_owner_failure_stops_downstream_builds(self):
        calls = []
        def runner(command):
            calls.append(command[0])
            if command[0] == 'identity-compiler':
                raise subprocess.CalledProcessError(1, command)
        steps = [('tags',['tag-builder']),('overlay',['identity-compiler']),('releases',['release-builder'])]
        with self.assertRaises(subprocess.CalledProcessError):
            repin.run_chain(steps, runner)
        self.assertEqual(calls, ['tag-builder','identity-compiler'])

    def test_overlay_owners_precede_dependents(self):
        names = [name for name, _ in repin.build_steps('python','node')]
        self.assertLess(names.index('library tags and family coverage'), names.index('curated overlay and provenance'))
        self.assertLess(names.index('curated overlay and provenance'), names.index('matched pairs'))
        self.assertLess(names.index('matched pairs'), names.index('release snapshots (existing history only)'))
        self.assertLess(names.index('shared counts'), names.index('retrieval benchmark'))

    def test_unchanged_library_does_not_rewrite_name_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'data').mkdir()
            (root/'validation').mkdir()
            (root/'data/library.js').write_text('audited library')
            report = root/'validation/library-name-provenance.json'
            report.write_text(json.dumps({'librarySha256':repin.sha(root/'data/library.js')}))
            before = report.read_bytes()
            with mock.patch.object(repin,'ROOT',root), mock.patch.object(repin,'run') as runner:
                repin.refresh_names('node',None)
                runner.assert_not_called()
            self.assertEqual(report.read_bytes(),before)

    def test_changed_library_without_audited_base_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'data').mkdir()
            (root/'validation').mkdir()
            (root/'data/library.js').write_text('new library')
            (root/'validation/library-name-provenance.json').write_text(json.dumps({'librarySha256':'0'*64}))
            with mock.patch.object(repin,'ROOT',root), mock.patch.object(repin,'run') as runner:
                with self.assertRaisesRegex(ValueError,'name-base'):
                    repin.refresh_names('node',None)
                runner.assert_not_called()

    def test_plan_is_read_only_and_includes_validation(self):
        pin = repin.ROOT/'data/reference-audit-baseline.js'
        before = pin.read_bytes()
        result = subprocess.check_output([sys.executable,str(Path(__file__).with_name('repin.py')),'--plan'],text=True)
        self.assertTrue(json.loads(result)['validation'])
        self.assertEqual(pin.read_bytes(),before)


if __name__ == '__main__':
    unittest.main()
