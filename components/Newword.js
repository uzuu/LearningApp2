import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";

const LIGHT_COLORS = {
  bg: "#f4f8ff",
  panel: "#ffffff",
  primary: "#1d6fe8",
  accent: "#ff8a1f",
  text: "#183255",
  muted: "#6a82a3",
  border: "#d6e4ff",
  chipBg: "#eaf2ff",
  warningBg: "#fff4e8",
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
  warningBg: "#2a2218",
};

const MERRIAM_API_KEYS = [
  process.env.EXPO_PUBLIC_MW_API_KEY,
  process.env.EXPO_PUBLIC_MW_API_KEY_SECONDARY,
].filter(Boolean);
const AZURE_TRANSLATOR_KEYS = [
  process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_KEY,
  process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_KEY_SECONDARY,
].filter(Boolean);
const AZURE_TRANSLATOR_REGION =
  process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_REGION || "";
const AZURE_TRANSLATOR_ENDPOINT =
  process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_ENDPOINT ||
  "https://api.cognitive.microsofttranslator.com";
const MERRIAM_DICTIONARY_BASE_URL =
  "https://www.dictionaryapi.com/api/v3/references/collegiate/json";
const MERRIAM_THESAURUS_BASE_URL =
  "https://www.dictionaryapi.com/api/v3/references/thesaurus/json";

function buildFallbackExamples() {
  return Array.from({ length: 3 }, () => "No example sentence found.");
}

function buildMerriamAudioUrl(audioFile) {
  if (!audioFile) {
    return "";
  }

  let subdirectory = audioFile[0];
  if (audioFile.startsWith("bix")) {
    subdirectory = "bix";
  } else if (audioFile.startsWith("gg")) {
    subdirectory = "gg";
  } else if (/^[0-9_]/.test(audioFile)) {
    subdirectory = "number";
  }

  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audioFile}.mp3`;
}

function buildMerriamIllustrationUrl(artId) {
  if (!artId) {
    return "";
  }

  return `https://www.merriam-webster.com/assets/mw/static/art/dict/${artId}.gif`;
}

function cleanMwText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\{bc\}/g, ": ")
    .replace(/\{ldquo\}|\{rdquo\}/g, '"')
    .replace(/\{it\}|\{\/it\}|\{sc\}|\{\/sc\}|\{b\}|\{\/b\}|\{inf\}|\{\/inf\}|\{sup\}|\{\/sup\}/g, "")
    .replace(/\{dx\|([^}|]+)\|?[^}]*\}/g, "$1")
    .replace(/\{sx\|([^}|]+)\|?[^}]*\}/g, "$1")
    .replace(/\{d_link\|([^}|]+)\|?[^}]*\}/g, "$1")
    .replace(/\{a_link\|([^}|]+)\|?[^}]*\}/g, "$1")
    .replace(/\{et_link\|([^}|]+)\|?[^}]*\}/g, "$1")
    .replace(/\{i_link\|([^}|]+)\|?[^}]*\}/g, "$1")
    .replace(/\{phrase\|([^}|]+)\}/g, "$1")
    .replace(/\{qword\|([^}|]+)\}/g, "$1")
    .replace(/\{wi\|([^}|]+)\}/g, "$1")
    .replace(/\{gloss\|([^}|]+)\}/g, "($1)")
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDtTexts(dtList, acceptedTags) {
  return (dtList || [])
    .filter((item) => acceptedTags.includes(item?.[0]))
    .flatMap((item) => {
      if (item[0] === "vis") {
        return (item[1] || []).map((usage) => cleanMwText(usage?.t)).filter(Boolean);
      }

      if (Array.isArray(item[1])) {
        return item[1].map((child) => cleanMwText(child?.t || child)).filter(Boolean);
      }

      return [cleanMwText(item[1])].filter(Boolean);
    });
}

function extractIllustrations(entries) {
  const topLevel = entries
    .map((entry) => entry?.art)
    .map((art) => ({
      id: art?.artid || `${art?.capt || ""}-${art?.ilstr || ""}`,
      caption: cleanMwText(art?.capt || art?.text || ""),
      imageUrl: buildMerriamIllustrationUrl(art?.artid),
    }))
    .filter((item) => item.id || item.caption);

  return topLevel.slice(0, 3);
}

