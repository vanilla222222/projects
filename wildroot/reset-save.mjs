// setItem replaces only this game's key atomically; other games' saves are untouched.
export function persistReset(storage,key,fresh){const serialized=JSON.stringify(fresh);storage.setItem(key,serialized);return fresh;}
