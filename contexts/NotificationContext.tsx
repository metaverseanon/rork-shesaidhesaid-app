import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { trpcClient } from "@/lib/trpc";

const PUSH_TOKEN_KEY = "expo_push_token";
const NOTIFICATION_PERMISSION_ASKED_KEY = "notification_permission_asked";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("Push notifications not supported on web");
    return null;
  }

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_PROJECT_ID;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    console.log("Expo push token:", tokenData.data);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#a78bfa",
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    void initNotifications();

    const notifSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification.request.content.title);
    });
    notificationListener.current = notifSub;

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped, data:", data);
    });
    responseListener.current = responseSub;

    return () => {
      notifSub.remove();
      responseSub.remove();
    };
  }, []);

  const initNotifications = async () => {
    if (Platform.OS === "web") return;

    const asked = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_ASKED_KEY);
    
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      setHasPermission(true);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_ASKED_KEY, "true");

      try {
        await trpcClient.notifications.registerToken.mutate({ token });
        console.log("Push token registered with backend");
      } catch (error) {
        console.error("Failed to register token with backend:", error);
      }
    } else if (!asked) {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_ASKED_KEY, "true");
    }
  };

  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") return;

    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      setHasPermission(true);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      try {
        await trpcClient.notifications.registerToken.mutate({ token });
        console.log("Push token registered with backend");
      } catch (error) {
        console.error("Failed to register token with backend:", error);
      }
    } else {
      Alert.alert(
        "Notifications Disabled",
        "Enable notifications in your device settings to receive updates.",
        [{ text: "OK" }]
      );
    }
  }, []);

  return useMemo(() => ({
    expoPushToken,
    hasPermission,
    requestPermission,
  }), [expoPushToken, hasPermission, requestPermission]);
});
