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
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Upload, Globe, Medal, Pencil, ArrowLeftRight, Trash2, Clock, Skull, Crown, BarChart3, Scale, Heart, Laugh, Smartphone, Lock } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnalysisResult, AnalysisMode } from "@/types/analysis";
import type { TranslationKey } from "@/constants/translations";
import { PREMIUM_MODES } from "@/types/analysis";
import { useScoreboard } from "@/contexts/ScoreboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHistory } from "@/contexts/HistoryContext";
import { usePremium } from "@/contexts/PremiumContext";

const ANALYSIS_MODE_KEY = "analysis_mode";

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
  whoStartedIt: z.string().describe("The name of the person who started/instigated the argument"),
  whoStartedReason: z.string().describe("Brief explanation of why this person is considered the instigator"),
  savageRoast: z.string().optional().describe("A brutal, funny roast of both participants and the argument itself. Only included when savage mode is on."),
  modeSpecificInsight: z.string().optional().describe("A special insight based on the analysis mode (lawyer ruling, therapist advice, comedy bit, gen z summary). Always include this."),
});

const MODE_CONFIG: Record<AnalysisMode, { icon: string; color: string; bgColor: string }> = {
  normal: { icon: "⚖️", color: "#a78bfa", bgColor: "rgba(167, 139, 250, 0.12)" },
  savage: { icon: "💀", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.12)" },
  lawyer: { icon: "⚖️", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.12)" },
  therapist: { icon: "💗", color: "#ec4899", bgColor: "rgba(236, 72, 153, 0.12)" },
  comedy: { icon: "🎤", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.12)" },
  genz: { icon: "💀", color: "#10b981", bgColor: "rgba(16, 185, 129, 0.12)" },
};

function getModePrompt(mode: AnalysisMode): string {
  switch (mode) {
    case "savage":
      return `\n\n🔥 SAVAGE MODE ACTIVATED 🔥\nBe BRUTALLY honest and hilariously savage in your analysis. Roast both participants mercilessly. Don't hold back. Use dark humor, sarcasm, and absolutely destroy them with your wit. The savageRoast field should be a 2-3 sentence absolutely devastating roast of the entire argument and both people involved. Make it so brutal they'll need therapy after reading it. Be creative, funny, and ruthless.\n\nFor modeSpecificInsight, write an extra savage one-liner summary.`;
    case "lawyer":
      return `\n\n⚖️ LAWYER MODE ⚖️\nAnalyze this argument as if you're a seasoned attorney presenting a case in court. Use formal legal language, reference logical fallacies as "objections", treat evidence as "exhibits", and deliver your verdict like a judge. Be thorough, precise, and authoritative. Reference precedent (made up is fine) and legal principles.\n\nFor modeSpecificInsight, write a formal legal ruling/opinion paragraph (2-3 sentences) as if this were an actual court case. Include "In the matter of [Person A] v. [Person B]..." format.\n\nLeave savageRoast empty.`;
    case "therapist":
      return `\n\n💗 THERAPIST MODE 💗\nAnalyze this argument from a relationship therapist's perspective. Focus on emotional dynamics, attachment styles, communication patterns, and underlying needs. Be empathetic and constructive. Identify what each person is really feeling beneath their words. Suggest healthier communication approaches.\n\nFor modeSpecificInsight, write personalized therapeutic advice (2-3 sentences) addressing the emotional dynamic and suggesting a specific communication technique both parties could use.\n\nLeave savageRoast empty.`;
    case "comedy":
      return `\n\n🎤 COMEDY MODE 🎤\nAnalyze this argument as if you're a stand-up comedian doing a bit about it on stage. Make it hilarious. Use comedic timing, callbacks, crowd work references, and build to a punchline. The analysis should read like a comedy set transcript. Be witty, not mean-spirited.\n\nFor modeSpecificInsight, write a 2-3 sentence comedy bit/joke about this specific argument, as if performing at a comedy club. Include a setup and punchline.\n\nLeave savageRoast empty.`;
    case "genz":
      return `\n\n💀 GEN Z MODE 💀\nAnalyze this argument using Gen Z slang, internet culture references, and meme language. Use terms like "no cap", "fr fr", "slay", "based", "L take", "W response", "main character energy", "giving", "ick", "red flag 🚩", "green flag", "understood the assignment", "rent free", "lowkey/highkey", "it's giving", "the vibe check", "ate and left no crumbs", etc. Make references to TikTok, stan culture, and internet memes. Be authentic to the voice.\n\nFor modeSpecificInsight, write a 2-3 sentence Gen Z summary using heavy slang, as if a Gen Z person is explaining this argument to their group chat.\n\nLeave savageRoast empty.`;
    default:
      return "\n\nBe humorous but fair in your analysis. Leave savageRoast empty. For modeSpecificInsight, write a brief balanced summary of the key takeaway from this argument.";
  }
}

