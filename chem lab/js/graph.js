class Graph {
  constructor() {
    this.atoms = [];
    this.bonds = [];
    this.nextAtomId = 1;
    this.nextBondId = 1;
    this.annotations = [];
    this.nextAnnotationId = 1;
  }

  addAtom(element, x, y) {
    const atom = { id: this.nextAtomId++, element, x, y };
    this.atoms.push(atom);
    return atom;
  }

  getAtom(id) {
    return this.atoms.find((atom) => atom.id === id) || null;
  }

  removeAtom(id) {
    const members = this.abbreviationMembers(id);
    const index = this.atoms.findIndex((atom) => atom.id === id);
    if (index === -1) {
      return false;
    }
    this.atoms.splice(index, 1);
    this.bonds = this.bonds.filter(
      (bond) => bond.atomA !== id && bond.atomB !== id
    );
    members.forEach((member) => this.removeAtom(member));
    return true;
  }

  abbreviationMembers(anchorId) {
    const anchor = this.getAtom(anchorId);
    if (!anchor || !anchor.abbr) {
      return [];
    }
    const seen = new Set([anchorId]);
    const members = [];
    const queue = [anchorId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      this.bondsForAtom(currentId).forEach((bond) => {
        const nextId = bond.atomA === currentId ? bond.atomB : bond.atomA;
        const next = this.getAtom(nextId);
        if (seen.has(nextId) || !next || !next.abbrHidden) {
          return;
        }
        seen.add(nextId);
        members.push(nextId);
        queue.push(nextId);
      });
    }
    return members;
  }

  addBond(atomAId, atomBId) {
    if (atomAId === atomBId) {
      return null;
    }
    if (!this.getAtom(atomAId) || !this.getAtom(atomBId)) {
      return null;
    }
    if (this.getBond(atomAId, atomBId)) {
      return null;
    }
    const bond = {
      id: this.nextBondId++,
      atomA: atomAId,
      atomB: atomBId,
      order: 1,
      stereo: null,
    };
    this.bonds.push(bond);
    return bond;
  }

  getBondById(id) {
    return this.bonds.find((bond) => bond.id === id) || null;
  }

  getBond(atomAId, atomBId) {
    return (
      this.bonds.find(
        (bond) =>
          (bond.atomA === atomAId && bond.atomB === atomBId) ||
          (bond.atomA === atomBId && bond.atomB === atomAId)
      ) || null
    );
  }

  removeBond(id) {
    const index = this.bonds.findIndex((bond) => bond.id === id);
    if (index === -1) {
      return false;
    }
    this.bonds.splice(index, 1);
    return true;
  }

  bondsForAtom(atomId) {
    return this.bonds.filter(
      (bond) => bond.atomA === atomId || bond.atomB === atomId
    );
  }

  connectedComponents() {
    const visited = new Set();
    const components = [];
    this.atoms.forEach((atom) => {
      if (visited.has(atom.id)) {
        return;
      }
      const atomIds = [];
      const queue = [atom.id];
      visited.add(atom.id);
      while (queue.length > 0) {
        const currentId = queue.shift();
        atomIds.push(currentId);
        this.bondsForAtom(currentId).forEach((bond) => {
          const nextId = bond.atomA === currentId ? bond.atomB : bond.atomA;
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push(nextId);
          }
        });
      }
      components.push({ atomIds });
    });
    return components;
  }

  totalBondOrder(atomId) {
    return this.bondsForAtom(atomId).reduce((sum, bond) => sum + bond.order, 0);
  }

  addAnnotation(fields) {
    const annotation = Object.assign({ id: this.nextAnnotationId++ }, fields);
    this.annotations.push(annotation);
    return annotation;
  }

  getAnnotation(id) {
    return this.annotations.find((annotation) => annotation.id === id) || null;
  }

  removeAnnotation(id) {
    const index = this.annotations.findIndex((annotation) => annotation.id === id);
    if (index === -1) {
      return false;
    }
    this.annotations.splice(index, 1);
    return true;
  }

  isEmpty() {
    return this.atoms.length === 0 && this.annotations.length === 0;
  }

  clear() {
    this.atoms = [];
    this.bonds = [];
    this.nextAtomId = 1;
    this.nextBondId = 1;
    this.annotations = [];
    this.nextAnnotationId = 1;
  }
}
