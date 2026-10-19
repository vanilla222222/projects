"""Append ligand labels to target panels in data/targets.js.

Run: python tools/label-targets.py labels.json

labels.json maps a gene symbol to a list of library compound names. Each name must
already exist in data/library.js, so this tool adds no new structure and carries no
structural recall risk. Names are parsed and re-emitted with a quote-aware regex, not
split on commas, because many compound names contain commas (2,5-Dimethoxyamphetamine).

A label records that a compound is a documented ligand of the target. It is not an
affinity, selectivity, potency or clinical claim.
"""

import json
import re
import sys

TARGETS = "data/targets.js"
LIBRARY = "data/library.js"
NAME = re.compile(r"'((?:\\.|[^'\\])*)'")


def library_names(text):
    return set(NAME.search(line).group(1)
               for line in text.splitlines() if "{ name: '" in line)


def main():
    if len(sys.argv) != 2:
        print("usage: label-targets.py labels.json")
        return 1
    with open(sys.argv[1]) as fh:
        labels = json.load(fh)
    with open(LIBRARY) as fh:
        known = library_names(fh.read())
    with open(TARGETS) as fh:
        lines = fh.read().splitlines(True)

    missing = sorted(n for names in labels.values() for n in names if n not in known)
    if missing:
        print("not in library: %s" % ", ".join(missing))
        return 1

    gene = None
    added = {}
    for i, line in enumerate(lines):
        m = re.search(r"gene: '([^']*)'", line)
        if m:
            gene = m.group(1)
        if not line.lstrip().startswith("ligands: ["):
            continue
        if gene not in labels:
            continue
        head, body, tail = re.match(r"(\s*ligands: \[)(.*)(\] \},?\n?)", line).groups()
        current = NAME.findall(body)
        merged = list(current)
        for name in labels[gene]:
            if name not in merged:
                merged.append(name)
        added[gene] = len(merged) - len(current)
        lines[i] = head + ", ".join("'%s'" % n for n in merged) + tail

    unseen = sorted(set(labels) - set(added))
    if unseen:
        print("gene not in targets: %s" % ", ".join(unseen))
        return 1

    with open(TARGETS, "w") as fh:
        fh.write("".join(lines))
    for g in sorted(added):
        print("%-10s +%d" % (g, added[g]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
