import { useState, useCallback } from 'react';

const STORAGE_KEY = 'vpt-history';
const MAX_ITEMS = 50;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function useHistory() {
  const [items, setItems] = useState(loadHistory);

  const addItem = useCallback((entry) => {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fileName: entry.fileName,
      thumbnail: entry.thumbnail,   // base64 data URL of first frame
      promptPreview: entry.prompt.slice(0, 200),
      fullPrompt: entry.prompt,
      createdAt: Date.now(),
    };

    setItems((prev) => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // quota 满了，只保留最近 5 条
        try {
          const trimmed = next.slice(0, 5);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch {}
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { items, addItem, removeItem, clearHistory };
}
