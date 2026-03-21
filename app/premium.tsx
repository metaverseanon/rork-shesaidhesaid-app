import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
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

export default function PremiumScreen() {
  const { t } = useLanguage();
  const { isPremium, activatePremium } = usePremium();

  const handlePurchase = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void activatePremium();
    Alert.alert("🎉", t('premiumActivated'), [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const handleRestore = () => {
    if (isPremium) {
      Alert.alert("✅", t('premiumAlreadyActive'));
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void activatePremium();
      Alert.alert("🎉", t('premiumRestored'), [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  const features = [
    { icon: Zap, label: t('unlimitedScans'), desc: t('unlimitedScansDesc') },
    { icon: Scale, label: t('lawyerMode'), desc: t('lawyerModeDesc') },
    { icon: Heart, label: t('therapistMode'), desc: t('therapistModeDesc') },
    { icon: Laugh, label: t('comedyMode'), desc: t('comedyModeDesc') },
    { icon: Smartphone, label: t('genzMode'), desc: t('genzModeDesc') },
    { icon: BarChart3, label: t('relationshipInsights'), desc: t('relationshipInsightsDesc') },
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
            <Text style={styles.headerTitle}>{t('premium')}</Text>
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
              <Text style={styles.heroTitle}>{t('unlockPremium')}</Text>
              <Text style={styles.heroSubtitle}>{t('premiumSubtitle')}</Text>
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
              <View style={styles.pricingCard}>
                <View style={styles.pricingBadge}>
                  <Zap color="#fbbf24" size={14} />
                  <Text style={styles.pricingBadgeText}>{t('bestValue')}</Text>
                </View>
                <Text style={styles.pricingAmount}>$4.99<Text style={styles.pricingPerMonth}>/mo</Text></Text>
                <Text style={styles.pricingPeriod}>{t('lifetime')}</Text>
                <Text style={styles.pricingNote}>{t('oneTimePurchase')}</Text>
              </View>
            </View>

            {isPremium ? (
              <View style={styles.activeBadge}>
                <Crown color="#fbbf24" size={20} />
                <Text style={styles.activeBadgeText}>{t('premiumActive')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={handlePurchase}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#fbbf24", "#f59e0b", "#d97706"]}
                  style={styles.purchaseButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Crown color="#ffffff" size={22} />
                  <Text style={styles.purchaseButtonText}>{t('getPremium')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              activeOpacity={0.7}
            >
              <Text style={styles.restoreButtonText}>{t('restorePurchase')}</Text>
            </TouchableOpacity>

            <Text style={styles.legalText}>{t('premiumLegal')}</Text>
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
  },
  pricingCard: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(251, 191, 36, 0.3)",
    padding: 28,
    alignItems: "center",
  },
  pricingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  pricingBadgeText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#fbbf24",
    letterSpacing: 1,
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: "800" as const,
    color: "#fbbf24",
    marginBottom: 4,
  },
  pricingPerMonth: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "rgba(251, 191, 36, 0.7)",
  },
  pricingPeriod: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
  },
  pricingNote: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
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
