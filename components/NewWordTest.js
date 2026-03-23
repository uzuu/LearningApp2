import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchWordDetails } from "./wordDetails";

const LIGHT_COLORS = {
  bg: "#f4f8ff",
  panel: "#ffffff",
  primary: "#1d6fe8",
  accent: "#ff8a1f",
  text: "#183255",
  muted: "#6a82a3",
  border: "#d6e4ff",
  success: "#1f8b4c",
  danger: "#d64545",
};

const DARK_COLORS = {
  bg: "#0b1220",
  panel: "#142235",
  primary: "#4f9bff",
  accent: "#ff9f43",
  text: "#e9f2ff",
  muted: "#9fb3cf",
  border: "#28405e",
  success: "#33b36b",
  danger: "#ff6b6b",
};

function buildQuizOptions(items, currentItem, currentIndex) {
  if (items.length <= 4) {
    return items;
  }

  const others = items.filter((item) => item.id !== currentItem.id);
  const startIndex = currentIndex % others.length;
  const rotated = [...others.slice(startIndex), ...others.slice(0, startIndex)];
  return [currentItem, ...rotated.slice(0, 3)].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

export default function NewWordTest({ route, isDark }) {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const words = route.params?.words || [];
  const dateLabel = route.params?.dateLabel || "";
  const [detailsMap, setDetailsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [missedIds, setMissedIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    Promise.all(
      words.map(async (word) => ({
        id: word.id,
        details: await fetchWordDetails(word.title),
      }))
    )
      .then((results) => {
        if (!active) {
          return;
        }

        const nextMap = {};
        results.forEach((result) => {
          nextMap[result.id] = result.details;
        });
        setDetailsMap(nextMap);
        const initialQueue = words.map((word) => word.id);
        setQueue(initialQueue);
        setMissedIds([]);
        setCurrentIndex(0);
        setSelectedOptionId(null);
        setCorrectOptionId(null);
        setFinished(initialQueue.length === 0);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [words]);

  const quizItems = useMemo(
    () =>
      words.map((word) => ({
        ...word,
        definition:
          detailsMap[word.id]?.englishDefinition || "No English definition found",
      })),
    [detailsMap, words]
  );

  const currentWordId = queue[currentIndex];
  const currentItem =
    quizItems.find((item) => item.id === currentWordId) || quizItems[0] || null;
  const options = currentItem
    ? buildQuizOptions(quizItems, currentItem, currentIndex)
    : [];

  const handleAdvance = (nextMissedIds) => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setCorrectOptionId(null);
      return;
    }

    if (nextMissedIds.length) {
      setQueue(nextMissedIds);
      setMissedIds([]);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setCorrectOptionId(null);
      return;
    }

    setFinished(true);
  };

  const handleSelectOption = (optionId) => {
    if (!currentItem || selectedOptionId) {
      return;
    }

    const isCorrect = optionId === currentItem.id;
    const nextMissedIds = isCorrect
      ? missedIds
      : [...new Set([...missedIds, currentItem.id])];

    setSelectedOptionId(optionId);
    setCorrectOptionId(currentItem.id);
    setMissedIds(nextMissedIds);

    setTimeout(() => {
      handleAdvance(nextMissedIds);
    }, 900);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing your test...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerCard}>
          <Text style={styles.finishedTitle}>Finished</Text>
          <Text style={styles.finishedSubtitle}>
            You answered all words correctly.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentItem) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerCard}>
          <Text style={styles.finishedTitle}>No Test Data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>New Word Test</Text>
        <Text style={styles.subtitle}>{dateLabel}</Text>
        <Text style={styles.progressText}>
          Question {currentIndex + 1} / {queue.length}
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>Definition</Text>
        <Text style={styles.questionText}>{currentItem.definition}</Text>
      </View>

      <View style={styles.optionsWrap}>
        {options.map((option, optionIndex) => {
          const isCorrect = correctOptionId === option.id;
          const isWrongSelected =
            selectedOptionId === option.id && correctOptionId !== option.id;

          return (
            <Pressable
              key={`${option.id}-${optionIndex}`}
              onPress={() => handleSelectOption(option.id)}
              style={({ pressed }) => [
                styles.optionButton,
                isCorrect && styles.optionButtonCorrect,
                isWrongSelected && styles.optionButtonWrong,
                pressed && !selectedOptionId && styles.optionButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  isCorrect && styles.optionTextCorrect,
                  isWrongSelected && styles.optionTextWrong,
                ]}
              >
                {option.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 14,
    },
    headerCard: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    title: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: "800",
      textAlign: "center",
    },
    subtitle: {
      color: colors.muted,
      textAlign: "center",
      marginTop: 4,
      fontSize: 14,
      fontWeight: "600",
    },
    progressText: {
      marginTop: 10,
      textAlign: "center",
      color: colors.accent,
      fontWeight: "800",
    },
    questionCard: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    questionLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    questionText: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 28,
      fontWeight: "700",
    },
    optionsWrap: {
      gap: 10,
    },
    optionButton: {
      backgroundColor: colors.panel,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      paddingHorizontal: 14,
    },
    optionButtonPressed: {
      opacity: 0.92,
    },
    optionButtonCorrect: {
      borderColor: colors.success,
      backgroundColor: `${colors.success}18`,
    },
    optionButtonWrong: {
      borderColor: colors.danger,
      backgroundColor: `${colors.danger}18`,
    },
    optionText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    optionTextCorrect: {
      color: colors.success,
    },
    optionTextWrong: {
      color: colors.danger,
    },
    centerCard: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 12,
    },
    loadingText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    finishedTitle: {
      color: colors.success,
      fontSize: 28,
      fontWeight: "800",
    },
    finishedSubtitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
  });
}
