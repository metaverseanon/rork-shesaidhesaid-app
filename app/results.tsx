import { useLocalSearchParams, router } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import {
  Gavel,
  CheckCircle2,
  XCircle,
  Flame,
  Eye,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Share2,
} from "lucide-react-native";
import type { AnalysisResult } from "@/types/analysis";
import { useEffect, useRef, useState } from "react";
import { useScoreboard } from "@/contexts/ScoreboardContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ data: string; image: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { addWin } = useScoreboard();
  const hasRecordedWin = useRef(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { t } = useLanguage();

  let analysis: AnalysisResult | null = null;
  
  try {
    if (params.data) {
      analysis = JSON.parse(params.data);
    }
  } catch (error) {
    console.error("Failed to parse analysis data:", error);
  }

  useEffect(() => {
    if (analysis && !hasRecordedWin.current) {
      addWin(analysis.winner);
      hasRecordedWin.current = true;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, analysis, addWin]);

  const getShareMessage = () => {
    if (!analysis) return "";

    const trophies = analysis.winner === analysis.faultPerson ? "😬" : "🏆";
    const loserEmoji = analysis.faultPerson === analysis.winner ? "" : "💀";
    
    return `${trophies} ${t('shareResults')} ${trophies}\n\n` +
      `🎯 ${t('winner')}: ${analysis.winner}\n` +
      `${loserEmoji} ${t('atFault')}: ${analysis.faultPerson}\n\n` +
      `📊 ${t('verdict')}:\n${analysis.winnerReason}\n\n` +
      `🔥 ${t('toxicity')}: ${analysis.toxicityLevel}% (${analysis.toxicityLabel})\n` +
      `🎭 ${t('pattern')}: ${analysis.argumentPattern}\n` +
      `✅ ${t('credibility')}: ${analysis.yourCredibility}%\n\n` +
      `${analysis.redFlags.length > 0 ? `🚩 ${t('redFlags')}: ${analysis.redFlags.join(", ")}\n\n` : ""}` +
      `${t('judgedBy')}\n` +
      `${t('entertainmentPurposes')}`;
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleWhatsAppShare = async () => {
    const shareMessage = getShareMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

    try {
      if (Platform.OS === "web") {
        window.open(whatsappUrl, "_blank");
      } else {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          Alert.alert(t('error'), t('whatsappNotInstalled'));
        }
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      Alert.alert(t('error'), t('failedToOpenWhatsApp'));
    }
  };

  if (!analysis) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('noAnalysisData')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0118", "#1a0f2e", "#2d1b4e"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#a78bfa" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('analysisComplete')}</Text>
            <View style={styles.backButton} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.verdictCard}>
                <View style={styles.verdictHeader}>
                  <Gavel color="#a78bfa" size={20} />
                  <Text style={styles.verdictLabel}>{t('finalVerdict')}</Text>
                </View>
                <Text style={styles.winnerText}>{analysis.winner} {t('won')}</Text>
                <Text style={styles.winnerReason}>{analysis.winnerReason}</Text>

                <View style={styles.scoresContainer}>
                  <View style={styles.scoreCard}>
                    <CheckCircle2 color="#10b981" size={24} />
                    <Text style={styles.scorePercentage}>
                      {analysis.yourCredibility}%
                    </Text>
                    <Text style={styles.scoreLabel}>{t('credibility')}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.scoreCard}>
                    <XCircle color="#ef4444" size={24} />
                    <Text style={styles.faultLabel}>{t('fault')}</Text>
                    <Text style={styles.faultName}>{analysis.faultPerson}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('keyMetrics')}</Text>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Flame color="#f59e0b" size={24} />
                    </View>
                    <Text style={styles.metricLabel}>{t('toxicityLevel')}</Text>
                    <Text style={styles.metricValue}>
                      {analysis.toxicityLevel}%{" "}
                      <Text style={styles.metricValueLabel}>
                        {analysis.toxicityLabel}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Eye color="#8b5cf6" size={24} />
                    </View>
                    <Text style={styles.metricLabel}>{t('argumentPattern')}</Text>
                    <Text style={styles.metricPattern}>
                      {analysis.argumentPattern}
                    </Text>
                  </View>
                </View>
              </View>

              {analysis.redFlags.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('redFlagsDetected')}</Text>
                  <View style={styles.redFlagsContainer}>
                    {analysis.redFlags.map((flag, index) => (
                      <View key={index} style={styles.redFlagPill}>
                        <AlertCircle color="#ef4444" size={14} />
                        <Text style={styles.redFlagText}>{flag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.evidenceHeader}>
                  <Text style={styles.sectionTitle}>{t('evidenceLog')}</Text>
                  <View style={styles.liveBadge}>
                    <Sparkles color="#8b5cf6" size={12} />
                    <Text style={styles.liveBadgeText}>{t('liveAnalysis')}</Text>
                  </View>
                </View>

                <View style={styles.exhibitsContainer}>
                  {analysis.exhibits.map((exhibit, index) => (
                    <View key={index} style={styles.exhibitCard}>
                      <View style={styles.exhibitHeader}>
                        <View style={styles.exhibitBullet} />
                        <Text style={styles.exhibitTitle}>{exhibit.title}</Text>
                      </View>
                      <Text style={styles.exhibitDescription}>
                        {exhibit.description}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {params.image && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('originalScreenshot')}</Text>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: params.image }}
                      style={styles.screenshotImage}
                      contentFit="contain"
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Share2 color="#ffffff" size={20} />
                <Text style={styles.shareButtonText}>{t('shareVictory')}</Text>
              </TouchableOpacity>

              <Modal
                visible={showShareModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowShareModal(false)}
              >
                <View style={styles.shareModalOverlay}>
                  <View style={styles.shareModalContent}>
                    <Text style={styles.shareModalTitle}>{t('victoryMessagePreview')}</Text>
                    
                    <ScrollView style={styles.sharePreviewScroll} showsVerticalScrollIndicator={false}>
                      <View style={styles.sharePreviewCard}>
                        <Text style={styles.sharePreviewText}>{getShareMessage()}</Text>
                      </View>
                    </ScrollView>

                    <TouchableOpacity
                      style={styles.whatsappButton}
                      onPress={handleWhatsAppShare}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.whatsappButtonText}>{t('shareViaWhatsApp')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeModalButton}
                      onPress={() => setShowShareModal(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeModalButtonText}>{t('close')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.analyzeButtonText}>{t('analyzeAnother')}</Text>
              </TouchableOpacity>
            </Animated.View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(167, 139, 250, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  verdictCard: {
    backgroundColor: "rgba(30, 20, 60, 0.6)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.2)",
    padding: 24,
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  verdictLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a78bfa",
    letterSpacing: 1.2,
  },
  winnerText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  winnerReason: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
    marginBottom: 24,
  },
  scoresContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(45, 27, 78, 0.5)",
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  scoreCard: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  scorePercentage: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10b981",
  },
  scoreLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(167, 139, 250, 0.2)",
  },
  faultLabel: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "600",
  },
  faultName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a78bfa",
    letterSpacing: 1.2,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(30, 20, 60, 0.4)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
    padding: 20,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  metricValueLabel: {
    fontSize: 14,
    color: "#f59e0b",
  },
  metricPattern: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  redFlagsContainer: {
    gap: 10,
  },
  redFlagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  redFlagText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#ef4444",
  },
  evidenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a78bfa",
    letterSpacing: 0.8,
  },
  exhibitsContainer: {
    gap: 16,
  },
  exhibitCard: {
    backgroundColor: "rgba(30, 20, 60, 0.4)",
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#8b5cf6",
    padding: 20,
    gap: 8,
  },
  exhibitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exhibitBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8b5cf6",
  },
  exhibitTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a78bfa",
  },
  exhibitDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
    marginLeft: 20,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(30, 20, 60, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
  },
  screenshotImage: {
    width: "100%",
    aspectRatio: 0.75,
  },
  shareButton: {
    borderRadius: 16,
    backgroundColor: "#10b981",
    paddingVertical: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  analyzeButton: {
    borderRadius: 16,
    backgroundColor: "rgba(124, 58, 237, 0.5)",
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  shareModalContent: {
    backgroundColor: "#1a0f2e",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  shareModalTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
  },
  sharePreviewScroll: {
    maxHeight: 400,
    marginBottom: 20,
  },
  sharePreviewCard: {
    backgroundColor: "rgba(45, 27, 78, 0.6)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.2)",
  },
  sharePreviewText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  whatsappButton: {
    backgroundColor: "#25D366",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  closeModalButton: {
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  closeModalButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#a78bfa",
  },
});
