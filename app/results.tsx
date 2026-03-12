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
  Skull,
  Target,
  Copy,
} from "lucide-react-native";
import type { AnalysisResult } from "@/types/analysis";
import { useEffect, useRef, useState, useCallback } from "react";
import { useScoreboard } from "@/contexts/ScoreboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import * as Clipboard from "expo-clipboard";

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ data: string; images: string; savageMode: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { addWin } = useScoreboard();
  const hasRecordedWin = useRef(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { t } = useLanguage();
  const isSavage = params.savageMode === "true";

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
      void addWin(analysis.winner);
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

  const getShareMessage = useCallback(() => {
    if (!analysis) return "";

    const trophies = analysis.winner === analysis.faultPerson ? "😬" : "🏆";
    const loserEmoji = analysis.faultPerson === analysis.winner ? "" : "💀";
    
    let msg = `${trophies} ${t('shareResults')} ${trophies}\n\n` +
      `🎯 ${t('winner')}: ${analysis.winner}\n` +
      `${loserEmoji} ${t('atFault')}: ${analysis.faultPerson}\n` +
      `👆 ${t('whoStartedIt')}: ${analysis.whoStartedIt}\n\n` +
      `📊 ${t('verdict')}:\n${analysis.winnerReason}\n\n` +
      `🔥 ${t('toxicity')}: ${analysis.toxicityLevel}% (${analysis.toxicityLabel})\n` +
      `🎭 ${t('pattern')}: ${analysis.argumentPattern}\n` +
      `✅ ${t('credibility')}: ${analysis.yourCredibility}%\n\n`;

    if (analysis.redFlags.length > 0) {
      msg += `🚩 ${t('redFlags')}: ${analysis.redFlags.join(", ")}\n\n`;
    }

    if (isSavage && analysis.savageRoast) {
      msg += `🔥 SAVAGE ROAST:\n${analysis.savageRoast}\n\n`;
    }

    msg += `${t('judgedBy')}\n${t('entertainmentPurposes')}`;

    return msg;
  }, [analysis, t, isSavage]);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyText = async () => {
    const shareMessage = getShareMessage();
    try {
      await Clipboard.setStringAsync(shareMessage);
      Alert.alert("✅", t('copiedToClipboard'));
    } catch (error) {
      console.error("Failed to copy:", error);
    }
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

  const accentColor = isSavage ? "#ef4444" : "#a78bfa";
  const accentBg = isSavage ? "rgba(239, 68, 68, 0.15)" : "rgba(139, 92, 246, 0.1)";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isSavage ? ["#1a0505", "#2e0a0a", "#3d1111"] : ["#0a0118", "#1a0f2e", "#2d1b4e"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft color={accentColor} size={24} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{t('analysisComplete')}</Text>
              {isSavage && (
                <View style={styles.savageBadgeHeader}>
                  <Skull color="#ef4444" size={12} />
                  <Text style={styles.savageBadgeHeaderText}>{t('savage')}</Text>
                </View>
              )}
            </View>
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
              {isSavage && analysis.savageRoast ? (
                <View style={styles.savageRoastCard}>
                  <View style={styles.savageRoastHeader}>
                    <Skull color="#ef4444" size={20} />
                    <Text style={styles.savageRoastLabel}>{t('savageRoast')}</Text>
                    <Flame color="#f59e0b" size={16} />
                  </View>
                  <Text style={styles.savageRoastText}>{analysis.savageRoast}</Text>
                </View>
              ) : null}

              <View style={[styles.verdictCard, isSavage && styles.verdictCardSavage]}>
                <View style={styles.verdictHeader}>
                  <Gavel color={accentColor} size={20} />
                  <Text style={[styles.verdictLabel, { color: accentColor }]}>{t('finalVerdict')}</Text>
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

              <View style={styles.whoStartedCard}>
                <View style={styles.whoStartedHeader}>
                  <Target color="#f59e0b" size={20} />
                  <Text style={styles.whoStartedLabel}>{t('whoStartedIt')}</Text>
                </View>
                <Text style={styles.whoStartedName}>{analysis.whoStartedIt}</Text>
                <Text style={styles.whoStartedReason}>{analysis.whoStartedReason}</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accentColor }]}>{t('keyMetrics')}</Text>

                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, isSavage && styles.metricCardSavage]}>
                    <View style={[styles.metricIcon, { backgroundColor: accentBg }]}>
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

                  <View style={[styles.metricCard, isSavage && styles.metricCardSavage]}>
                    <View style={[styles.metricIcon, { backgroundColor: accentBg }]}>
                      <Eye color={accentColor} size={24} />
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
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>{t('redFlagsDetected')}</Text>
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
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>{t('evidenceLog')}</Text>
                  <View style={[styles.liveBadge, { backgroundColor: `${accentColor}26` }]}>
                    <Sparkles color={accentColor} size={12} />
                    <Text style={[styles.liveBadgeText, { color: accentColor }]}>{t('liveAnalysis')}</Text>
                  </View>
                </View>

                <View style={styles.exhibitsContainer}>
                  {analysis.exhibits.map((exhibit, index) => (
                    <View key={index} style={[styles.exhibitCard, isSavage && { borderLeftColor: "#ef4444" }]}>
                      <View style={styles.exhibitHeader}>
                        <View style={[styles.exhibitBullet, { backgroundColor: isSavage ? "#ef4444" : "#8b5cf6" }]} />
                        <Text style={[styles.exhibitTitle, { color: accentColor }]}>{exhibit.title}</Text>
                      </View>
                      <Text style={styles.exhibitDescription}>
                        {exhibit.description}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {params.images && (() => {
                let imageList: string[] = [];
                try {
                  imageList = JSON.parse(params.images);
                } catch (e) {
                  console.log('Failed to parse images param', e);
                }
                if (imageList.length === 0) return null;
                return (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: accentColor }]}>
                      {t('originalScreenshot')}{imageList.length > 1 ? ` (${imageList.length})` : ''}
                    </Text>
                    {imageList.map((uri, idx) => (
                      <View key={idx} style={styles.imageContainer}>
                        <Image
                          source={{ uri }}
                          style={styles.screenshotImage}
                          contentFit="contain"
                        />
                      </View>
                    ))}
                  </View>
                );
              })()}

              <View style={styles.resultCardContainer}>
                <Text style={[styles.sectionTitle, { color: accentColor, marginBottom: 12 }]}>{t('resultCard')}</Text>
                <View style={[styles.shareableCard, isSavage && styles.shareableCardSavage]}>
                  <View style={styles.shareableCardTop}>
                    <Text style={styles.shareableCardAppName}>Argument Judge</Text>
                    {isSavage && <Text style={styles.shareableCardSavageTag}>🔥 SAVAGE</Text>}
                  </View>
                  <View style={styles.shareableCardDivider} />
                  <View style={styles.shareableCardRow}>
                    <View style={styles.shareableCardCol}>
                      <Text style={styles.shareableCardLabel}>🏆 {t('winner')}</Text>
                      <Text style={styles.shareableCardValue}>{analysis.winner}</Text>
                    </View>
                    <View style={styles.shareableCardCol}>
                      <Text style={styles.shareableCardLabel}>💀 {t('atFault')}</Text>
                      <Text style={styles.shareableCardValue}>{analysis.faultPerson}</Text>
                    </View>
                  </View>
                  <View style={styles.shareableCardRow}>
                    <View style={styles.shareableCardCol}>
                      <Text style={styles.shareableCardLabel}>👆 {t('whoStartedIt')}</Text>
                      <Text style={styles.shareableCardValue}>{analysis.whoStartedIt}</Text>
                    </View>
                    <View style={styles.shareableCardCol}>
                      <Text style={styles.shareableCardLabel}>🔥 {t('toxicity')}</Text>
                      <Text style={styles.shareableCardValue}>{analysis.toxicityLevel}%</Text>
                    </View>
                  </View>
                  <View style={styles.shareableCardDivider} />
                  <Text style={styles.shareableCardVerdict}>{analysis.winnerReason}</Text>
                  {isSavage && analysis.savageRoast ? (
                    <>
                      <View style={styles.shareableCardDivider} />
                      <Text style={styles.shareableCardRoast}>🔥 {analysis.savageRoast}</Text>
                    </>
                  ) : null}
                  <View style={styles.shareableCardFooter}>
                    <Text style={styles.shareableCardFooterText}>{t('entertainmentPurposes')}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.shareButton, isSavage && { backgroundColor: "#dc2626" }]}
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
                      style={styles.copyButton}
                      onPress={handleCopyText}
                      activeOpacity={0.8}
                    >
                      <Copy color="#a78bfa" size={16} />
                      <Text style={styles.copyButtonText}>{t('copyText')}</Text>
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
                style={[styles.analyzeButton, isSavage && { borderColor: "rgba(239, 68, 68, 0.3)" }]}
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
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  savageBadgeHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  savageBadgeHeaderText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#ef4444",
    letterSpacing: 1,
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
  savageRoastCard: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 20,
  },
  savageRoastHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  savageRoastLabel: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#ef4444",
    letterSpacing: 1.5,
    flex: 1,
  },
  savageRoastText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 24,
    fontStyle: "italic" as const,
  },
  verdictCard: {
    backgroundColor: "rgba(30, 20, 60, 0.6)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.2)",
    padding: 24,
  },
  verdictCardSavage: {
    borderColor: "rgba(239, 68, 68, 0.25)",
    backgroundColor: "rgba(60, 20, 20, 0.4)",
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  verdictLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#a78bfa",
    letterSpacing: 1.2,
  },
  winnerText: {
    fontSize: 32,
    fontWeight: "700" as const,
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
    fontWeight: "700" as const,
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
    fontWeight: "600" as const,
  },
  faultName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  whoStartedCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    padding: 20,
  },
  whoStartedHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  whoStartedLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#f59e0b",
    letterSpacing: 1.2,
  },
  whoStartedName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#fbbf24",
    marginBottom: 6,
  },
  whoStartedReason: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.65)",
    lineHeight: 20,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
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
  metricCardSavage: {
    borderColor: "rgba(239, 68, 68, 0.15)",
    backgroundColor: "rgba(60, 20, 20, 0.3)",
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
    fontWeight: "700" as const,
    color: "#ffffff",
  },
  metricValueLabel: {
    fontSize: 14,
    color: "#f59e0b",
  },
  metricPattern: {
    fontSize: 18,
    fontWeight: "600" as const,
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
    fontWeight: "500" as const,
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
    fontWeight: "700" as const,
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
    fontWeight: "600" as const,
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
  resultCardContainer: {
    gap: 0,
  },
  shareableCard: {
    backgroundColor: "rgba(20, 14, 40, 0.95)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.3)",
    padding: 20,
    overflow: "hidden" as const,
  },
  shareableCardSavage: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(40, 10, 10, 0.95)",
  },
  shareableCardTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  shareableCardAppName: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 2,
  },
  shareableCardSavageTag: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#ef4444",
  },
  shareableCardDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 12,
  },
  shareableCardRow: {
    flexDirection: "row" as const,
    gap: 16,
    marginBottom: 12,
  },
  shareableCardCol: {
    flex: 1,
  },
  shareableCardLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.45)",
    marginBottom: 4,
  },
  shareableCardValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#ffffff",
  },
  shareableCardVerdict: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  shareableCardRoast: {
    fontSize: 13,
    color: "#f87171",
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  shareableCardFooter: {
    marginTop: 14,
    alignItems: "center" as const,
  },
  shareableCardFooterText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.3)",
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
    fontWeight: "600" as const,
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
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center" as const,
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
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
    textAlign: "center" as const,
  },
  sharePreviewScroll: {
    maxHeight: 300,
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
    alignItems: "center" as const,
    marginBottom: 10,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  copyButton: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.25)",
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#a78bfa",
  },
  closeModalButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
  },
  closeModalButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.5)",
  },
});
