"""Measure the engine on reactions it was never shown.

Usage: python3 -I tools/benchmark.py <data-dir> [n] [budget_s]

The held-out set is one reaction in ten, split by a hash of the patent id, so
none of its templates are in the library. Two things get measured and they are
not the same thing:

  solved      - the search reached purchasable material at all
  recovered   - its first step is the disconnection the chemist actually used

`solved` is the useful capability. `recovered` is the stricter, more honest
number: a route can be chemically reasonable and still differ from the patent,
but if the engine routinely proposes the same first bond the chemist chose,
that is evidence the priors are pointed the right way.

A failure is also a measurement. Unsolved targets are counted by reason, because
"no template applied" and "ran out of budget" call for completely different
fixes.
"""
import json
import os
import sys
import time
from collections import Counter

# Run with -I (isolated), which drops the script's own directory from the
# import path, so it is put back explicitly. The isolation is worth keeping:
# this reads a corpus downloaded from the internet.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import Engine, Stock, canon


def main(data_dir, limit, budget):
    templates = json.load(open(os.path.join(data_dir, 'templates.json')))
    stock_list = json.load(open(os.path.join(data_dir, 'stock.json')))
    holdout = json.load(open(os.path.join(data_dir, 'holdout.json')))[:limit]

    # No heavy-atom shortcut: with a real supplier catalogue, "purchasable"
    # means present in the catalogue and nothing else. The shortcut existed to
    # paper over a 3,489-molecule derived stock, and it inflated the solve rate
    # by quietly declaring the target itself buyable.
    stock = Stock(stock_list, max_heavy_atoms=0)
    engine = Engine(templates, stock)

    tally = Counter()
    depths = Counter()
    elapsed = []
    started = time.time()

    for case in holdout:
        target = case['target']
        if target in stock:
            tally['target_already_in_stock'] += 1
            continue
        t0 = time.time()
        found = engine.search(target, max_depth=8, max_expansions=250,
                              budget_s=budget, max_routes=1)
        elapsed.append(time.time() - t0)
        if not found['ok']:
            tally['unsolved'] += 1
            tally['unsolved:' + found['reason']] += 1
            continue
        tally['solved'] += 1
        route = found['routes'][0]
        depths[route['depth']] += 1
        if route['steps']:
            first = set(route['steps'][0]['precursors'])
            if first == set(case['reactants'].split('.')):
                tally['recovered_exact'] += 1

    attempted = tally['solved'] + tally['unsolved']
    print(json.dumps({
        'holdout_tested': len(holdout),
        'attempted': attempted,
        'solved': tally['solved'],
        'solve_rate': round(100 * tally['solved'] / max(1, attempted), 1),
        'recovered_first_step': tally['recovered_exact'],
        'recovery_rate': round(100 * tally['recovered_exact'] / max(1, attempted), 1),
        'route_depths': dict(sorted(depths.items())),
        'median_seconds': round(sorted(elapsed)[len(elapsed) // 2], 2) if elapsed else None,
        'total_seconds': round(time.time() - started, 1),
        'failures': {k: v for k, v in tally.items() if k.startswith('unsolved:')},
        'engine_stats': dict(engine.stats),
    }, indent=1))


if __name__ == '__main__':
    main(sys.argv[1],
         int(sys.argv[2]) if len(sys.argv) > 2 else 100,
         float(sys.argv[3]) if len(sys.argv) > 3 else 20.0)
