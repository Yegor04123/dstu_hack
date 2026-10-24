import { SaveState } from "../types";

const KEY = "smena_save_v1";

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveState;
  } catch {
    return null;
  }
}

export function saveState(state: SaveState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
