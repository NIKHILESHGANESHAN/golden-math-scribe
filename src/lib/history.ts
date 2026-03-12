export interface HistoryEntry {
  type: "search" | "test";
  query: string;
  answer: string;
  timestamp: number;
}

const KEY = "__gr_history";

const getStore = (): HistoryEntry[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const addToHistory = (entry: Omit<HistoryEntry, "timestamp">) => {
  const store = getStore();
  store.unshift({ ...entry, timestamp: Date.now() });
  sessionStorage.setItem(KEY, JSON.stringify(store.slice(0, 50)));
};

export const getHistory = (): HistoryEntry[] => getStore();

export const clearHistory = () => sessionStorage.removeItem(KEY);
