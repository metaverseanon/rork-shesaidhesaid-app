import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";

const SCAN_COUNT_KEY = "daily_scan_count";
const SCAN_DATE_KEY = "daily_scan_date";
const FREE_DAILY_LIMIT = 3;
const ENTITLEMENT_ID = "premium";

function getRCApiKey(): string {
  if (__DEV__ || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "";
  }
  return (
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
    }) ?? ""
  );
}

let rcConfigured = false;
const apiKey = getRCApiKey();
if (apiKey) {
  try {
    Purchases.configure({ apiKey });
    if (__DEV__) {
      void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    rcConfigured = true;
    console.log("RevenueCat configured with key:", apiKey.substring(0, 10) + "...");
  } catch (e) {
    console.error("Failed to configure RevenueCat:", e);
  }
} else {
  console.warn("RevenueCat API key not found");
}

export const [PremiumProvider, usePremium] = createContextHook(() => {
  const [dailyScans, setDailyScans] = useState(0);
  const queryClient = useQueryClient();

  const customerInfoQuery = useQuery<CustomerInfo | null>({
    queryKey: ["rc_customer_info"],
    queryFn: async () => {
      if (!rcConfigured) return null;
      try {
        const info = await Purchases.getCustomerInfo();
        console.log("RC customer info fetched:", JSON.stringify(info.entitlements.active));
        return info;
      } catch (e) {
        console.error("Failed to get customer info:", e);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const offeringsQuery = useQuery<PurchasesOffering | null>({
    queryKey: ["rc_offerings"],
    queryFn: async () => {
      if (!rcConfigured) return null;
      try {
        const offerings = await Purchases.getOfferings();
        console.log("RC offerings fetched:", JSON.stringify(offerings.current?.availablePackages.map(p => p.identifier)));
        return offerings.current ?? null;
      } catch (e) {
        console.error("Failed to get offerings:", e);
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log("Purchasing package:", pkg.identifier);
      const result = await Purchases.purchasePackage(pkg);
      console.log("Purchase result:", JSON.stringify(result.customerInfo.entitlements.active));
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rc_customer_info"] });
    },
    onError: (error: any) => {
      if (error.userCancelled) {
        console.log("User cancelled purchase");
      } else {
        console.error("Purchase error:", error);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log("Restoring purchases...");
      const info = await Purchases.restorePurchases();
      console.log("Restore result:", JSON.stringify(info.entitlements.active));
      return info;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rc_customer_info"] });
    },
    onError: (error) => {
      console.error("Restore error:", error);
    },
  });

  const isPremium = useMemo(() => {
    const info = customerInfoQuery.data;
    if (!info) return false;
    return typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  }, [customerInfoQuery.data]);

  useEffect(() => {
    void loadDailyScans();
  }, []);

  useEffect(() => {
    if (!rcConfigured) return;
    const listener = (info: CustomerInfo) => {
      console.log("RC customer info updated:", JSON.stringify(info.entitlements.active));
      queryClient.setQueryData(["rc_customer_info"], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const loadDailyScans = async () => {
    try {
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
      console.error("Failed to load daily scans:", error);
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

  const currentOffering = offeringsQuery.data;
  const monthlyPackage = currentOffering?.monthly ?? null;
  const annualPackage = currentOffering?.annual ?? null;

  const purchasePackage = useCallback(
    (pkg: PurchasesPackage) => {
      purchaseMutation.mutate(pkg);
    },
    [purchaseMutation]
  );

  const restorePurchases = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  return useMemo(
    () => ({
      isPremium,
      canScan,
      scansRemaining,
      dailyScans,
      freeDailyLimit: FREE_DAILY_LIMIT,
      incrementScanCount,
      isLoading: customerInfoQuery.isLoading,
      currentOffering,
      monthlyPackage,
      annualPackage,
      purchasePackage,
      restorePurchases,
      isPurchasing: purchaseMutation.isPending,
      isRestoring: restoreMutation.isPending,
      purchaseError: purchaseMutation.error,
      restoreError: restoreMutation.error,
      rcConfigured,
    }),
    [
      isPremium,
      canScan,
      scansRemaining,
      dailyScans,
      incrementScanCount,
      customerInfoQuery.isLoading,
      currentOffering,
      monthlyPackage,
      annualPackage,
      purchasePackage,
      restorePurchases,
      purchaseMutation.isPending,
      restoreMutation.isPending,
      purchaseMutation.error,
      restoreMutation.error,
    ]
  );
});
