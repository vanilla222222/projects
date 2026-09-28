"use strict";

  /* ============================================================
     LOCAL PERSISTENCE — small, scoped localStorage helpers.
     Only UI collapse state and the stamp library/folders are auto-saved;
     everything else (rules, board, graph history) stays manual export/import.
     ============================================================ */

  const LS_COLLAPSE_KEY = "automaton:collapse:v1";
  const LS_STAMPS_KEY = "automaton:stamps:v1";

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Storage unavailable (quota, private mode) — collapse/stamps simply won't persist.
    }
  }

  function loadCollapseState() {
    return readJSON(LS_COLLAPSE_KEY) || {};
  }
  function saveCollapseState(collapseState) {
    writeJSON(LS_COLLAPSE_KEY, collapseState);
  }

  function saveStampsToStorage() {
    writeJSON(LS_STAMPS_KEY, { version: 2, stamps: stampLibrary, folders: stampFolders });
  }
  function loadStampsFromStorage() {
    const data = readJSON(LS_STAMPS_KEY);
    if (!data) return;
    if (Array.isArray(data.stamps)) stampLibrary = data.stamps;
    if (Array.isArray(data.folders)) stampFolders = data.folders;
    stampIdCounter = stampLibrary.reduce((m, s) => Math.max(m, (s.id || 0) + 1), 1);
    stampFolderIdCounter = stampFolders.reduce((m, f) => Math.max(m, (f.id || 0) + 1), 1);
  }

