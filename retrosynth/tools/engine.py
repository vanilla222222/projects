"""Retrosynthetic route search over a mined template library.

The search is best-first over *states*, where a state is the multiset of
molecules still to be made. The target alone is the start state; a state whose
molecules are all purchasable is a finished route. One step picks a molecule,
applies a retro template to it, and replaces it with that template's precursors.

Framing it over states rather than as an AND-OR graph with value iteration is a
deliberate simplification. The AND-OR form is what retro* uses and it is
stronger, but its correctness rests on a value function that has to be learned
and whose errors are invisible. A state is a plain object that is either solved
or not, so every answer the search returns can be checked against the templates
that produced it - which is the property this project is built around.

Cost is -log(template frequency) summed over the steps, so popular chemistry is
cheap and exotic chemistry has to earn its place. The heuristic is the number of
molecules not yet purchasable, which never overestimates the steps remaining
(each step retires at most one molecule), so the first complete route found with
an admissible heuristic is the cheapest one.
"""
import heapq
import math
import time
from collections import Counter

from rdkit import Chem, RDLogger
from rdchiral.main import rdchiralRun
from rdchiral.initialization import rdchiralReaction, rdchiralReactants

RDLogger.DisableLog('rdApp.*')


def canon(smiles):
    """Canonical SMILES with atom maps stripped, or None if unparseable."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    for atom in mol.GetAtoms():
        atom.SetAtomMapNum(0)
    return Chem.MolToSmiles(mol)


def split_components(smiles):
    """A reaction output may be several molecules; treat each separately."""
    out = []
    for piece in smiles.split('.'):
        one = canon(piece)
        if one is not None:
            out.append(one)
    return out


class Stock:
    """What counts as purchasable, and therefore as a finished branch."""

    def __init__(self, smiles_iterable, max_heavy_atoms=0):
        self.items = set()
        for smiles in smiles_iterable:
            one = canon(smiles)
            if one:
                self.items.add(one)
        # Below some size everything is a reagent-shelf commodity, and a search
        # that keeps taking methanol apart is wasting its budget.
        self.max_heavy_atoms = max_heavy_atoms
        self._cache = {}

    def __contains__(self, smiles):
        hit = self._cache.get(smiles)
        if hit is not None:
            return hit
        found = smiles in self.items
        if not found and self.max_heavy_atoms:
            mol = Chem.MolFromSmiles(smiles)
            found = mol is not None and mol.GetNumHeavyAtoms() <= self.max_heavy_atoms
        self._cache[smiles] = found
        return found

    def __len__(self):
        return len(self.items)


class Step:
    """One retro step: a molecule replaced by the precursors that make it."""

    __slots__ = ('product', 'precursors', 'smarts', 'cost')

    def __init__(self, product, precursors, smarts, cost):
        self.product = product
        self.precursors = precursors
        self.smarts = smarts
        self.cost = cost

    def as_dict(self):
        return {'product': self.product, 'precursors': list(self.precursors),
                'smarts': self.smarts, 'cost': round(self.cost, 3)}


class Engine:
    def __init__(self, templates, stock, max_templates_per_molecule=400):
        """templates: the build step's list, most frequent first.

        Only the most frequent `max_templates_per_molecule` are ever tried. The
        library's long tail is 7,000 templates seen exactly once, and trying all
        of them on every intermediate would cost far more than it returns: 311
        templates already account for half of the corpus. The cap is the single
        biggest lever on search speed, so it is a constructor argument.
        """
        self.templates = templates[:max_templates_per_molecule]
        self.stock = stock
        self.max_templates_per_molecule = max_templates_per_molecule
        total = sum(t['count'] for t in templates) or 1
        # A frequency prior, as a cost. Popular transforms are near-free; a
        # template seen once in fifty thousand reactions costs a lot to use.
        self.cost_of = {t['smarts']: -math.log(t['count'] / total) for t in templates}
        # Compiled once here rather than per application. rdchiral will happily
        # take a SMARTS string every call, and re-parses it every call; at a few
        # hundred templates per molecule and a few hundred molecules per search
        # that parsing was most of the running time.
        self._compiled = []
        for template in self.templates:
            try:
                self._compiled.append((template['smarts'], rdchiralReaction(template['smarts'])))
            except Exception:
                continue
        self._expansions = {}
        self.stats = Counter()

    def expand(self, smiles):
        """Every one-step disconnection of this molecule, cheapest first.

        Cached: the same intermediate turns up on many branches, and applying a
        few hundred SMARTS is the expensive part of the whole search.
        """
        hit = self._expansions.get(smiles)
        if hit is not None:
            self.stats['expand_cached'] += 1
            return hit

        steps = []
        seen = set()
        try:
            subject = rdchiralReactants(smiles)
        except Exception:
            self.stats['bad_molecule'] += 1
            self._expansions[smiles] = []
            return []
        for smarts, reaction in self._compiled:
            try:
                outcomes = rdchiralRun(reaction, subject)
            except Exception:
                self.stats['apply_error'] += 1
                continue
            for outcome in outcomes:
                precursors = tuple(sorted(split_components(outcome)))
                if not precursors or precursors == (smiles,):
                    continue
                if precursors in seen:
                    continue
                seen.add(precursors)
                steps.append(Step(smiles, precursors, smarts, self.cost_of[smarts]))

        steps.sort(key=lambda s: s.cost)
        self._expansions[smiles] = steps
        self.stats['expand_computed'] += 1
        return steps

    def search(self, target, max_depth=10, max_expansions=400, budget_s=60.0,
               max_routes=1):
        """Best-first search for routes from `target` down to purchasable stock."""
        target = canon(target)
        if target is None:
            return {'ok': False, 'reason': 'target could not be parsed', 'routes': []}
        if target in self.stock:
            return {'ok': True, 'reason': 'target is already purchasable',
                    'routes': [{'steps': [], 'cost': 0.0, 'depth': 0}]}

        started = time.time()
        # Each entry: (priority, tiebreak, pending molecules, steps so far, cost)
        counter = 0
        start = (frozenset([target]),)
        frontier = [(1.0, counter, start[0], (), 0.0)]
        visited = {start[0]: 0.0}
        routes = []
        expansions = 0

        while frontier:
            if time.time() - started > budget_s:
                self.stats['timeout'] += 1
                break
            if expansions >= max_expansions:
                self.stats['expansion_cap'] += 1
                break

            _, _, pending, steps, cost = heapq.heappop(frontier)

            unmade = [m for m in pending if m not in self.stock]
            if not unmade:
                routes.append({'steps': [s.as_dict() for s in steps],
                               'cost': round(cost, 3), 'depth': len(steps)})
                if len(routes) >= max_routes:
                    break
                continue

            if len(steps) >= max_depth:
                continue

            # Work on the hardest-looking molecule first: the one the stock is
            # least likely to absorb. Largest heavy-atom count is a crude but
            # reliable stand-in, and it keeps the branching factor down early.
            unmade.sort(key=lambda m: -(Chem.MolFromSmiles(m).GetNumHeavyAtoms()
                                        if Chem.MolFromSmiles(m) else 0))
            focus = unmade[0]

            expansions += 1
            for step in self.expand(focus):
                rest = frozenset(m for m in pending if m != focus)
                nxt = rest | frozenset(step.precursors)
                new_cost = cost + step.cost
                if nxt in visited and visited[nxt] <= new_cost:
                    continue
                visited[nxt] = new_cost
                remaining = sum(1 for m in nxt if m not in self.stock)
                counter += 1
                heapq.heappush(frontier,
                               (new_cost + remaining, counter, nxt, steps + (step,), new_cost))

        return {'ok': bool(routes),
                'reason': 'solved' if routes else 'no route within budget',
                'routes': routes,
                'expansions': expansions,
                'seconds': round(time.time() - started, 2)}
