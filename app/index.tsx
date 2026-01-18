import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Upload, Trophy, Globe } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult } from "@/types/analysis";
import { useScoreboard } from "@/contexts/ScoreboardContext";
import { useLanguage } from "@/contexts/LanguageContext";

const analysisSchema = z.object({
  winner: z.string().describe("The name of the person who won the argument"),
  winnerReason: z
    .string()
    .describe("Brief reason why this person won (logical consistency, emotional stability, etc)"),
  yourCredibility: z
    .number()
    .min(0)
    .max(100)
    .describe("Credibility score of the first person (0-100)"),
  partnerCredibility: z
    .number()
    .min(0)
    .max(100)
    .describe("Credibility score of the second person (0-100)"),
  faultPerson: z.string().describe("The person who is at fault in this argument"),
  toxicityLevel: z
    .number()
    .min(0)
    .max(100)
    .describe("Toxicity level of the conversation (0-100)"),
  toxicityLabel: z
    .enum(["Low", "Medium", "High"])
    .describe("Label for toxicity level"),
  argumentPattern: z
    .string()
    .describe("Main argument pattern detected (e.g., Gaslighting, Stonewalling, etc)"),
  redFlags: z
    .array(z.string())
    .describe("List of red flags detected (e.g., Invalidating Feelings, Guilt-tripping, etc)"),
  exhibits: z
    .array(
      z.object({
        title: z.string().describe("Short title for the exhibit"),
        description: z.string().describe("Description of what was observed"),
      })
    )
    .describe("Key evidence exhibits from the conversation"),
});

