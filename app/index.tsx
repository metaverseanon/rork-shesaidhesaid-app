import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Upload, Trophy, Globe, Medal, Pencil } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult } from "@/types/analysis";
import { useScoreboard } from "@/contexts/ScoreboardContext";
import { useLanguage } from "@/contexts/LanguageContext";

const validationSchema = z.object({
  isValidChat: z.boolean().describe("Whether the image is a screenshot of a conversation/chat between people"),
  reason: z.string().describe("Brief explanation of why this is or isn't a chat screenshot"),
});

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
  const { scores, renamePerson } = useScoreboard();
  const { t, language, setLanguage } = useLanguage();
  const [editNameModal, setEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [newNameInput, setNewNameInput] = useState("");

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

      console.log("Validating if image is a chat screenshot...");
      const validation = await generateObject({
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
                text: "Is this image a screenshot of a text conversation or chat between people? It should contain messages exchanged between at least two people. Return true only if it's clearly a conversation/chat screenshot (from messaging apps, text messages, social media DMs, etc.).",
              },
            ],
          },
        ],
        schema: validationSchema,
      });

      console.log("Validation result:", validation);

      if (!validation.isValidChat) {
        throw new Error(`NOT_A_CHAT: ${validation.reason}`);
      }

      const imageHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64Image
      );
      console.log("Image hash:", imageHash);

      const cacheKey = `analysis_${imageHash}`;
      const cachedResult = await AsyncStorage.getItem(cacheKey);

      if (cachedResult) {
        try {
          console.log("Returning cached analysis result");
          return JSON.parse(cachedResult) as AnalysisResult;
        } catch (parseError) {
          console.log("Cached result is corrupted, clearing cache and reanalyzing", parseError);
          await AsyncStorage.removeItem(cacheKey);
        }
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
                text: "Analyze this argument/conversation screenshot. Determine who won the argument based on logical consistency, emotional stability, and communication effectiveness. Identify red flags, toxicity levels, and argument patterns. Be humorous but fair in your analysis.\n\nIMPORTANT for naming the people:\n- The person whose messages appear on the RIGHT side (typically colored/blue/green bubbles) should be called \"You\"\n- The person whose messages appear on the LEFT side (typically grey/white bubbles) is the other person\n- If you can see a contact name or profile name at the top of the chat, use that for the other person\n- If no name is visible, give the other person a funny descriptive nickname based on their personality in the conversation (e.g. \"Drama Queen\", \"Captain Excuses\", \"The Deflector\", \"Mr. Always Right\", etc.)\n- Use these names consistently for winner, faultPerson, and all references",
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
        pathname: "/results" as any,
        params: {
          data: JSON.stringify(data),
          image: selectedImage,
        },
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.startsWith("NOT_A_CHAT:")) {
        const reason = errorMessage.replace("NOT_A_CHAT: ", "");
        Alert.alert(
          t('invalidImage'),
          `${t('pleaseUploadChat')}\n\n${reason}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          t('error'),
          t('failedToAnalyze'),
          [{ text: "OK" }]
        );
      }
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
      aspect: [3, 4],
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

              {scores.length >= 1 && (() => {
                const player1 = scores[0];
                const player2 = scores.length >= 2 ? scores[1] : null;
                const total = player1.wins + (player2?.wins ?? 0);
                const player1Ratio = player2 ? (total > 0 ? player1.wins / total : 0.5) : 1;
                return (
                  <View style={styles.scoreboardCard}>
                    <Text style={styles.scoreboardLabel}>{t('scoreboard')}</Text>
                    <View style={styles.scoreboardDivider} />
                    <View style={styles.vsContainer}>
                      <View style={styles.playerSide}>
                        <TouchableOpacity onPress={() => { setEditingName(player1.name); setNewNameInput(player1.name); setEditNameModal(true); }} activeOpacity={0.7}>
                          <View style={styles.editableNameRow}>
                            <Text style={styles.player1Name} numberOfLines={1}>{player1.name}</Text>
                            <Pencil color="#ff69b4" size={12} />
                          </View>
                        </TouchableOpacity>
                        <Text style={styles.player1Score}>{player1.wins}</Text>
                        <Text style={styles.player1WinsLabel}>{t('wins').toUpperCase()}</Text>
                      </View>
                      {player2 ? (
                        <>
                          <Text style={styles.vsText}>VS</Text>
                          <View style={styles.playerSide}>
                            <TouchableOpacity onPress={() => { setEditingName(player2.name); setNewNameInput(player2.name); setEditNameModal(true); }} activeOpacity={0.7}>
                              <View style={styles.editableNameRow}>
                                <Text style={styles.player2Name} numberOfLines={1}>{player2.name}</Text>
                                <Pencil color="#fbbf24" size={12} />
                              </View>
                            </TouchableOpacity>
                            <Text style={styles.player2Score}>{player2.wins}</Text>
                            <Text style={styles.player2WinsLabel}>{t('wins').toUpperCase()}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.vsText}>VS</Text>
                          <View style={styles.playerSide}>
                            <Text style={styles.nextChallengerName} numberOfLines={1}>Next Challenger</Text>
                            <Text style={styles.player2Score}>0</Text>
                            <Text style={styles.player2WinsLabel}>{t('wins').toUpperCase()}</Text>
                          </View>
                        </>
                      )}
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { flex: player1Ratio }]} />
                      <View style={[styles.progressBarRight, { flex: 1 - player1Ratio }]} />
                    </View>

                    {scores.length > 2 && (
                      <View style={styles.otherPlayersSection}>
                        <View style={styles.otherPlayersDivider} />
                        <Text style={styles.otherPlayersLabel}>{t('alsoCompeting')}</Text>
                        {scores.slice(2).map((player, index) => {
                          const rank = index + 3;
                          const medalColor = rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.35)';
                          return (
                            <View key={player.name} style={styles.otherPlayerRow}>
                              <View style={styles.otherPlayerRank}>
                                {rank === 3 ? (
                                  <Medal color={medalColor} size={16} />
                                ) : (
                                  <Text style={styles.otherPlayerRankText}>#{rank}</Text>
                                )}
                              </View>
                              <TouchableOpacity onPress={() => { setEditingName(player.name); setNewNameInput(player.name); setEditNameModal(true); }} activeOpacity={0.7} style={{ flex: 1 }}>
                                <View style={styles.editableNameRow}>
                                  <Text style={styles.otherPlayerName} numberOfLines={1}>{player.name}</Text>
                                  <Pencil color="rgba(255,255,255,0.35)" size={10} />
                                </View>
                              </TouchableOpacity>
                              <View style={styles.otherPlayerWinsBadge}>
                                <Text style={styles.otherPlayerWinsText}>{player.wins}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })()}

              <Modal
                visible={editNameModal}
                transparent
                animationType="fade"
                onRequestClose={() => setEditNameModal(false)}
              >
                <View style={styles.editNameModalOverlay}>
                  <View style={styles.editNameModalContent}>
                    <Text style={styles.editNameModalTitle}>{t('editName')}</Text>
                    <TextInput
                      style={styles.editNameInput}
                      value={newNameInput}
                      onChangeText={setNewNameInput}
                      placeholder={t('enterNewName')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoFocus
                      maxLength={30}
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={[styles.editNameSaveButton, !newNameInput.trim() && { opacity: 0.4 }]}
                      onPress={() => {
                        if (newNameInput.trim()) {
                          renamePerson(editingName, newNameInput.trim());
                          setEditNameModal(false);
                        }
                      }}
                      activeOpacity={0.8}
                      disabled={!newNameInput.trim()}
                    >
                      <Text style={styles.editNameSaveText}>{t('save')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editNameCancelButton}
                      onPress={() => setEditNameModal(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editNameCancelText}>{t('cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>

            {analysisMutation.isPending ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#a78bfa" />
                <Text style={styles.loadingText}>{t('analyzingArgument')}</Text>
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "rgba(20, 14, 40, 0.85)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.45)",
    padding: 20,
    width: "100%",
  },
  scoreboardLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "rgba(255, 255, 255, 0.45)",
    letterSpacing: 2,
    marginBottom: 10,
  },
  scoreboardDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 20,
  },
  vsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 22,
  },
  playerSide: {
    flex: 1,
    alignItems: "center" as const,
  },
  player1Name: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#ff69b4",
    marginBottom: 4,
    flexShrink: 1,
  },
  player1Score: {
    fontSize: 52,
    fontWeight: "800" as const,
    color: "#ff69b4",
    lineHeight: 58,
  },
  player1WinsLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#ff69b4",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  player2Name: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fbbf24",
    marginBottom: 4,
    flexShrink: 1,
  },
  nextChallengerName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#5bc0eb",
    marginBottom: 4,
    flexShrink: 1,
  },
  player2Score: {
    fontSize: 52,
    fontWeight: "800" as const,
    color: "#5bc0eb",
    lineHeight: 58,
  },
  player2WinsLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#5bc0eb",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  vsText: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#7c3aed",
    marginHorizontal: 12,
  },
  progressBarTrack: {
    flexDirection: "row" as const,
    height: 14,
    borderRadius: 7,
    overflow: "hidden" as const,
    backgroundColor: "rgba(91, 192, 235, 0.3)",
  },
  progressBarFill: {
    backgroundColor: "#ff69b4",
    borderRadius: 7,
  },
  progressBarRight: {
    backgroundColor: "#5bc0eb",
    borderRadius: 7,
  },
  otherPlayersSection: {
    marginTop: 18,
  },
  otherPlayersDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  otherPlayersLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255, 255, 255, 0.35)",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  otherPlayerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  otherPlayerRank: {
    width: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  otherPlayerRankText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.35)",
  },
  otherPlayerName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.75)",
    marginLeft: 6,
  },
  otherPlayerWinsBadge: {
    backgroundColor: "rgba(124, 58, 237, 0.25)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: "center" as const,
  },
  otherPlayerWinsText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#a78bfa",
  },
  editableNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    maxWidth: "100%",
  },
  editNameModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 24,
  },
  editNameModalContent: {
    backgroundColor: "#1a0f2e",
    borderRadius: 20,
    padding: 24,
    width: "100%" as const,
    maxWidth: 340,
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  editNameModalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center" as const,
  },
  editNameInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    marginBottom: 20,
  },
  editNameSaveButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  editNameSaveText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  editNameCancelButton: {
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.25)",
  },
  editNameCancelText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#a78bfa",
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
