import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

export interface ScoreEntry {
  name: string;
  wins: number;
}

const SCOREBOARD_KEY = "scoreboard_data";
const COLOR_PREF_KEY = "color_preference";

export const [ScoreboardProvider, useScoreboard] = createContextHook(() => {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [colorSwapped, setColorSwapped] = useState(false);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const stored = await AsyncStorage.getItem(SCOREBOARD_KEY);
      if (stored) {
        setScores(JSON.parse(stored));
      }
      const colorPref = await AsyncStorage.getItem(COLOR_PREF_KEY);
      if (colorPref === "swapped") {
        setColorSwapped(true);
      }
    } catch (error) {
      console.error("Failed to load scoreboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addWin = async (winnerName: string) => {
    try {
      const existingEntry = scores.find(
        (entry) => entry.name.toLowerCase() === winnerName.toLowerCase()
      );

      let updatedScores: ScoreEntry[];

      if (existingEntry) {
        updatedScores = scores.map((entry) =>
          entry.name.toLowerCase() === winnerName.toLowerCase()
            ? { ...entry, wins: entry.wins + 1 }
            : entry
        );
      } else {
        updatedScores = [...scores, { name: winnerName, wins: 1 }];
      }

      updatedScores.sort((a, b) => b.wins - a.wins);

      setScores(updatedScores);
      await AsyncStorage.setItem(SCOREBOARD_KEY, JSON.stringify(updatedScores));
    } catch (error) {
      console.error("Failed to save win:", error);
    }
  };

  const clearScoreboard = async () => {
    try {
      setScores([]);
      await AsyncStorage.removeItem(SCOREBOARD_KEY);
    } catch (error) {
      console.error("Failed to clear scoreboard:", error);
    }
  };

  const renamePerson = async (oldName: string, newName: string) => {
    try {
      const trimmed = newName.trim();
      if (!trimmed) return;

      const existingEntry = scores.find(
        (entry) => entry.name.toLowerCase() === trimmed.toLowerCase() && entry.name.toLowerCase() !== oldName.toLowerCase()
      );

      let updatedScores: ScoreEntry[];

      if (existingEntry) {
        updatedScores = scores
          .map((entry) => {
            if (entry.name.toLowerCase() === trimmed.toLowerCase()) {
              const oldEntry = scores.find((e) => e.name.toLowerCase() === oldName.toLowerCase());
              return { ...entry, wins: entry.wins + (oldEntry?.wins ?? 0) };
            }
            return entry;
          })
          .filter((entry) => entry.name.toLowerCase() !== oldName.toLowerCase());
      } else {
        updatedScores = scores.map((entry) =>
          entry.name.toLowerCase() === oldName.toLowerCase()
            ? { ...entry, name: trimmed }
            : entry
        );
      }

      updatedScores.sort((a, b) => b.wins - a.wins);
      setScores(updatedScores);
      await AsyncStorage.setItem(SCOREBOARD_KEY, JSON.stringify(updatedScores));
      console.log(`Renamed "${oldName}" to "${trimmed}"`);
    } catch (error) {
      console.error("Failed to rename person:", error);
    }
  };

  const addPerson = async (name: string) => {
    try {
      const trimmed = name.trim();
      if (!trimmed) return;
      const exists = scores.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) return;
      const updatedScores = [...scores, { name: trimmed, wins: 0 }];
      updatedScores.sort((a, b) => b.wins - a.wins);
      setScores(updatedScores);
      await AsyncStorage.setItem(SCOREBOARD_KEY, JSON.stringify(updatedScores));
      console.log(`Added person "${trimmed}"`);
    } catch (error) {
      console.error("Failed to add person:", error);
    }
  };

  const toggleColors = async () => {
    try {
      const newVal = !colorSwapped;
      setColorSwapped(newVal);
      await AsyncStorage.setItem(COLOR_PREF_KEY, newVal ? "swapped" : "default");
      console.log(`Color preference: ${newVal ? "blue/pink" : "pink/blue"}`);
    } catch (error) {
      console.error("Failed to save color preference:", error);
    }
  };

  const player1Color = colorSwapped ? "#5bc0eb" : "#ff69b4";
  const player2Color = colorSwapped ? "#ff69b4" : "#5bc0eb";

  return { scores, addWin, clearScoreboard, renamePerson, addPerson, isLoading, colorSwapped, toggleColors, player1Color, player2Color };
});
