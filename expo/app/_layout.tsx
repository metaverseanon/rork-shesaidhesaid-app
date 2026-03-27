// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Onboarding from "@/components/Onboarding";
import { ScoreboardProvider } from "@/contexts/ScoreboardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { HistoryProvider } from "@/contexts/HistoryContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="results" />
      <Stack.Screen name="history" />
      <Stack.Screen name="premium" options={{ presentation: "modal" }} />
      <Stack.Screen name="insights" />
    </Stack>
  );
}

const ONBOARDING_KEY = "onboarding_completed";

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    void SplashScreen.hideAsync();

    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setShowOnboarding(value !== "true");
      console.log("Onboarding completed:", value === "true");
    }).catch(() => {
      setShowOnboarding(true);
    });
    
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    void AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
    console.log("Onboarding completed, saving state");
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <LinearGradient
          colors={["#0a0118", "#1a0f2e", "#2d1b4e"]}
          style={styles.splashGradient}
        >
          <Image
            source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ck2usccc253nb3nzwom89" }}
            style={styles.splashLogo}
            contentFit="contain"
          />
        </LinearGradient>
      </View>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <PremiumProvider>
            <NotificationProvider>
              <ScoreboardProvider>
                <HistoryProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </HistoryProvider>
              </ScoreboardProvider>
            </NotificationProvider>
          </PremiumProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
  },
  splashGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogo: {
    width: 269,
    height: 269,
  },
});
