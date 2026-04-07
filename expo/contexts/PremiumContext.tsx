import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform, Alert } from "react-native";
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
    const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "";
    if (testKey) {
      console.log(`[RC] Using TEST key for ${Platform.OS} (dev/web)`);
      return testKey;
    }
  }
  const key = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  }) ?? "";
  console.log(`[RC] Using ${Platform.OS} API key, prefix: ${key.substring(0, 5)}...`);
  return key;
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
    console.log("[RC] RevenueCat configured. Platform:", Platform.OS, "Key prefix:", apiKey.substring(0, 8) + "...");
  } catch (e) {
    console.error("[RC] Failed to configure RevenueCat:", e);
  }
} else {
  console.warn("[RC] No API key available for platform:", Platform.OS);
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
        console.log("[RC] Customer info fetched. Active entitlements:", Object.keys(info.entitlements.active));
        return info;
      } catch (e) {
        console.error("[RC] Failed to get customer info:", e);
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
        console.log("[RC] Offerings fetched. Current:", offerings.current?.identifier);
        console.log("[RC] Available packages:", offerings.current?.availablePackages.map(p => `${p.identifier} (${p.product.identifier}: ${p.product.priceString})`));
        return offerings.current ?? null;
      } catch (e) {
        console.error("[RC] Failed to get offerings:", e);
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      if (!rcConfigured) {
        throw new Error("Purchases are not available. Please restart the app.");
      }
      console.log("[RC] Starting purchase for:", pkg.identifier, "Product:", pkg.product.identifier, "Price:", pkg.product.priceString);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      console.log("[RC] Purchase completed. Has premium:", hasEntitlement);
      console.log("[RC] Active entitlements:", Object.keys(customerInfo.entitlements.active));
      if (!hasEntitlement) {
        throw new Error("Purchase completed but premium was not granted. Please contact support.");
      }
      return customerInfo;
    },
    onSuccess: (customerInfo) => {
      console.log("[RC] Purchase success, updating customer info");
      queryClient.setQueryData(["rc_customer_info"], customerInfo);
    },
    onError: (error: any) => {
      if (error.userCancelled) {
        console.log("[RC] User cancelled purchase");
        return;
      }
      console.error("[RC] Purchase error:", error?.message ?? error, "Code:", error?.code);
      Alert.alert(
        "Purchase Failed",
        error?.message ?? "Something went wrong. Please try again."
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!rcConfigured) {
        throw new Error("Purchases are not available. Please restart the app.");
      }
      console.log("[RC] Restoring purchases...");
      const info = await Purchases.restorePurchases();
      console.log("[RC] Restore result. Active entitlements:", Object.keys(info.entitlements.active));
      return info;
    },
    onSuccess: (data) => {
      const hasEntitlement = typeof data.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      console.log("[RC] Restore success. Has premium:", hasEntitlement);
      queryClient.setQueryData(["rc_customer_info"], data);
      if (hasEntitlement) {
        Alert.alert("Restored", "Your premium subscription has been restored.");
      } else {
        Alert.alert("No Purchases Found", "No previous purchases were found for this account.");
      }
    },
    onError: (error: any) => {
      console.error("[RC] Restore error:", error?.message ?? error);
      Alert.alert("Restore Failed", error?.message ?? "Could not restore purchases. Please try again.");
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
      console.log("[RC] Customer info updated. Active entitlements:", Object.keys(info.entitlements.active));
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
      if (!rcConfigured) {
        Alert.alert("Error", "Purchases are not available on this device. Please try on your mobile device.");
        return;
      }
      if (!pkg.product?.identifier) {
        Alert.alert("Error", "Invalid product. Please try again later.");
        return;
      }
      console.log("[RC] User initiated purchase for:", pkg.product.identifier, "Price:", pkg.product.priceString);
      purchaseMutation.mutate(pkg);
    },
    [purchaseMutation]
  );

  const restorePurchases = useCallback(() => {
    if (!rcConfigured) {
      Alert.alert("Error", "Purchases are not available on this device.");
      return;
    }
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
