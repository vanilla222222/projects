#!/usr/bin/env python3
"""Validate a generated ZIP with independent Python standard-library readers."""
import csv
import io
import json
import pathlib
import subprocess
import tempfile
import zipfile
import zlib
root=pathlib.Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as directory:
    path=pathlib.Path(directory)/"sample.zip"
    subprocess.run(["node",str(root/"tools/generate-research-zip-fixture.js"),str(path)],cwd=root,check=True)
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(set(archive.namelist())) == 7
        manifest=json.loads(archive.read("manifest.json"))
        assert manifest["schemaVersion"] == "1.1"
        assert manifest["applicationRevision"] is None
        assert manifest["applicationAssetToken"] == "js/app.js?v=test"
        assert manifest["referenceLibraryCount"] == 42
        assert manifest["qualitySummary"]["counts"]["missing_descriptor"] == 1
        assert manifest["qualitySummary"]["counts"]["input_error"] == 1
        for entry in manifest["files"]:
            data=archive.read(entry["name"])
            assert len(data)==entry["bytes"]
            assert format(zlib.crc32(data),"08x")==entry["crc32"]
        def rows(name):
            return list(csv.DictReader(io.StringIO(archive.read(name).decode("utf-8-sig"))))
        molecules=rows("molecules.csv")
        descriptors=rows("descriptors.csv")
        quality=rows("quality.csv")
        assert molecules[0]["name"]=="Café, Test"
        assert len(descriptors)==28
        assert next(x for x in descriptors if x["molecule_id"]=="mol-0002" and x["descriptor"]=="logp")["value"]==""
        assert {x["issue"] for x in quality}=={"missing_descriptor","input_error"}
print("Independent ZIP/CSV/manifest validation passed")
