import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ArrowLeft,
  Crown,
  Zap,
  Scale,
  Heart,
  Laugh,
  Smartphone,
  BarChart3,
  Check,
} from "lucide-react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/contexts/PremiumContext";
import * as Haptics from "expo-haptics";

type PlanType = "monthly" | "yearly";

export default function PremiumScreen() {
  const { t } = useLanguage();
  const {
    isPremium,
    monthlyPackage,
    annualPackage,
    purchasePackage,
    restorePurchases,
    isPurchasing,
    isRestoring,
    isLoading,
  } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");

  const handlePurchase = () => {
    const pkg = selectedPlan === "monthly" ? monthlyPackage : annualPackage;
    if (!pkg) {
      Alert.alert(t("error"), "This plan is not available right now. Please try again later.");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    purchasePackage(pkg);
  };

  const handleRestore = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restorePurchases();
  };

  const monthlyPrice = monthlyPackage?.product?.priceString ?? "$4.99";
  const yearlyPrice = annualPackage?.product?.priceString ?? "$29.99";

  const features = [
    { icon: Zap, label: t("unlimitedScans"), desc: t("unlimitedScansDesc") },
    { icon: Scale, label: t("lawyerMode"), desc: t("lawyerModeDesc") },
    { icon: Heart, label: t("therapistMode"), desc: t("therapistModeDesc") },
    { icon: Laugh, label: t("comedyMode"), desc: t("comedyModeDesc") },
    { icon: Smartphone, label: t("genzMode"), desc: t("genzModeDesc") },
    {
      icon: BarChart3,
      label: t("relationshipInsights"),
      desc: t("relationshipInsightsDesc"),
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0118", "#1a0a2e", "#2a0f3e", "#1a0a2e"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#fbbf24" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("premium")}</Text>
            <View style={styles.backButton} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroSection}>
              <View style={styles.crownContainer}>
                <LinearGradient
                  colors={["#fbbf24", "#f59e0b", "#d97706"]}
                  style={styles.crownBg}
                >
                  <Crown color="#ffffff" size={40} />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>{t("unlockPremium")}</Text>
              <Text style={styles.heroSubtitle}>{t("premiumSubtitle")}</Text>
            </View>

            <View style={styles.featuresSection}>
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <View key={index} style={styles.featureCard}>
                    <View style={styles.featureIconContainer}>
                      <IconComponent color="#fbbf24" size={22} />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                      <Text style={styles.featureDesc}>{feature.desc}</Text>
                    </View>
                    <Check color="#fbbf24" size={18} />
                  </View>
                );
              })}
            </View>

            <View style={styles.pricingSection}>
              <View style={styles.planToggle}>
                <TouchableOpacity
                  style={[
                    styles.planToggleButton,
                    selectedPlan === "monthly" && styles.planToggleButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedPlan("monthly");
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.planToggleText,
                      selectedPlan === "monthly" && styles.planToggleTextActive,
                    ]}
                  >
                    {t("monthly")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.planToggleButton,
                    selectedPlan === "yearly" && styles.planToggleButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedPlan("yearly");
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.planToggleText,
                      selectedPlan === "yearly" && styles.planToggleTextActive,
                    ]}
                  >
                    {t("yearly")}
                  </Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>{t("yearlySave")}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  selectedPlan === "monthly" && styles.pricingCardSelected,
                ]}
                onPress={() => {
                  setSelectedPlan("monthly");
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.pricingCardRow}>
                  <View style={styles.pricingCardLeft}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPlan === "monthly" && styles.radioOuterActive,
                      ]}
                    >
                      {selectedPlan === "monthly" && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.planName}>{t("monthly")}</Text>
                      <Text style={styles.planNote}>
                        {t("monthlySubscription")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>
                    {monthlyPrice}
                    <Text style={styles.planPriceSub}>{t("perMonth")}</Text>
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  selectedPlan === "yearly" && styles.pricingCardSelected,
                ]}
                onPress={() => {
                  setSelectedPlan("yearly");
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.8}
              >
                {selectedPlan === "yearly" && (
                  <View style={styles.bestValueBadge}>
                    <Zap color="#0a0118" size={12} />
                    <Text style={styles.bestValueText}>{t("bestValue")}</Text>
                  </View>
                )}
                <View style={styles.pricingCardRow}>
                  <View style={styles.pricingCardLeft}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPlan === "yearly" && styles.radioOuterActive,
                      ]}
                    >
                      {selectedPlan === "yearly" && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.planName}>{t("yearlyPlan")}</Text>
                      <Text style={styles.planNote}>{t("yearlyNote")}</Text>
                    </View>
                  </View>
                  <View style={styles.yearlyPriceContainer}>
                    <Text style={styles.planPriceStrike}>$59.88</Text>
                    <Text style={styles.planPrice}>
                      {yearlyPrice}
                      <Text style={styles.planPriceSub}>{t("perYear")}</Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {isPremium ? (
              <View style={styles.activeBadge}>
                <Crown color="#fbbf24" size={20} />
                <Text style={styles.activeBadgeText}>
                  {t("premiumActive")}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (isPurchasing || isLoading) && styles.purchaseButtonDisabled,
                ]}
                onPress={handlePurchase}
                activeOpacity={0.8}
                disabled={isPurchasing || isLoading}
              >
                <LinearGradient
                  colors={["#fbbf24", "#f59e0b", "#d97706"]}
                  style={styles.purchaseButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Crown color="#ffffff" size={22} />
                  )}
                  <Text style={styles.purchaseButtonText}>
                    {isPurchasing ? t("processing") : t("getPremium")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              activeOpacity={0.7}
              disabled={isRestoring}
            >
              <Text style={styles.restoreButtonText}>
                {isRestoring ? t("restoring") : t("restorePurchase")}
              </Text>
            </TouchableOpacity>

            <Text style={styles.legalText}>{t("premiumLegal")}</Text>
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
    borderBottomColor: "rgba(251, 191, 36, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fbbf24",
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
  },
  crownContainer: {
    marginBottom: 20,
  },
  crownBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
  },
  featuresSection: {
    gap: 10,
    marginBottom: 28,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextContainer: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  pricingSection: {
    marginBottom: 24,
    gap: 10,
  },
  planToggle: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 6,
  },
  planToggleButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 11,
    gap: 6,
  },
  planToggleButtonActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  planToggleText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.4)",
  },
  planToggleTextActive: {
    color: "#fbbf24",
  },
  saveBadge: {
    backgroundColor: "#fbbf24",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#0a0118",
    letterSpacing: 0.5,
  },
  pricingCard: {
    backgroundColor: "rgba(251, 191, 36, 0.05)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.12)",
    padding: 18,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  pricingCardSelected: {
    borderColor: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
  },
  pricingCardRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  pricingCardLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  radioOuterActive: {
    borderColor: "#fbbf24",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fbbf24",
  },
  planName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#ffffff",
    marginBottom: 2,
  },
  planNote: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.45)",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#fbbf24",
  },
  planPriceSub: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(251, 191, 36, 0.6)",
  },
  planPriceStrike: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "rgba(255, 255, 255, 0.3)",
    textDecorationLine: "line-through" as const,
    textAlign: "right" as const,
    marginBottom: 2,
  },
  yearlyPriceContainer: {
    alignItems: "flex-end" as const,
  },
  bestValueBadge: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#0a0118",
    letterSpacing: 0.5,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.3)",
    marginBottom: 16,
  },
  activeBadgeText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#fbbf24",
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#ffffff",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 20,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "rgba(251, 191, 36, 0.6)",
  },
  legalText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.25)",
    textAlign: "center",
    lineHeight: 16,
  },
});
