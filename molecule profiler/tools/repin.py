#!/usr/bin/env python3
"""Rebuild current reference pins through their owners, then run full validation.

Historical assay/source snapshots and release history are never re-pinned here.
Use --check for read-only freshness/validation, or --plan to inspect the chain.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_hashes(root, pins):
    errors = []
    for name, expected in pins.items():
        path = (root / name).resolve()
        if not path.is_relative_to(root.resolve()):
            errors.append('Source path escapes project: ' + name)
        elif not path.is_file() or sha(path) != expected:
            errors.append('Stale or missing source: ' + name)
    return errors


def run(command):
    print('RUN ' + ' '.join(map(str, command)), flush=True)
    subprocess.run(command, cwd=ROOT, check=True)


def run_chain(steps, runner=run):
    # Sequential dependencies: a failed owner stops the chain and validation.
    for name, command in steps:
        print('Rebuilding ' + name, flush=True)
        runner(command)


def node_json(node, script, *args):
    return json.loads(subprocess.check_output([node, '-e', script, *args], cwd=ROOT, text=True))


def js_meta(node, file, key, fields):
    return node_json(node, "const [f,k,...fields]=process.argv.slice(1),m=require('./'+f),v=k?m[k]:m;console.log(JSON.stringify(Object.fromEntries(fields.map(f=>[f,v[f]]))));", file, key, *fields)


def check_pins(node):
    errors = []
    reports = [
        ('validation/library-name-provenance.json', 'data/library-names.js', 'tools/curate-library-names.py'),
        ('validation/library-tag-provenance.json', 'data/library-tags.js', None),
        ('validation/library-family-coverage.json', 'data/library-tags.js', None),
        ('validation/curated-references.json', 'data/curated-references.js', 'tools/build-curated-references.py'),
        ('validation/library-receptor-tags.json', 'data/library-receptor-tags.js', None),
        ('validation/receptor-scaffold-diversity.json', None, None),
    ]
    for report_file, output, builder in reports:
        report = json.loads((ROOT / report_file).read_text())
        pins = {}
        for key in ['sourceSha256', 'inputSha256', 'familySourceSha256', 'studySourceSha256']:
            pins.update(report.get(key, {}))
        if 'librarySha256' in report:
            pins['data/library.js'] = report['librarySha256']
        if builder:
            pins[builder] = report['toolSha256']
        if output:
            pins[output] = report['dataSha256']
        if 'identityCorrectionSha256' in report:
            pins['data/reference-identity-corrections.json'] = report['identityCorrectionSha256']
        if report_file == 'validation/curated-references.json':
            actual = {str(p.relative_to(ROOT)) for p in (ROOT / 'data/curated-reference-entries').glob('*.json')}
            if actual != set(report['inputSha256']):
                errors.append('Curated entry inventory changed; run its compiler')
        if not pins:
            errors.append('Missing source pins in ' + report_file)
        errors.extend(report_file + ': ' + e for e in check_hashes(ROOT, pins))
    for file, key, fields, fixed in [
        ('data/fingerprint-engine.js', '', ['sourceSha256'], {}),
        ('data/reference-motifs.js', 'REFERENCE_MOTIFS', ['sourceSha256'], {}),
        ('data/benchmark.js', 'RETRIEVAL_BENCHMARK', ['sourceSha256'], {}),
        ('data/reference-matched-pairs.js', 'REFERENCE_MATCHED_PAIRS', ['sourceSha256', 'builderSha256'], {'sourceSha256':'data/curated-references.js', 'builderSha256':'tools/build-reference-pairs.py'}),
        ('data/reference-releases.js', 'REFERENCE_RELEASES', ['liveSources', 'historySha256', 'builderSha256'], {'historySha256':'data/reference-release-history.json', 'builderSha256':'tools/build-reference-releases.py'}),
    ]:
        metadata = js_meta(node, file, key, fields)
        pins = {}
        for field, value in metadata.items():
            if isinstance(value, dict):
                pins.update(value)
            elif field in fixed:
                pins[fixed[field]] = value
        if not pins:
            errors.append('Missing source pins in ' + file)
        errors.extend(file + ': ' + e for e in check_hashes(ROOT, pins))
    current_coverage = node_json(node, coverage_script(False))
    if current_coverage != json.loads((ROOT / 'validation/receptor-ligand-coverage.json').read_text()):
        errors.append('Stale receptor coverage snapshot')
    if errors:
        raise ValueError('\n'.join(errors))
    run([node, 'tools/reference-counts.js', '--check'])
    print('Current reference pins are consistent. Historical source witnesses were preserved.', flush=True)


def coverage_script(write):
    code = "const api=require('./js/receptor-catalog'),{RECEPTOR_REFERENCE_CATALOG:c}=require('./data/receptor-catalog'),{LIBRARY:l}=require('./data/library'),{TARGETS:t}=require('./data/targets'),{RECEPTOR_LIGAND_ANNOTATIONS:a}=require('./data/receptor-ligand-annotations');const report=api.coverageReport(c.receptors,t,l,a);if(report.annotationIssues)throw Error('Invalid receptor annotations');"
    return code + ("require('fs').writeFileSync('validation/receptor-ligand-coverage.json',JSON.stringify(report,null,2)+'\\n');" if write else "console.log(JSON.stringify(report));")


def build_steps(python, node):
    return [
        ('fingerprint version', [node, 'tools/build-fingerprint-version.js']),
        ('library tags and family coverage', [python, '-B', 'tools/build-library-tags.py']),
        ('curated overlay and provenance', [python, '-B', 'tools/build-curated-references.py']),
        ('receptor tags and provenance', [python, '-B', 'tools/build-receptor-tags.py']),
        ('structural motifs', [python, '-B', 'tools/build-reference-motifs.py']),
        ('matched pairs', [python, '-B', 'tools/build-reference-pairs.py']),
        ('release snapshots (existing history only)', [python, '-B', 'tools/build-reference-releases.py']),
        ('receptor diversity', [python, '-B', 'tools/receptor-diversity-audit.py', '--output', 'validation/receptor-scaffold-diversity.json']),
        ('receptor coverage', [node, '-e', coverage_script(True)]),
        ('shared counts', [node, 'tools/reference-counts.js', '--write']),
        ('retrieval benchmark', [node, 'tools/retrieval-benchmark.js', '--write']),
    ]


def refresh_names(node, base):
    report = json.loads((ROOT / 'validation/library-name-provenance.json').read_text())
    if report['librarySha256'] == sha(ROOT / 'data/library.js'):
        return
    # The owner verifies every old row is unchanged, with no new naming candidates.
    base = base or report.get('libraryExtensionWitness', {}).get('baseCommit')
    if not base:
        raise ValueError('Supply --name-base <audited full commit> for an append-only named extension. Changes to old graphs or new CHEMBL-ID naming candidates require tools/curate-library-names.py first.')
    run([node, 'tools/refresh-library-name-witness.js', base])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true', help='Read-only pin checks plus the full validation suite')
    mode.add_argument('--plan', action='store_true', help='Print the build order without executing it')
    parser.add_argument('--name-base', help='Full commit of the audited library for a named append-only extension')
    parser.add_argument('--node', default=os.environ.get('NODE', 'node'))
    parser.add_argument('--no-validation', action='store_true', help='Check/rebuild pins only; explicitly does not claim a green validation suite')
    parser.add_argument('--report', help='Pass a diagnostics JSON path to run-validation.js')
    args = parser.parse_args()
    steps = build_steps(sys.executable, args.node)
    if args.plan:
        print(json.dumps({'preflight':'Refresh names only after the append-only identity guard succeeds', 'steps':[name for name, _ in steps], 'validation':not args.no_validation}, indent=2))
        return
    if not args.check:
        refresh_names(args.node, args.name_base)
        run_chain(steps)
    check_pins(args.node)
    if args.no_validation:
        print('Full validation skipped by --no-validation. No full-suite pass is claimed.')
    else:
        command = [args.node, 'tools/run-validation.js']
        if args.report:
            command += ['--report', args.report]
        run(command)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print('Repin stopped: ' + str(error), file=sys.stderr)
        sys.exit(1)
