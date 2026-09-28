class History {
  constructor(graph, limit) {
    this.graph = graph;
    this.limit = limit || 200;
    this.states = [this.snapshot()];
    this.index = 0;
  }

  snapshot() {
    return JSON.stringify({
      atoms: this.graph.atoms,
      bonds: this.graph.bonds,
      nextAtomId: this.graph.nextAtomId,
      nextBondId: this.graph.nextBondId,
      annotations: this.graph.annotations,
      nextAnnotationId: this.graph.nextAnnotationId,
    });
  }

  commit() {
    const current = this.snapshot();
    if (current === this.states[this.index]) {
      return false;
    }
    this.states.length = this.index + 1;
    this.states.push(current);
    if (this.states.length > this.limit) {
      this.states.shift();
    }
    this.index = this.states.length - 1;
    return true;
  }

  restore() {
    const state = JSON.parse(this.states[this.index]);
    this.graph.atoms = state.atoms;
    this.graph.bonds = state.bonds;
    this.graph.nextAtomId = state.nextAtomId;
    this.graph.nextBondId = state.nextBondId;
    this.graph.annotations = state.annotations || [];
    this.graph.nextAnnotationId = state.nextAnnotationId || 1;
  }

  canUndo() {
    return this.index > 0;
  }

  canRedo() {
    return this.index < this.states.length - 1;
  }

  undo() {
    if (!this.canUndo()) {
      return false;
    }
    this.index--;
    this.restore();
    return true;
  }

  redo() {
    if (!this.canRedo()) {
      return false;
    }
    this.index++;
    this.restore();
    return true;
  }
}
