import { ClientId, Difficulty, SaveState } from "../types";

const KEY = "smena_save_v1";

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSaveState(parsed)) {
      clearSave();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isSaveState(value: unknown): value is SaveState {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<SaveState>;
  const difficulties: Difficulty[] = ["trainee", "shift", "peak"];
  const ids: ClientId[] = ["c1", "c2", "c3", "c4", "c5", "c6", "c7"];
  const kpi = s.kpi;
  if (!difficulties.includes(s.difficulty as Difficulty)) return false;
  if (!Number.isInteger(s.caseIndex) || (s.caseIndex ?? -1) < 0 || (s.caseIndex ?? 8) > ids.length) return false;
  if (!Array.isArray(s.queueOrder) || s.queueOrder.length !== ids.length || !s.queueOrder.every((id) => ids.includes(id))) return false;
  if (!kpi || typeof kpi !== "object") return false;
  if (!["csatSum", "csatCount", "ahtSum", "ahtCount", "fcrResolved", "fcrTotal", "compliance"].every((key) => typeof kpi[key as keyof typeof kpi] === "number")) return false;
  if (!s.cases || !ids.every((id) => ["pending", "active", "done", "escalated"].includes(s.cases?.[id] ?? ""))) return false;
  if (!s.temperature || !ids.every((id) => typeof s.temperature?.[id] === "number")) return false;
  return typeof s.nickname === "string" && Array.isArray(s.openedKnowledge) && Array.isArray(s.notes);
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
