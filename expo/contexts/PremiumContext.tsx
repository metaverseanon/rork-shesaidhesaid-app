import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

const PREMIUM_KEY = "premium_status";
const SCAN_COUNT_KEY = "daily_scan_count";
const SCAN_DATE_KEY = "daily_scan_date";
const FREE_DAILY_LIMIT = 3;

export const [PremiumProvider, usePremium] = createContextHook(() => {
  const [isPremium, setIsPremium] = useState(false);
  const [dailyScans, setDailyScans] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadState();
  }, []);

  const loadState = async () => {
    try {
      const premiumStatus = await AsyncStorage.getItem(PREMIUM_KEY);
      if (premiumStatus === "true") {
        setIsPremium(true);
      }

      const savedDate = await AsyncStorage.getItem(SCAN_DATE_KEY);
      const today = new Date().toDateString();

      if (savedDate === today) {
        const count = await AsyncStorage.getItem(SCAN_COUNT_KEY);
        setDailyScans(count ? parseInt(count, 10) : 0);
      } else {
        await AsyncStorage.setItem(SCAN_DATE_KEY, today);
        await AsyncStorage.setItem(SCAN_COUNT_KEY, "0");
        setDailyScans(0);
      }
    } catch (error) {
      console.error("Failed to load premium state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canScan = useMemo(() => {
    if (isPremium) return true;
    return dailyScans < FREE_DAILY_LIMIT;
  }, [isPremium, dailyScans]);

  const scansRemaining = useMemo(() => {
    if (isPremium) return -1;
    return Math.max(0, FREE_DAILY_LIMIT - dailyScans);
  }, [isPremium, dailyScans]);

  const incrementScanCount = useCallback(async () => {
    try {
      const newCount = dailyScans + 1;
      setDailyScans(newCount);
      const today = new Date().toDateString();
      await AsyncStorage.setItem(SCAN_DATE_KEY, today);
      await AsyncStorage.setItem(SCAN_COUNT_KEY, newCount.toString());
      console.log("Scan count incremented to:", newCount);
    } catch (error) {
      console.error("Failed to increment scan count:", error);
    }
  }, [dailyScans]);

  const activatePremium = useCallback(async () => {
    try {
      setIsPremium(true);
      await AsyncStorage.setItem(PREMIUM_KEY, "true");
      console.log("Premium activated");
    } catch (error) {
      console.error("Failed to activate premium:", error);
    }
  }, []);

  const deactivatePremium = useCallback(async () => {
    try {
      setIsPremium(false);
      await AsyncStorage.setItem(PREMIUM_KEY, "false");
      console.log("Premium deactivated");
    } catch (error) {
      console.error("Failed to deactivate premium:", error);
    }
  }, []);

  return useMemo(() => ({
    isPremium,
    canScan,
    scansRemaining,
    dailyScans,
    freeDailyLimit: FREE_DAILY_LIMIT,
    incrementScanCount,
    activatePremium,
    deactivatePremium,
    isLoading,
  }), [isPremium, canScan, scansRemaining, dailyScans, incrementScanCount, activatePremium, deactivatePremium, isLoading]);
});
