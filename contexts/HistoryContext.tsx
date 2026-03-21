import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import type { AnalysisResult, HistoryEntry, AnalysisMode } from "@/types/analysis";

const HISTORY_KEY = "argument_history";
const MAX_HISTORY = 50;

export const [HistoryProvider, useHistory] = createContextHook(() => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = useCallback(async (analysis: AnalysisResult, savageMode: boolean, analysisMode?: AnalysisMode) => {
    try {
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        analysis,
        savageMode,
        analysisMode,
      };
      const updated = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      console.log("History entry added:", entry.id);
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }, [history]);

  const clearHistory = useCallback(async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(HISTORY_KEY);
      console.log("History cleared");
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }, []);

  return useMemo(() => ({ history, addEntry, clearHistory, isLoading }), [history, addEntry, clearHistory, isLoading]);
});
