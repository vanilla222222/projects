"""Find a route from a starting material up to a target.

    python3 -I tools/path.py <target-smiles> <start-smiles> [data-dir]

Unlike the page's path finder, which looks for a documented route through the
corpus, this proposes one: it searches the mined template library, so it works
on molecules nobody has made. The flip side is that a route it returns is a
hypothesis, not precedent.

    python3 -I tools/path.py \\
        'CC(=O)Oc1ccccc1C(=O)O' 'OC(=O)c1ccccc1O'
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import Engine, Stock


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    target, start = sys.argv[1], sys.argv[2]
    data = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data')

    templates = json.load(open(os.path.join(data, 'templates.json')))
    stock = Stock(json.load(open(os.path.join(data, 'stock.json'))))
    engine = Engine(templates, stock)

    found = engine.search_path(target, start)
    if not found['ok']:
        print('No path found: %s (%d expansions, %.1fs)'
              % (found['reason'], found.get('expansions', 0), found.get('seconds', 0)))
        return 2

    route = found['routes'][0]
    print('%d step%s, %.1fs\n' % (route['depth'], '' if route['depth'] == 1 else 's',
                                  found['seconds']))
    # Printed forwards - starting material first - because that is the order the
    # route would actually be run in, and the reverse of how it was searched.
    for number, step in enumerate(reversed(route['steps']), 1):
        print('  %d. %s' % (number, ' + '.join(step['precursors'])))
        print('     -> %s' % step['product'])
        print('     %s\n' % step['smarts'])
    return 0


if __name__ == '__main__':
    sys.exit(main())