async function fetchMerriamJson(baseUrl, word) {
  if (!MERRIAM_API_KEYS.length) {
    throw new Error("Missing Merriam-Webster API key.");
  }

  let data = null;
  let lastError = null;

  for (const apiKey of MERRIAM_API_KEYS) {
    try {
      const response = await fetch(
        `${baseUrl}/${encodeURIComponent(word)}?key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error("Merriam request failed.");
      }

      data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (!data) {
    throw lastError || new Error("Merriam request failed.");
  }

  return Array.isArray(data) ? data : [];
}

async function fetchTranslation(word) {
  if (!AZURE_TRANSLATOR_KEYS.length) {
    throw new Error("Missing Azure Translator key.");
  }
  let lastError = null;

  for (const apiKey of AZURE_TRANSLATOR_KEYS) {
    try {
      const response = await fetch(
        `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&from=en&to=mn-Cyrl`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
            ...(AZURE_TRANSLATOR_REGION
              ? { "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{ Text: word }]),
        }
      );

      if (!response.ok) {
        throw new Error("Translation request failed.");
      }

      const data = await response.json();
      return data?.[0]?.translations?.[0]?.text || "No translation found";
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Translation request failed.");
}

async function fetchDictionaryDetails(word) {
  const data = await fetchMerriamJson(MERRIAM_DICTIONARY_BASE_URL, word);
  const entries = Array.isArray(data) ? data : [];
  const dictionaryEntries = entries.filter(
    (entry) => entry && typeof entry === "object" && !Array.isArray(entry)
  );

  const primaryEntry = dictionaryEntries[0];
  const primaryPronunciation = primaryEntry?.hwi?.prs?.[0];
  const phonetic = primaryPronunciation?.mw || "No pronunciation found";
  const audioUrl = buildMerriamAudioUrl(primaryPronunciation?.sound?.audio);

  const englishDefinition =
    cleanMwText(primaryEntry?.shortdef?.find(Boolean)) ||
    "No English definition found";

  const usageLabels = [
    cleanMwText(primaryEntry?.fl || ""),
    ...(primaryEntry?.lbs || []).map(cleanMwText),
    ...(primaryEntry?.sls || []).map(cleanMwText),
  ].filter(Boolean);

  const examples = dictionaryEntries
    .flatMap((entry) => entry?.def || [])
    .flatMap((definitionGroup) => definitionGroup?.sseq || [])
    .flatMap((senseGroup) => senseGroup || [])
    .map((senseItem) => senseItem?.[1])
    .map((senseData) => senseData?.dt || [])
    .flatMap((definitionText) => definitionText || [])
    .filter((detail) => detail?.[0] === "vis")
    .flatMap((detail) => detail?.[1] || [])
    .map((usage) => cleanMwText(usage?.t))
    .filter(Boolean);

  const uniqueExamples = [...new Set(examples)].slice(0, 3);
  while (uniqueExamples.length < 3) {
    uniqueExamples.push("No example sentence found.");
  }

  const usageNotes = dictionaryEntries
    .flatMap((entry) => entry?.def || [])
    .flatMap((definitionGroup) => definitionGroup?.sseq || [])
    .flatMap((senseGroup) => senseGroup || [])
    .map((senseItem) => senseItem?.[1])
    .map((senseData) => senseData?.dt || [])
    .flatMap((dt) => [
      ...extractDtTexts(dt, ["uns"]),
      ...extractDtTexts(dt, ["text"]).filter((text) =>
        /usage|used|often|especially|chiefly|formal|informal|slang/i.test(text)
      ),
    ]);

  const uniqueUsageNotes = [...new Set(usageNotes)].slice(0, 3);
  const illustrations = extractIllustrations(dictionaryEntries);

  return {
    englishDefinition,
    pronunciation: phonetic,
    audioUrl,
    exampleSentences: uniqueExamples,
    usageLabels,
    usageNotes: uniqueUsageNotes,
    illustrations,
  };
}

async function fetchThesaurusDetails(word) {
  const data = await fetchMerriamJson(MERRIAM_THESAURUS_BASE_URL, word);
  const entries = data.filter(
    (entry) => entry && typeof entry === "object" && !Array.isArray(entry)
  );
  const synonyms = entries
    .flatMap((entry) => entry?.meta?.syns || [])
    .flatMap((group) => group || [])
    .map(cleanMwText)
    .filter(Boolean);

  return {
    synonyms: [...new Set(synonyms)].slice(0, 8),
  };
}

async function fetchWordDetails(word) {
  const [translationResult, dictionaryResult, thesaurusResult] =
    await Promise.allSettled([
    fetchTranslation(word),
    fetchDictionaryDetails(word),
    fetchThesaurusDetails(word),
  ]);

  const translation =
    translationResult.status === "fulfilled"
      ? translationResult.value
      : "No translation found";
  const pronunciation =
    dictionaryResult.status === "fulfilled"
      ? dictionaryResult.value.pronunciation
      : "No pronunciation found";
  const englishDefinition =
    dictionaryResult.status === "fulfilled"
      ? dictionaryResult.value.englishDefinition
      : "No English definition found";
  const audioUrl =
    dictionaryResult.status === "fulfilled" ? dictionaryResult.value.audioUrl : "";
  const exampleSentences =
    dictionaryResult.status === "fulfilled"
      ? dictionaryResult.value.exampleSentences
      : buildFallbackExamples();
  const usageLabels =
    dictionaryResult.status === "fulfilled"
      ? dictionaryResult.value.usageLabels
      : [];
  const usageNotes =
    dictionaryResult.status === "fulfilled"
      ? dictionaryResult.value.usageNotes
      : [];
  const illustrations =
    dictionaryResult.status === "fulfilled"
      ? dictionaryResult.value.illustrations
      : [];
  const synonyms =
    thesaurusResult.status === "fulfilled" ? thesaurusResult.value.synonyms : [];

  return {
    translation,
    englishDefinition,
    pronunciation,
    audioUrl,
    exampleSentences,
    usageLabels,
    usageNotes,
    illustrations,
    synonyms,
    hasLookupError:
      translationResult.status === "rejected" ||
      dictionaryResult.status === "rejected" ||
      thesaurusResult.status === "rejected",
  };
}

function SectionLabel({ children, styles }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function Newword({ route, isDark }) {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const words = route.params?.words || [];
  const dateLabel = route.params?.dateLabel || "";
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
    let active = true;
    const missingWords = words.filter((word) => !detailsMap[word.id]);

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
  }, [detailsMap, words]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>New Word</Text>
        <Text style={styles.subtitle}>{dateLabel}</Text>
      </View>

      <FlatList
        data={words}
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
  });
}