function getAnalyzingText(mode: AnalysisMode, t: (key: TranslationKey) => string): string {
  switch (mode) {
    case "savage": return t('analyzingSavage' as TranslationKey);
    case "lawyer": return t('analyzingLawyer' as TranslationKey);
    case "therapist": return t('analyzingTherapist' as TranslationKey);
    case "comedy": return t('analyzingComedy' as TranslationKey);
    case "genz": return t('analyzingGenz' as TranslationKey);
    default: return t('analyzingArgument' as TranslationKey);
  }
}

function getModeAccentColor(mode: AnalysisMode): string {
  return MODE_CONFIG[mode].color;
}

export default function HomeScreen() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("normal");
  const { scores, renamePerson, addPerson, clearScoreboard, player1Color, player2Color, toggleColors } = useScoreboard();
  const { t, language, setLanguage } = useLanguage();
  const { addEntry, history } = useHistory();
  const { isPremium, canScan, scansRemaining, incrementScanCount } = usePremium();
  const [editNameModal, setEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [newNameInput, setNewNameInput] = useState("");
  const [modeAnim] = useState(new Animated.Value(0));

  const isSavage = analysisMode === "savage";
  const accentColor = getModeAccentColor(analysisMode);

  useEffect(() => {
    void checkConsent();
    void loadAnalysisMode();
    void ImagePicker.requestMediaLibraryPermissionsAsync().then((result) => {
      console.log("Media library permission pre-requested:", result.status);
    });
  }, []);

  useEffect(() => {
    Animated.timing(modeAnim, {
      toValue: isSavage ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSavage, modeAnim]);

  const checkConsent = async () => {
    const consent = await AsyncStorage.getItem("user_consent");
    if (!consent) {
      setShowConsentModal(true);
    }
  };

  const loadAnalysisMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(ANALYSIS_MODE_KEY);
      if (stored) {
        setAnalysisMode(stored as AnalysisMode);
      }
    } catch (error) {
      console.error("Failed to load analysis mode:", error);
    }
  };

  const selectMode = (mode: AnalysisMode) => {
    if (PREMIUM_MODES.includes(mode) && !isPremium) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push("/premium" as any);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalysisMode(mode);
    void AsyncStorage.setItem(ANALYSIS_MODE_KEY, mode).catch((error) => {
      console.error("Failed to save analysis mode:", error);
    });
  };

  const handleAcceptConsent = async () => {
    await AsyncStorage.setItem("user_consent", "true");
    setShowConsentModal(false);
  };

  const analysisMutation = useMutation({
    mutationFn: async (imageUris: string[]) => {
      console.log("Starting analysis for images:", imageUris.length, "mode:", analysisMode);

      const base64Images: string[] = [];
      for (const imageUri of imageUris) {
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
        base64Images.push(base64Image);
      }

      console.log("All images converted to base64");

      console.log("Validating if first image is a chat screenshot...");
      const validation = await generateObject({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: base64Images[0],
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

      const combinedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64Images.join("_") + `_${analysisMode}`
      );
      console.log("Combined image hash:", combinedHash);

      const cacheKey = `analysis_${combinedHash}`;
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

      const imageContentParts = base64Images.map((b64) => ({
        type: "image" as const,
        image: b64,
      }));

      const multiImageNote = base64Images.length > 1
        ? `\n\nIMPORTANT: These ${base64Images.length} images are parts of the SAME conversation, in order. Analyze them together as one continuous conversation.`
        : "";

      const modePrompt = getModePrompt(analysisMode);

      console.log("No cache found, analyzing images...");
      const result = await generateObject({
        messages: [
          {
            role: "user",
            content: [
              ...imageContentParts,
              {
                type: "text",
                text: `Analyze this argument/conversation screenshot. Determine who won the argument based on logical consistency, emotional stability, and communication effectiveness. Identify red flags, toxicity levels, and argument patterns.${modePrompt}\n\nAlso determine WHO STARTED the argument - identify the instigator who escalated things first or brought up the conflict. Explain briefly why.\n\nIMPORTANT for naming the people:\n- The person whose messages appear on the RIGHT side (typically colored/blue/green bubbles) should be called 'You'\n- The person whose messages appear on the LEFT side (typically grey/white bubbles) is the other person\n- If you can see a contact name or profile name at the top of the chat, use that for the other person\n- If no name is visible, give the other person a funny descriptive nickname based on their personality in the conversation (e.g. Drama Queen, Captain Excuses, The Deflector, Mr. Always Right, etc.)\n- Use these names consistently for winner, faultPerson, whoStartedIt, and all references${multiImageNote}`,
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void incrementScanCount();
      void addEntry(data, isSavage, analysisMode);
      router.push({
        pathname: "/results" as any,
        params: {
          data: JSON.stringify(data),
          images: JSON.stringify(selectedImages),
          savageMode: isSavage ? "true" : "false",
          analysisMode: analysisMode,
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
    if (!canScan) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        t('scanLimitReached'),
        t('scanLimitReachedDesc'),
        [
          { text: t('cancel'), style: "cancel" },
          { text: t('upgradeToPremium'), onPress: () => router.push("/premium" as any) },
        ]
      );
      return;
    }

    console.log("Opening image picker - multiple selection, no cropping");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.9,
      orderedSelection: true,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((asset) => asset.uri);
      console.log("Selected images:", uris.length);
      setSelectedImages(uris);
      analysisMutation.mutate(uris);
    }
  };

  const modes: { mode: AnalysisMode; icon: any; label: string; premium: boolean; desc: string }[] = [
    { mode: "normal", icon: Scale, label: t('modeNormal'), premium: false, desc: "Fair & balanced" },
    { mode: "savage", icon: Skull, label: t('modeSavage'), premium: false, desc: "No mercy roasts" },
    { mode: "lawyer", icon: Scale, label: t('modeLawyer'), premium: true, desc: "Court-style ruling" },
    { mode: "therapist", icon: Heart, label: t('modeTherapist'), premium: true, desc: "Emotional insight" },
    { mode: "comedy", icon: Laugh, label: t('modeComedy'), premium: true, desc: "Stand-up bit" },
    { mode: "genz", icon: Smartphone, label: t('modeGenz'), premium: true, desc: "No cap fr fr" },
  ];

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
        colors={isSavage ? ["#1a0505", "#2e0a0a", "#3d1111"] : ["#0a0118", "#1a0f2e", "#2d1b4e"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.contentScroll} bounces={true} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.topBar}>
              <View style={styles.topBarLeft}>
                {history.length > 0 && (
                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => router.push("/history" as any)}
                    activeOpacity={0.7}
                  >
                    <Clock color={accentColor} size={16} />
                    <Text style={[styles.historyButtonText, { color: accentColor }]}>{t('argumentHistory')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.insightsButton, isPremium && styles.insightsButtonPremium]}
                  onPress={() => router.push("/insights" as any)}
                  activeOpacity={0.7}
                >
                  <BarChart3 color={isPremium ? "#fbbf24" : "rgba(255,255,255,0.4)"} size={16} />
                </TouchableOpacity>
              </View>
              <View style={styles.topBarRight}>
                <TouchableOpacity
                  style={[styles.premiumButton, isPremium && styles.premiumButtonActive]}
                  onPress={() => router.push("/premium" as any)}
                  activeOpacity={0.7}
                >
                  <Crown color={isPremium ? "#fbbf24" : "rgba(251, 191, 36, 0.7)"} size={16} />
                  {isPremium && <Text style={styles.premiumButtonText}>PRO</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.languageToggle}
                  onPress={() => setShowLanguageModal(true)}
                  activeOpacity={0.7}
                >
                  <Globe color={accentColor} size={18} />
                </TouchableOpacity>
              </View>
            </View>

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
                      void setLanguage('en');
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
                      void setLanguage('es');
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
                      void setLanguage('de');
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
              <Text style={[styles.appSubtitle, { color: accentColor }]}>{t('appSubtitle')}</Text>
              <Text style={styles.subtitle}>
                {t('subtitle')}
              </Text>
              <Text style={styles.disclaimer}>
                {t('disclaimer')}
              </Text>

              <View style={styles.modeSection}>
                <Text style={[styles.modeSectionLabel, { color: accentColor }]}>{t('analysisMode')}</Text>
                <View style={styles.modeGrid}>
                  {modes.map((m) => {
                    const isSelected = analysisMode === m.mode;
                    const config = MODE_CONFIG[m.mode];
                    const isLocked = m.premium && !isPremium;
                    return (
                      <TouchableOpacity
                        key={m.mode}
                        style={[
                          styles.modeCard,
                          isSelected && { backgroundColor: `${config.color}18`, borderColor: config.color, borderWidth: 1.5 },
                          isLocked && styles.modeCardLocked,
                        ]}
                        onPress={() => selectMode(m.mode)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.modeCardIconWrap, isSelected && { backgroundColor: `${config.color}20` }]}>
                          <m.icon color={isSelected ? config.color : "rgba(255,255,255,0.35)"} size={18} />
                        </View>
                        <Text style={[
                          styles.modeCardLabel,
                          isSelected && { color: config.color },
                        ]}>
                          {m.label}
                        </Text>
                        <Text style={[
                          styles.modeCardDesc,
                          isSelected && { color: `${config.color}99` },
                        ]}>
                          {m.desc}
                        </Text>
                        {isLocked && (
                          <View style={styles.modeCardLockBadge}>
                            <Lock color="#fbbf24" size={9} />
                            <Text style={styles.modeCardLockText}>PRO</Text>
                          </View>
                        )}
                        {isSelected && !isLocked && (
                          <View style={[styles.modeCardActiveDot, { backgroundColor: config.color }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {scores.length >= 1 && (() => {
                const player1 = scores[0];
                const player2 = scores.length >= 2 ? scores[1] : null;
                const total = player1.wins + (player2?.wins ?? 0);
                const player1Ratio = player2 ? (total > 0 ? player1.wins / total : 0.5) : 1;
                return (
                  <View style={styles.scoreboardCard}>
                    <View style={styles.scoreboardHeaderRow}>
                      <Text style={styles.scoreboardLabel}>{t('scoreboard')}</Text>
                      <TouchableOpacity onPress={toggleColors} activeOpacity={0.7} style={styles.colorSwapButton}>
                        <ArrowLeftRight color="rgba(255,255,255,0.5)" size={14} />
                        <View style={[styles.colorDot, { backgroundColor: player1Color }]} />
                        <View style={[styles.colorDot, { backgroundColor: player2Color }]} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.scoreboardDivider} />
                    <View style={styles.vsContainer}>
                      <View style={styles.playerSide}>
                        <TouchableOpacity onPress={() => { setEditingName(player1.name); setNewNameInput(player1.name); setEditNameModal(true); }} activeOpacity={0.7}>
                          <View style={styles.editableNameRow}>
                            <Text style={[styles.player1Name, { color: player1Color }]} numberOfLines={1}>{player1.name}</Text>
                            <Pencil color={player1Color} size={12} />
                          </View>
                        </TouchableOpacity>
                        <Text style={[styles.player1Score, { color: player1Color }]}>{player1.wins}</Text>
                        <Text style={[styles.player1WinsLabel, { color: player1Color }]}>{t('wins').toUpperCase()}</Text>
                      </View>
                      {player2 ? (
                        <>
                          <Text style={styles.vsText}>VS</Text>
                          <View style={styles.playerSide}>
                            <TouchableOpacity onPress={() => { setEditingName(player2.name); setNewNameInput(player2.name); setEditNameModal(true); }} activeOpacity={0.7}>
                              <View style={styles.editableNameRow}>
                                <Text style={[styles.player2Name, { color: player2Color }]} numberOfLines={1}>{player2.name}</Text>
                                <Pencil color={player2Color} size={12} />
                              </View>
                            </TouchableOpacity>
                            <Text style={[styles.player2Score, { color: player2Color }]}>{player2.wins}</Text>
                            <Text style={[styles.player2WinsLabel, { color: player2Color }]}>{t('wins').toUpperCase()}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.vsText}>VS</Text>
                          <View style={styles.playerSide}>
                            <TouchableOpacity onPress={() => { setEditingName('__next_challenger__'); setNewNameInput(''); setEditNameModal(true); }} activeOpacity={0.7}>
                              <View style={styles.editableNameRow}>
                                <Text style={[styles.nextChallengerName, { color: player2Color }]} numberOfLines={1}>Opponent</Text>
                                <Pencil color={player2Color} size={12} />
                              </View>
                            </TouchableOpacity>
                            <Text style={[styles.player2Score, { color: player2Color }]}>0</Text>
                            <Text style={[styles.player2WinsLabel, { color: player2Color }]}>{t('wins').toUpperCase()}</Text>
                          </View>
                        </>
                      )}
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: `${player2Color}4D` }]}>
                      <View style={[styles.progressBarFill, { flex: player1Ratio, backgroundColor: player1Color }]} />
                      <View style={[styles.progressBarRight, { flex: 1 - player1Ratio, backgroundColor: player2Color }]} />
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

                    <TouchableOpacity
                      style={styles.clearScoreboardButton}
                      onPress={() => {
                        Alert.alert(
                          t('clearScoreboard'),
                          t('clearScoreboardConfirm'),
                          [
                            { text: t('cancel'), style: 'cancel' },
                            { text: t('clear'), style: 'destructive', onPress: clearScoreboard },
                          ]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Trash2 color="rgba(239, 68, 68, 0.7)" size={13} />
                      <Text style={styles.clearScoreboardText}>{t('clearScoreboard')}</Text>
                    </TouchableOpacity>
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
                          if (editingName === '__next_challenger__') {
                            void addPerson(newNameInput.trim());
                          } else {
                            void renamePerson(editingName, newNameInput.trim());
                          }
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
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={[styles.loadingText, { color: accentColor }]}>
                  {getAnalyzingText(analysisMode, t)}
                </Text>
              </View>
            ) : (
              <View style={styles.uploadSection}>
                {!isPremium && (
                  <View style={styles.scanLimitBar}>
                    <Text style={styles.scanLimitText}>
                      {scansRemaining} {t('scansRemaining')}
                    </Text>
                    <View style={styles.scanLimitDots}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.scanDot,
                            i < scansRemaining ? styles.scanDotActive : styles.scanDotUsed,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: accentColor }]}
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
          </ScrollView>
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
  contentScroll: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: 8,
  },
  topBarLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  topBarRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  historyButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#a78bfa",
  },
  insightsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  insightsButtonPremium: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderColor: "rgba(251, 191, 36, 0.25)",
  },
  premiumButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  premiumButtonActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  premiumButtonText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#fbbf24",
    letterSpacing: 1,
  },
  header: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  logoContainer: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  appSubtitle: {
    fontSize: 18,
    fontWeight: "600" as const,
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
    fontStyle: "italic" as const,
  },
  modeSection: {
    width: "100%",
    marginTop: 18,
    gap: 10,
  },
  modeSectionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  modeGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    justifyContent: "space-between" as const,
  },
  modeCard: {
    width: "31%" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    position: "relative" as const,
  },
  modeCardLocked: {
    opacity: 0.65,
  },
  modeCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 8,
  },
  modeCardLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center" as const,
    marginBottom: 2,
  },
  modeCardDesc: {
    fontSize: 9,
    fontWeight: "500" as const,
    color: "rgba(255, 255, 255, 0.3)",
    textAlign: "center" as const,
    lineHeight: 12,
  },
  modeCardLockBadge: {
    position: "absolute" as const,
    top: 6,
    right: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  modeCardLockText: {
    fontSize: 7,
    fontWeight: "800" as const,
    color: "#fbbf24",
    letterSpacing: 0.5,
  },
  modeCardActiveDot: {
    position: "absolute" as const,
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  scanLimitBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
  },
  scanLimitText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.45)",
  },
  scanLimitDots: {
    flexDirection: "row" as const,
    gap: 5,
  },
  scanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scanDotActive: {
    backgroundColor: "#10b981",
  },
  scanDotUsed: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  uploadSection: {
    gap: 12,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    backgroundColor: "#7c3aed",
  },
  uploadButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600" as const,
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
    textAlign: "center" as const,
  },
  scoreboardCard: {
    marginTop: 18,
    backgroundColor: "rgba(20, 14, 40, 0.85)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.45)",
    padding: 20,
    width: "100%",
  },
  scoreboardHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
  },
  scoreboardLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#fbbf24",
    letterSpacing: 2,
  },
  colorSwapButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreboardDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 14,
  },
  vsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
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
    fontSize: 44,
    fontWeight: "800" as const,
    color: "#ff69b4",
    lineHeight: 50,
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
    color: "#5bc0eb",
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
    fontSize: 44,
    fontWeight: "800" as const,
    color: "#5bc0eb",
    lineHeight: 50,
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
  clearScoreboardButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  clearScoreboardText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(239, 68, 68, 0.7)",
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
    justifyContent: "center" as const,
    alignItems: "center" as const,
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
    textAlign: "center" as const,
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
    textAlign: "center" as const,
    fontStyle: "italic" as const,
  },
  acceptButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center" as const,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  languageToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
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
