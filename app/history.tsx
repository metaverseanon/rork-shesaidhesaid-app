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
import { ArrowLeft, Trash2, Trophy, Skull, Target, Flame, ChevronRight } from "lucide-react-native";
import { useHistory } from "@/contexts/HistoryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { HistoryEntry } from "@/types/analysis";

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const { t } = useLanguage();
  const analysis = entry.analysis;
  const date = new Date(entry.date);
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const handlePress = () => {
    router.push({
      pathname: "/results" as any,
      params: {
        data: JSON.stringify(analysis),
        savageMode: entry.savageMode ? "true" : "false",
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.historyCard, entry.savageMode && styles.historyCardSavage]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardDateContainer}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          <Text style={styles.cardTime}>{formattedTime}</Text>
        </View>
        {entry.savageMode && (
          <View style={styles.savageBadge}>
            <Skull color="#ef4444" size={10} />
            <Text style={styles.savageBadgeText}>SAVAGE</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardMainRow}>
          <View style={styles.cardWinnerSection}>
            <Trophy color="#fbbf24" size={16} />
            <Text style={styles.cardWinnerName} numberOfLines={1}>{analysis.winner}</Text>
          </View>
          <ChevronRight color="rgba(255,255,255,0.3)" size={18} />
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaItem}>
            <Target color="#f59e0b" size={12} />
            <Text style={styles.cardMetaLabel}>{t('whoStartedIt')}:</Text>
            <Text style={styles.cardMetaValue} numberOfLines={1}>{analysis.whoStartedIt}</Text>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaItem}>
            <Flame color={analysis.toxicityLevel > 60 ? "#ef4444" : "#f59e0b"} size={12} />
            <Text style={styles.cardMetaValue}>{analysis.toxicityLevel}% {analysis.toxicityLabel}</Text>
          </View>
          <Text style={styles.cardPattern} numberOfLines={1}>{analysis.argumentPattern}</Text>
        </View>
      </View>

      {entry.savageMode && analysis.savageRoast ? (
        <View style={styles.cardRoastPreview}>
          <Text style={styles.cardRoastText} numberOfLines={2}>🔥 {analysis.savageRoast}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { history, clearHistory } = useHistory();
  const { t } = useLanguage();

  const handleClearHistory = () => {
    Alert.alert(
      t('clearHistory'),
      t('clearHistoryConfirm'),
      [
        { text: t('cancel'), style: "cancel" },
        { text: t('clear'), style: "destructive", onPress: () => void clearHistory() },
      ]
    );
  };

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
            <Text style={styles.headerTitle}>{t('historyTitle')}</Text>
            {history.length > 0 ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearHistory}
                activeOpacity={0.7}
              >
                <Trash2 color="rgba(239, 68, 68, 0.7)" size={18} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>{t('noHistory')}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {history.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} />
              ))}
            </ScrollView>
          )}
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
    fontWeight: "600" as const,
    color: "#ffffff",
  },
  clearButton: {
    width: 40,
    height: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 16,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center" as const,
  },
  historyCard: {
    backgroundColor: "rgba(30, 20, 60, 0.5)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
    padding: 16,
    gap: 10,
  },
  historyCardSavage: {
    borderColor: "rgba(239, 68, 68, 0.2)",
    backgroundColor: "rgba(60, 20, 20, 0.3)",
  },
  cardTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  cardDateContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  cardDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "500" as const,
  },
  cardTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.3)",
  },
  savageBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savageBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#ef4444",
    letterSpacing: 1,
  },
  cardContent: {
    gap: 8,
  },
  cardMainRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  cardWinnerSection: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flex: 1,
  },
  cardWinnerName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#ffffff",
    flex: 1,
  },
  cardMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  cardMetaItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    flex: 1,
  },
  cardMetaLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
  },
  cardMetaValue: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.7)",
    flexShrink: 1,
  },
  cardPattern: {
    fontSize: 11,
    color: "rgba(167, 139, 250, 0.7)",
    fontWeight: "600" as const,
    flexShrink: 1,
  },
  cardRoastPreview: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },
  cardRoastText: {
    fontSize: 12,
    color: "#f87171",
    lineHeight: 18,
    fontStyle: "italic" as const,
  },
});
