// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { ScoreboardProvider } from "@/contexts/ScoreboardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { HistoryProvider } from "@/contexts/HistoryContext";
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
    </Stack>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    void SplashScreen.hideAsync();
    
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
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

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ScoreboardProvider>
            <HistoryProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </HistoryProvider>
          </ScoreboardProvider>
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
