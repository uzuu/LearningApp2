import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import { buildFallbackExamples, fetchWordDetails } from "./wordDetails";

const LIGHT_COLORS = {
  bg: "#f4f8ff",
  panel: "#ffffff",
  primary: "#1d6fe8",
  accent: "#ff8a1f",
  text: "#183255",
  muted: "#6a82a3",
  border: "#d6e4ff",
  chipBg: "#eaf2ff",
};

const DARK_COLORS = {
  bg: "#0b1220",
  panel: "#142235",
  primary: "#4f9bff",
  accent: "#ff9f43",
  text: "#e9f2ff",
  muted: "#9fb3cf",
  border: "#28405e",
  chipBg: "#1b3150",
};

function SectionLabel({ children, styles }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function Newword({
  navigation,
  route,
  onDeleteEnglishWord,
  isDark,
}) {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const routeWords = route.params?.words || [];
  const dateLabel = route.params?.dateLabel || "";
  const [visibleWords, setVisibleWords] = useState(routeWords);
  const [detailsMap, setDetailsMap] = useState({});
  const [loadingIds, setLoadingIds] = useState([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const player = useAudioPlayer(currentAudioUrl, {
    downloadFirst: true,
  });

  const handlePlayAudio = async (audioUrl) => {
    if (!audioUrl) {
      return;
    }

    if (currentAudioUrl !== audioUrl) {
      setCurrentAudioUrl(audioUrl);
      return;
    }

    try {
      await player.seekTo(0);
    } catch {}
    player.play();
  };

  useEffect(() => {
    if (!currentAudioUrl) {
      return;
    }

    try {
      player.play();
    } catch {}
  }, [currentAudioUrl, player]);

  useEffect(() => {
    setVisibleWords(routeWords);
  }, [routeWords]);

  useEffect(() => {
    let active = true;
    const missingWords = visibleWords.filter((word) => !detailsMap[word.id]);

    if (!missingWords.length) {
      return undefined;
    }

    setLoadingIds((prev) => [
      ...new Set([...prev, ...missingWords.map((word) => word.id)]),
    ]);

    Promise.all(
      missingWords.map(async (word) => ({
        id: word.id,
        details: await fetchWordDetails(word.title),
      }))
    )
      .then((results) => {
        if (!active) {
          return;
        }

        setDetailsMap((prev) => {
          const next = { ...prev };
          results.forEach((result) => {
            next[result.id] = result.details;
          });
          return next;
        });
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoadingIds((prev) =>
          prev.filter((id) => !missingWords.some((word) => word.id === id))
        );
      });

    return () => {
      active = false;
    };
  }, [detailsMap, visibleWords]);

  const handleDeleteWord = (wordId) => {
    Alert.alert(
      "Delete word",
      "Are you sure you want to delete this word?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDeleteEnglishWord?.(wordId);
            setVisibleWords((prev) => prev.filter((word) => word.id !== wordId));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>New Word</Text>
        <Text style={styles.subtitle}>{dateLabel}</Text>
        <Pressable
          onPress={() =>
            navigation.navigate("NewWordTest", {
              words: visibleWords,
              dateLabel,
            })
          }
          style={({ pressed }) => [
            styles.testButton,
            pressed && styles.testButtonPressed,
          ]}
        >
          <Text style={styles.testButtonText}>Test</Text>
        </Pressable>
      </View>

      <FlatList
        data={visibleWords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No english words for this date.</Text>
        }
        renderItem={({ item, index }) => {
          const details = detailsMap[item.id];
          const isLoading = loadingIds.includes(item.id);

          return (
            <View style={styles.wordCard}>
              <View style={styles.wordHeader}>
                <Text style={styles.wordIndex}>{index + 1}</Text>
                <View style={styles.wordHeaderText}>
                  <Text style={styles.wordText}>{item.title}</Text>
                  <Text style={styles.translationText}>
                    {details?.translation || "Loading translation..."}
                  </Text>
                </View>
              </View>

              <View style={styles.chipRow}>
                <Text style={styles.pronunciationChip}>
                  {details?.pronunciation || "Loading pronunciation..."}
                </Text>
                {!!details?.audioUrl && (
                  <Pressable
                    onPress={() => handlePlayAudio(details.audioUrl)}
                    style={({ pressed }) => [
                      styles.audioButton,
                      pressed && styles.audioButtonPressed,
                    ]}
                  >
                    <Text style={styles.audioButtonIcon}>🔊</Text>
                  </Pressable>
                )}
              </View>

              {isLoading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>
                    Finding translation, pronunciation, and examples...
                  </Text>
                </View>
              )}

              <SectionLabel styles={styles}>English Definition</SectionLabel>
              <Text style={styles.definitionText}>
                {details?.englishDefinition || "Loading English definition..."}
              </Text>

              <SectionLabel styles={styles}>Synonyms</SectionLabel>
              <View style={styles.tagWrap}>
                {(details?.synonyms?.length
                  ? details.synonyms
                  : ["No synonyms found"]
                ).map((synonym, synonymIndex) => (
                  <View
                    key={`${item.id}-synonym-${synonymIndex}-${synonym}`}
                    style={styles.tagChip}
                  >
                    <Text style={styles.tagText}>{synonym}</Text>
                  </View>
                ))}
              </View>

              <SectionLabel styles={styles}>Usage</SectionLabel>
              <View style={styles.tagWrap}>
                {(details?.usageLabels?.length
                  ? details.usageLabels
                  : ["No usage label found"]
                ).map((label, labelIndex) => (
                  <View
                    key={`${item.id}-label-${labelIndex}-${label}`}
                    style={styles.tagChip}
                  >
                    <Text style={styles.tagText}>{label}</Text>
                  </View>
                ))}
              </View>
              {(details?.usageNotes?.length
                ? details.usageNotes
                : ["No usage note found"]
              ).map((note, noteIndex) => (
                <Text key={`${item.id}-usage-${noteIndex}`} style={styles.usageText}>
                  {note}
                </Text>
              ))}

              <SectionLabel styles={styles}>Example Sentences</SectionLabel>
              {(details?.exampleSentences || buildFallbackExamples()).map(
                (sentence, sentenceIndex) => (
                  <View
                    key={`${item.id}-${sentenceIndex}`}
                    style={styles.sentenceRow}
                  >
                    <Text style={styles.sentenceIndex}>{sentenceIndex + 1}.</Text>
                    <Text style={styles.sentenceText}>{sentence}</Text>
                  </View>
                )
              )}

              <SectionLabel styles={styles}>Illustrations</SectionLabel>
              {(details?.illustrations?.length
                ? details.illustrations
                : [{ id: `${item.id}-no-art`, caption: "No illustration found." }]
              ).map((illustration, illustrationIndex) => (
                <View
                  key={`${item.id}-illustration-${illustrationIndex}-${illustration.id || "fallback"}`}
                  style={styles.illustrationCard}
                >
                  {!!illustration.imageUrl && (
                    <Image
                      source={{ uri: illustration.imageUrl }}
                      style={styles.illustrationImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.illustrationText}>
                    {illustration.caption || "No illustration found."}
                  </Text>
                </View>
              ))}

              <Pressable
                onPress={() => handleDeleteWord(item.id)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          );
        }}
      />
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
    testButton: {
      marginTop: 12,
      alignSelf: "center",
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    testButtonPressed: {
      opacity: 0.9,
    },
    testButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 14,
    },
    listContent: {
      gap: 12,
      paddingBottom: 20,
    },
    wordCard: {
      backgroundColor: colors.panel,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    wordHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    wordHeaderText: {
      flex: 1,
    },
    wordIndex: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      color: "#fff",
      textAlign: "center",
      textAlignVertical: "center",
      fontWeight: "800",
      overflow: "hidden",
    },
    wordText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
    },
    translationText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
      marginTop: 2,
    },
    chipRow: {
      marginTop: 10,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    pronunciationChip: {
      alignSelf: "flex-start",
      backgroundColor: colors.chipBg,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      fontWeight: "700",
    },
    audioButton: {
      backgroundColor: colors.accent,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    audioButtonPressed: {
      opacity: 0.9,
    },
    audioButtonIcon: {
      fontSize: 16,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 8,
      marginTop: 2,
    },
    definitionText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 12,
    },
    tagWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10,
    },
    tagChip: {
      backgroundColor: colors.chipBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 12,
    },
    usageText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 8,
    },
    sentenceRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 8,
    },
    sentenceIndex: {
      color: colors.accent,
      fontWeight: "800",
      minWidth: 16,
    },
    sentenceText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      flex: 1,
    },
    illustrationCard: {
      backgroundColor: colors.chipBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    illustrationImage: {
      width: "100%",
      height: 180,
      borderRadius: 10,
      backgroundColor: colors.panel,
      marginBottom: 10,
    },
    illustrationText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    emptyText: {
      color: colors.muted,
      textAlign: "center",
      backgroundColor: colors.panel,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 20,
    },
    deleteButton: {
      marginTop: 8,
      alignSelf: "flex-start",
      backgroundColor: "#d64545",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    deleteButtonPressed: {
      opacity: 0.9,
    },
    deleteButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
    },
  });
}
