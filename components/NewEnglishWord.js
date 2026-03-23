import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  inputBg: "#f8fbff",
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
  inputBg: "#0f1b2c",
  chipBg: "#1b3150",
};

function SectionLabel({ children, styles }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function NewEnglishWord({ onAddEnglishWord, isDark }) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedPreview, setSavedPreview] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const player = useAudioPlayer(currentAudioUrl, {
    downloadFirst: true,
  });

  const handleAdd = async () => {
    const trimmedTitle = title.trim();
    const added = onAddEnglishWord({ title: trimmedTitle });
    if (!added) {
      if (!trimmedTitle) {
        setFeedbackMessage("Please enter a word first.");
        return;
      }

      setIsSaving(true);
      setSavedPreview(null);
      setFeedbackMessage("This word is already saved.");

      try {
        const details = await fetchWordDetails(trimmedTitle);
        setSavedPreview({
          title: trimmedTitle,
          ...details,
        });
      } catch {
        setSavedPreview({
          title: trimmedTitle,
          translation: "No translation found",
          pronunciation: "No pronunciation found",
          englishDefinition: "No English definition found",
          exampleSentences: buildFallbackExamples(),
          usageLabels: [],
          usageNotes: [],
          synonyms: [],
          illustrations: [],
          audioUrl: "",
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    setSavedPreview(null);
    setFeedbackMessage("");

    try {
      const details = await fetchWordDetails(trimmedTitle);
      setSavedPreview({
        title: trimmedTitle,
        ...details,
      });
    } catch {
      setSavedPreview({
        title: trimmedTitle,
        translation: "No translation found",
        pronunciation: "No pronunciation found",
        englishDefinition: "No English definition found",
        exampleSentences: buildFallbackExamples(),
        usageLabels: [],
        usageNotes: [],
        synonyms: [],
        illustrations: [],
        audioUrl: "",
      });
    } finally {
      setIsSaving(false);
      setTitle("");
    }
  };

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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.title}>English Word</Text>
          <Text style={styles.caption}>
            Enter only the word. The app will save it and show the same preview
            style as New Word below.
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter an english word"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
          />

          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              isSaving && styles.saveButtonDisabled,
            ]}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>Save English Word</Text>
          </Pressable>

          {!!feedbackMessage && (
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          )}

          {isSaving && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching word details...</Text>
            </View>
          )}

          {savedPreview && (
            <View style={styles.wordCard}>
              <View style={styles.wordHeader}>
                <Text style={styles.wordIndex}>1</Text>
                <View style={styles.wordHeaderText}>
                  <Text style={styles.wordText}>{savedPreview.title}</Text>
                  <Text style={styles.translationText}>
                    {savedPreview.translation}
                  </Text>
                </View>
              </View>

              <View style={styles.chipRow}>
                <Text style={styles.pronunciationChip}>
                  {savedPreview.pronunciation}
                </Text>
                {!!savedPreview.audioUrl && (
                  <Pressable
                    onPress={() => handlePlayAudio(savedPreview.audioUrl)}
                    style={({ pressed }) => [
                      styles.audioButton,
                      pressed && styles.audioButtonPressed,
                    ]}
                  >
                    <Text style={styles.audioButtonIcon}>🔊</Text>
                  </Pressable>
                )}
              </View>

              <SectionLabel styles={styles}>English Definition</SectionLabel>
              <Text style={styles.definitionText}>
                {savedPreview.englishDefinition}
              </Text>

              <SectionLabel styles={styles}>Synonyms</SectionLabel>
              <View style={styles.tagWrap}>
                {(savedPreview.synonyms?.length
                  ? savedPreview.synonyms
                  : ["No synonyms found"]
                ).map((synonym, synonymIndex) => (
                  <View
                    key={`preview-synonym-${synonymIndex}-${synonym}`}
                    style={styles.tagChip}
                  >
                    <Text style={styles.tagText}>{synonym}</Text>
                  </View>
                ))}
              </View>

              <SectionLabel styles={styles}>Usage</SectionLabel>
              <View style={styles.tagWrap}>
                {(savedPreview.usageLabels?.length
                  ? savedPreview.usageLabels
                  : ["No usage label found"]
                ).map((label, labelIndex) => (
                  <View
                    key={`preview-label-${labelIndex}-${label}`}
                    style={styles.tagChip}
                  >
                    <Text style={styles.tagText}>{label}</Text>
                  </View>
                ))}
              </View>
              {(savedPreview.usageNotes?.length
                ? savedPreview.usageNotes
                : ["No usage note found"]
              ).map((note, noteIndex) => (
                <Text key={`preview-usage-${noteIndex}`} style={styles.usageText}>
                  {note}
                </Text>
              ))}

              <SectionLabel styles={styles}>Example Sentences</SectionLabel>
              {(savedPreview.exampleSentences || buildFallbackExamples()).map(
                (sentence, sentenceIndex) => (
                  <View
                    key={`preview-example-${sentenceIndex}`}
                    style={styles.sentenceRow}
                  >
                    <Text style={styles.sentenceIndex}>{sentenceIndex + 1}.</Text>
                    <Text style={styles.sentenceText}>{sentence}</Text>
                  </View>
                )
              )}

              <SectionLabel styles={styles}>Illustrations</SectionLabel>
              {(savedPreview.illustrations?.length
                ? savedPreview.illustrations
                : [{ id: "preview-no-art", caption: "No illustration found." }]
              ).map((illustration, illustrationIndex) => (
                <View
                  key={`preview-illustration-${illustrationIndex}-${illustration.id || "fallback"}`}
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
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      padding: 14,
      paddingBottom: 28,
    },
    card: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primary,
      textAlign: "center",
    },
    caption: {
      textAlign: "center",
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    saveButton: {
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    pressed: {
      opacity: 0.9,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 8,
    },
    loadingText: {
      color: colors.muted,
      fontWeight: "600",
    },
    feedbackText: {
      color: colors.accent,
      textAlign: "center",
      fontWeight: "700",
      marginTop: 2,
    },
    wordCard: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
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
  });
}
