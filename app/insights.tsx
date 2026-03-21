import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ArrowLeft,
  BarChart3,
  Trophy,
  Flame,
  Target,
  AlertTriangle,
  TrendingUp,
  Users,
  Crown,
  Lock,
} from "lucide-react-native";
import { useHistory } from "@/contexts/HistoryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/contexts/PremiumContext";

interface PersonStats {
  name: string;
  wins: number;
  losses: number;
  timesStarted: number;
  timesFault: number;
  avgToxicity: number;
  appearances: number;
}

export default function InsightsScreen() {
  const { history } = useHistory();
  const { t } = useLanguage();
  const { isPremium } = usePremium();

  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const totalArguments = history.length;
    const avgToxicity = history.reduce((sum, e) => sum + e.analysis.toxicityLevel, 0) / totalArguments;
    const highToxicityCount = history.filter((e) => e.analysis.toxicityLevel > 60).length;

    const patternMap: Record<string, number> = {};
    const redFlagMap: Record<string, number> = {};
    const personMap: Record<string, PersonStats> = {};

    for (const entry of history) {
      const a = entry.analysis;

      const pattern = a.argumentPattern;
      patternMap[pattern] = (patternMap[pattern] || 0) + 1;

      for (const flag of a.redFlags) {
        redFlagMap[flag] = (redFlagMap[flag] || 0) + 1;
      }

      const winnerKey = a.winner.toLowerCase();
      const faultKey = a.faultPerson.toLowerCase();
      const starterKey = a.whoStartedIt.toLowerCase();

      if (!personMap[winnerKey]) {
        personMap[winnerKey] = { name: a.winner, wins: 0, losses: 0, timesStarted: 0, timesFault: 0, avgToxicity: 0, appearances: 0 };
      }
      personMap[winnerKey].wins += 1;
      personMap[winnerKey].appearances += 1;
      personMap[winnerKey].avgToxicity += a.toxicityLevel;

      if (faultKey !== winnerKey) {
        if (!personMap[faultKey]) {
          personMap[faultKey] = { name: a.faultPerson, wins: 0, losses: 0, timesStarted: 0, timesFault: 0, avgToxicity: 0, appearances: 0 };
        }
        personMap[faultKey].losses += 1;
        personMap[faultKey].timesFault += 1;
        personMap[faultKey].appearances += 1;
        personMap[faultKey].avgToxicity += a.toxicityLevel;
      } else {
        personMap[winnerKey].timesFault += 1;
      }

      if (starterKey !== winnerKey && starterKey !== faultKey) {
        if (!personMap[starterKey]) {
          personMap[starterKey] = { name: a.whoStartedIt, wins: 0, losses: 0, timesStarted: 0, timesFault: 0, avgToxicity: 0, appearances: 0 };
        }
        personMap[starterKey].timesStarted += 1;
        personMap[starterKey].appearances += 1;
        personMap[starterKey].avgToxicity += a.toxicityLevel;
      } else if (personMap[starterKey]) {
        personMap[starterKey].timesStarted += 1;
      }
    }

    for (const key of Object.keys(personMap)) {
      if (personMap[key].appearances > 0) {
        personMap[key].avgToxicity = Math.round(personMap[key].avgToxicity / personMap[key].appearances);
      }
    }

    const topPatterns = Object.entries(patternMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topRedFlags = Object.entries(redFlagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const people = Object.values(personMap).sort((a, b) => b.appearances - a.appearances);

    const mostWins = people.length > 0 ? [...people].sort((a, b) => b.wins - a.wins)[0] : null;
    const biggestInstigator = people.length > 0 ? [...people].sort((a, b) => b.timesStarted - a.timesStarted)[0] : null;

    const toxicityTrend = history.length >= 3
      ? history.slice(0, 5).reduce((s, e) => s + e.analysis.toxicityLevel, 0) / Math.min(5, history.length)
        - history.slice(-5).reduce((s, e) => s + e.analysis.toxicityLevel, 0) / Math.min(5, history.length)
      : 0;

    return {
      totalArguments,
      avgToxicity: Math.round(avgToxicity),
      highToxicityCount,
      topPatterns,
      topRedFlags,
      people,
      mostWins,
      biggestInstigator,
      toxicityTrend: Math.round(toxicityTrend),
    };
  }, [history]);

  if (!isPremium) {
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
              <Text style={styles.headerTitle}>{t('insights')}</Text>
              <View style={styles.backButton} />
            </View>
            <View style={styles.lockedContainer}>
              <View style={styles.lockedIconContainer}>
                <Lock color="#fbbf24" size={48} />
              </View>
              <Text style={styles.lockedTitle}>{t('insightsLocked')}</Text>
              <Text style={styles.lockedDesc}>{t('insightsLockedDesc')}</Text>
              <TouchableOpacity
                style={styles.unlockButton}
                onPress={() => router.push("/premium" as any)}
                activeOpacity={0.8}
              >
                <Crown color="#ffffff" size={18} />
                <Text style={styles.unlockButtonText}>{t('unlockPremium')}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
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
            <View style={styles.headerCenter}>
              <BarChart3 color="#fbbf24" size={18} />
              <Text style={styles.headerTitle}>{t('insights')}</Text>
            </View>
            <View style={styles.backButton} />
          </View>

          {!stats || history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>{t('insightsEmpty')}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewNumber}>{stats.totalArguments}</Text>
                  <Text style={styles.overviewLabel}>{t('totalArguments')}</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={[styles.overviewNumber, { color: stats.avgToxicity > 60 ? "#ef4444" : stats.avgToxicity > 30 ? "#f59e0b" : "#10b981" }]}>
                    {stats.avgToxicity}%
                  </Text>
                  <Text style={styles.overviewLabel}>{t('avgToxicity')}</Text>
                </View>
              </View>

              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <Text style={[styles.overviewNumber, { color: "#ef4444" }]}>{stats.highToxicityCount}</Text>
                  <Text style={styles.overviewLabel}>{t('highToxicity')}</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <TrendingUp color={stats.toxicityTrend > 0 ? "#10b981" : "#ef4444"} size={16} />
                    <Text style={[styles.overviewNumber, { color: stats.toxicityTrend > 0 ? "#10b981" : "#ef4444", fontSize: 20 }]}>
                      {stats.toxicityTrend > 0 ? "↓" : "↑"} {Math.abs(stats.toxicityTrend)}%
                    </Text>
                  </View>
                  <Text style={styles.overviewLabel}>{t('toxicityTrend')}</Text>
                </View>
              </View>

              {stats.mostWins && (
                <View style={styles.highlightCard}>
                  <View style={styles.highlightHeader}>
                    <Trophy color="#fbbf24" size={20} />
                    <Text style={styles.highlightTitle}>{t('topWinner')}</Text>
                  </View>
                  <Text style={styles.highlightName}>{stats.mostWins.name}</Text>
                  <Text style={styles.highlightStat}>
                    {stats.mostWins.wins} {t('wins').toLowerCase()} / {stats.mostWins.appearances} {t('arguments').toLowerCase()}
                  </Text>
                </View>
              )}

              {stats.biggestInstigator && stats.biggestInstigator.timesStarted > 0 && (
                <View style={[styles.highlightCard, styles.instigatorCard]}>
                  <View style={styles.highlightHeader}>
                    <Target color="#f59e0b" size={20} />
                    <Text style={[styles.highlightTitle, { color: "#f59e0b" }]}>{t('topInstigator')}</Text>
                  </View>
                  <Text style={[styles.highlightName, { color: "#fbbf24" }]}>{stats.biggestInstigator.name}</Text>
                  <Text style={styles.highlightStat}>
                    {t('started')} {stats.biggestInstigator.timesStarted} {t('arguments').toLowerCase()}
                  </Text>
                </View>
              )}

              {stats.people.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Users color="#a78bfa" size={18} />
                    <Text style={styles.sectionTitle}>{t('peopleStats')}</Text>
                  </View>
                  {stats.people.slice(0, 8).map((person, index) => {
                    const winRate = person.appearances > 0 ? Math.round((person.wins / person.appearances) * 100) : 0;
                    return (
                      <View key={index} style={styles.personRow}>
                        <View style={styles.personInfo}>
                          <Text style={styles.personRank}>#{index + 1}</Text>
                          <View style={styles.personDetails}>
                            <Text style={styles.personName} numberOfLines={1}>{person.name}</Text>
                            <Text style={styles.personMeta}>
                              {person.wins}W · {person.losses}L · {t('started')} {person.timesStarted}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.personWinRate}>
                          <Text style={[styles.personWinRateText, {
                            color: winRate > 60 ? "#10b981" : winRate > 40 ? "#f59e0b" : "#ef4444"
                          }]}>{winRate}%</Text>
                          <Text style={styles.personWinRateLabel}>{t('winRate')}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {stats.topPatterns.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Flame color="#f59e0b" size={18} />
                    <Text style={styles.sectionTitle}>{t('commonPatterns')}</Text>
                  </View>
                  {stats.topPatterns.map(([pattern, count], index) => (
                    <View key={index} style={styles.patternRow}>
                      <View style={styles.patternBar}>
                        <View style={[styles.patternBarFill, {
                          width: `${Math.max(15, (count / stats.totalArguments) * 100)}%`,
                        }]} />
                      </View>
                      <View style={styles.patternInfo}>
                        <Text style={styles.patternName} numberOfLines={1}>{pattern}</Text>
                        <Text style={styles.patternCount}>{count}x</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {stats.topRedFlags.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AlertTriangle color="#ef4444" size={18} />
                    <Text style={[styles.sectionTitle, { color: "#ef4444" }]}>{t('recurringRedFlags')}</Text>
                  </View>
                  <View style={styles.redFlagsGrid}>
                    {stats.topRedFlags.map(([flag, count], index) => (
                      <View key={index} style={styles.redFlagChip}>
                        <Text style={styles.redFlagChipText}>{flag}</Text>
                        <View style={styles.redFlagCount}>
                          <Text style={styles.redFlagCountText}>{count}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
    paddingBottom: 80,
  },
  lockedIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#ffffff",
    textAlign: "center",
  },
  lockedDesc: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 22,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fbbf24",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#1a0a2e",
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: "rgba(30, 20, 60, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.12)",
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  overviewNumber: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#a78bfa",
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.45)",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  highlightCard: {
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.15)",
    padding: 20,
    gap: 8,
  },
  instigatorCard: {
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderColor: "rgba(245, 158, 11, 0.15)",
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#fbbf24",
    letterSpacing: 1,
  },
  highlightName: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#ffffff",
  },
  highlightStat: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  section: {
    gap: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#a78bfa",
    letterSpacing: 1,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(30, 20, 60, 0.4)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.08)",
  },
  personInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  personRank: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "rgba(255, 255, 255, 0.35)",
    width: 28,
  },
  personDetails: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#ffffff",
  },
  personMeta: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
  },
  personWinRate: {
    alignItems: "center",
    gap: 2,
  },
  personWinRateText: {
    fontSize: 18,
    fontWeight: "800" as const,
  },
  personWinRateLabel: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.35)",
    letterSpacing: 0.5,
  },
  patternRow: {
    gap: 8,
  },
  patternBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    overflow: "hidden",
  },
  patternBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  patternInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patternName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
  },
  patternCount: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#f59e0b",
  },
  redFlagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  redFlagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  redFlagChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#f87171",
  },
  redFlagCount: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  redFlagCountText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#ef4444",
  },
});