export default function HomeScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const { scores } = useScoreboard();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    const consent = await AsyncStorage.getItem("user_consent");
    if (!consent) {
      setShowConsentModal(true);
    }
  };

  const handleAcceptConsent = async () => {
    await AsyncStorage.setItem("user_consent", "true");
    setShowConsentModal(false);
  };

  const analysisMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      console.log("Starting analysis for image:", imageUri);

      let base64Image: string;

      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
      }

      console.log("Image converted to base64");

      const imageHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64Image
      );
      console.log("Image hash:", imageHash);

      const cacheKey = `analysis_${imageHash}`;
      const cachedResult = await AsyncStorage.getItem(cacheKey);

      if (cachedResult) {
        console.log("Returning cached analysis result");
        return JSON.parse(cachedResult) as AnalysisResult;
      }

      console.log("No cache found, analyzing image...");
      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: base64Image,
              },
              {
                type: "text",
                text: "Analyze this argument/conversation screenshot. Determine who won the argument based on logical consistency, emotional stability, and communication effectiveness. Identify red flags, toxicity levels, and argument patterns. Be humorous but fair in your analysis. Extract the names from the conversation if visible.",
              },
            ],
          },
        ],
        schema: analysisSchema,
      });

      console.log("Analysis result:", result);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
      console.log("Analysis result cached");

      return result as AnalysisResult;
    },
    onSuccess: (data) => {
      router.push({
        pathname: "/results",
        params: {
          data: JSON.stringify(data),
          image: selectedImage,
        },
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      analysisMutation.mutate(uri);
    }
  };



  return (
    <View style={styles.container}>
      <Modal
        visible={showConsentModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('privacyNotice')}</Text>
            <Text style={styles.modalText}>
              {t('privacyIntro')}
            </Text>
            <View style={styles.consentList}>
              <Text style={styles.consentItem}>{t('consentItem1')}</Text>
              <Text style={styles.consentItem}>{t('consentItem2')}</Text>
              <Text style={styles.consentItem}>{t('consentItem3')}</Text>
            </View>
            <Text style={styles.modalFooter}>
              {t('privacyFooter')}
            </Text>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptConsent}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>{t('iUnderstandAccept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <LinearGradient
        colors={["#0a0118", "#1a0f2e", "#2d1b4e"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.languageToggle}
              onPress={() => setShowLanguageModal(true)}
              activeOpacity={0.7}
            >
              <Globe color="#a78bfa" size={20} />
            </TouchableOpacity>

            <Modal
              visible={showLanguageModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowLanguageModal(false)}
            >
              <TouchableOpacity 
                style={styles.languageModalOverlay}
                activeOpacity={1}
                onPress={() => setShowLanguageModal(false)}
              >
                <View style={styles.languageModalContent}>
                  <Text style={styles.languageModalTitle}>{t('language')}</Text>
                  
                  <TouchableOpacity
                    style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}
                    onPress={() => {
                      setLanguage('en');
                      setShowLanguageModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.languageOptionText, language === 'en' && styles.languageOptionTextActive]}>
                      {t('english')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.languageOption, language === 'es' && styles.languageOptionActive]}
                    onPress={() => {
                      setLanguage('es');
                      setShowLanguageModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.languageOptionText, language === 'es' && styles.languageOptionTextActive]}>
                      {t('spanish')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.languageOption, language === 'de' && styles.languageOptionActive]}
                    onPress={() => {
                      setLanguage('de');
                      setShowLanguageModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.languageOptionText, language === 'de' && styles.languageOptionTextActive]}>
                      {t('german')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ck2usccc253nb3nzwom89" }}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.appSubtitle}>{t('appSubtitle')}</Text>
              <Text style={styles.subtitle}>
                {t('subtitle')}
              </Text>
              <Text style={styles.disclaimer}>
                {t('disclaimer')}
              </Text>

              {scores.length > 0 && (
                <View style={styles.scoreboardCard}>
                  <View style={styles.scoreboardHeader}>
                    <Trophy color="#fbbf24" size={18} />
                    <Text style={styles.scoreboardTitle}>{t('scoreboard')}</Text>
                  </View>
                  <View style={styles.scoresList}>
                    {scores.slice(0, 3).map((entry, index) => (
                      <View key={index} style={styles.scoreRow}>
                        <View style={styles.scoreRank}>
                          <Text style={styles.scoreRankText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.scoreName}>{entry.name}</Text>
                        <Text style={styles.scoreWins}>{entry.wins} {entry.wins === 1 ? t('win') : t('wins')}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {analysisMutation.isPending && selectedImage ? (
              <View style={styles.analysisContainer}>
                <View style={styles.imagePreview}>
                  <Image source={{ uri: selectedImage }} style={styles.image} />
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#a78bfa" />
                    <Text style={styles.loadingText}>{t('analyzingArgument')}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.uploadSection}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <View style={styles.uploadButtonGradient}>
                    <Upload color="#ffffff" size={28} strokeWidth={2} />
                    <Text style={styles.uploadButtonText}>{t('chooseFromGallery')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {analysisMutation.isError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {t('failedToAnalyze')}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0118",
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 38,
  },
  header: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 21,
  },
  logoContainer: {
    width: 269,
    height: 269,
    marginBottom: 10,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#a78bfa",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    fontStyle: "italic",
  },
  uploadSection: {
    gap: 16,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#7c3aed",
  },
  uploadButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },

  analysisContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 0.75,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#a78bfa",
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "center",
  },
  scoreboardCard: {
    marginTop: 26,
    backgroundColor: "rgba(30, 20, 60, 0.6)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.4)",
    padding: 20,
    width: "100%",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  scoreboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 191, 36, 0.2)",
  },
  scoreboardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fbbf24",
    letterSpacing: 1.2,
  },
  scoresList: {
    gap: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scoreRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fbbf24",
  },
  scoreName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  scoreWins: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "rgba(255, 255, 255, 0.6)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#1a0f2e",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.3)",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 22,
    marginBottom: 16,
  },
  consentList: {
    gap: 12,
    marginBottom: 20,
    paddingLeft: 4,
  },
  consentItem: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    lineHeight: 20,
  },
  modalFooter: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 18,
    marginBottom: 24,
    textAlign: "center",
    fontStyle: "italic" as const,
  },
  acceptButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  languageToggle: {
    alignSelf: "flex-end" as const,
    padding: 10,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    marginTop: 8,
  },
  languageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 24,
  },
  languageModalContent: {
    backgroundColor: "#1a0f2e",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 300,
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.3)",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  languageModalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center" as const,
  },
  languageOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.2)",
  },
  languageOptionActive: {
    backgroundColor: "rgba(167, 139, 250, 0.25)",
    borderColor: "#a78bfa",
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center" as const,
  },
  languageOptionTextActive: {
    color: "#ffffff",
    fontWeight: "600" as const,
  },
});
