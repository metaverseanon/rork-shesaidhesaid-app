import React, { useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  Scale,
  Skull,
  ChevronRight,
  Sparkles,
  BarChart3,
  Zap,
} from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingSlide {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  bgColors: [string, string, string];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    icon: <Scale color="#a78bfa" size={48} />,
    title: "Settle Arguments\nOnce and For All",
    subtitle:
      "Upload a screenshot of any text argument and let AI be the judge. Fair, funny, and brutally honest.",
    accent: "#a78bfa",
    bgColors: ["#0a0118", "#1a0f2e", "#2d1b4e"],
  },
  {
    id: "modes",
    icon: <Skull color="#ef4444" size={48} />,
    title: "Choose Your\nJudging Style",
    subtitle:
      "Normal, Savage, Lawyer, Therapist, Comedy, or Gen Z — pick the vibe that fits your argument.",
    accent: "#ef4444",
    bgColors: ["#1a0505", "#2e0a0a", "#3d1111"],
  },
  {
    id: "insights",
    icon: <BarChart3 color="#10b981" size={48} />,
    title: "Track Your\nArgument Stats",
    subtitle:
      "Scoreboard, history, toxicity trends, and relationship insights. See who really wins the most.",
    accent: "#10b981",
    bgColors: ["#021a0f", "#0a2e1a", "#114e2d"],
  },
  {
    id: "start",
    icon: <Zap color="#fbbf24" size={48} />,
    title: "Ready to\nJudge?",
    subtitle:
      "Upload your first chat screenshot and get your verdict in seconds. May the best arguer win.",
    accent: "#fbbf24",
    bgColors: ["#1a1400", "#2e2200", "#4e3a00"],
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex];

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isLastSlide) {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.92,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [isLastSlide, currentIndex, onComplete, buttonScale]);

  const handleSkip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  }, [onComplete]);

  const renderSlide = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => {
      const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ];

      const iconScale = scrollX.interpolate({
        inputRange,
        outputRange: [0.5, 1, 0.5],
        extrapolate: "clamp",
      });

      const iconOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      });

      const textTranslateY = scrollX.interpolate({
        inputRange,
        outputRange: [40, 0, 40],
        extrapolate: "clamp",
      });

      const textOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      });

      return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
          <LinearGradient colors={item.bgColors} style={styles.slideGradient}>
            <View style={styles.slideContent}>
              <View style={styles.iconArea}>
                <Animated.View
                  style={[
                    styles.iconGlow,
                    {
                      backgroundColor: `${item.accent}15`,
                      borderColor: `${item.accent}30`,
                      transform: [{ scale: iconScale }],
                      opacity: iconOpacity,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconInner,
                      {
                        backgroundColor: `${item.accent}10`,
                        borderColor: `${item.accent}25`,
                      },
                    ]}
                  >
                    {item.icon}
                  </View>
                </Animated.View>

                {index === 0 && (
                  <Animated.View style={[styles.logoWrapper, { opacity: iconOpacity }]}>
                    <Image
                      source={{
                        uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ck2usccc253nb3nzwom89",
                      }}
                      style={styles.logoImage}
                      contentFit="contain"
                    />
                  </Animated.View>
                )}
              </View>

              <Animated.View
                style={[
                  styles.textArea,
                  {
                    transform: [{ translateY: textTranslateY }],
                    opacity: textOpacity,
                  },
                ]}
              >
                <Text style={[styles.slideTitle, { color: item.accent }]}>
                  {item.title}
                </Text>
                <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
              </Animated.View>
            </View>
          </LinearGradient>
        </View>
      );
    },
    [scrollX]
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        testID="onboarding-flatlist"
      />

      <View style={styles.bottomSection}>
        <LinearGradient
          colors={["transparent", currentSlide.bgColors[2]]}
          style={styles.bottomGradient}
        >
          <View style={styles.dotsContainer}>
            {SLIDES.map((slide, index) => {
              const dotWidth = scrollX.interpolate({
                inputRange: [
                  (index - 1) * SCREEN_WIDTH,
                  index * SCREEN_WIDTH,
                  (index + 1) * SCREEN_WIDTH,
                ],
                outputRange: [8, 28, 8],
                extrapolate: "clamp",
              });

              const dotOpacity = scrollX.interpolate({
                inputRange: [
                  (index - 1) * SCREEN_WIDTH,
                  index * SCREEN_WIDTH,
                  (index + 1) * SCREEN_WIDTH,
                ],
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={slide.id}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: currentSlide.accent,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.buttonsRow}>
            {!isLastSlide && (
              <TouchableOpacity
                onPress={handleSkip}
                activeOpacity={0.7}
                style={styles.skipButton}
                testID="onboarding-skip"
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}

            <Animated.View
              style={[
                styles.nextButtonWrapper,
                isLastSlide && styles.nextButtonWrapperFull,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                style={[
                  styles.nextButton,
                  { backgroundColor: currentSlide.accent },
                ]}
                testID="onboarding-next"
              >
                {isLastSlide ? (
                  <>
                    <Sparkles color="#000" size={20} />
                    <Text style={styles.startText}>Let's Go</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.nextText}>Next</Text>
                    <ChevronRight color="#000" size={20} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0118",
  },
  slide: {
    flex: 1,
  },
  slideGradient: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 160,
  },
  iconArea: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  iconGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoWrapper: {
    position: "absolute",
    top: -40,
    alignItems: "center",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  textArea: {
    alignItems: "center",
    gap: 16,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    paddingTop: 40,
    paddingBottom: Platform.OS === "web" ? 40 : 50,
    paddingHorizontal: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.45)",
  },
  nextButtonWrapper: {
    flex: 1,
  },
  nextButtonWrapperFull: {
    flex: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  nextText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#000",
  },
  startText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#000",
  },
});
