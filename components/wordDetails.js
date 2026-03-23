import AsyncStorage from "@react-native-async-storage/async-storage";

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
const WORD_DETAILS_CACHE_KEY = "wordDetailsCache";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let memoryCache = null;

export function buildFallbackExamples() {
  return Array.from({ length: 3 }, () => "No example sentence found.");
}

function buildCacheKey(word) {
  return String(word || "").trim().toLowerCase();
}

async function loadWordDetailsCache() {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    const storedCache = await AsyncStorage.getItem(WORD_DETAILS_CACHE_KEY);
    memoryCache = storedCache ? JSON.parse(storedCache) : {};
  } catch {
    memoryCache = {};
  }

  return memoryCache;
}

async function saveWordDetailsCache(cache) {
  memoryCache = cache;
  try {
    await AsyncStorage.setItem(WORD_DETAILS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function isCacheEntryFresh(entry) {
  if (!entry?.savedAt) {
    return false;
  }

  const savedAt = new Date(entry.savedAt).getTime();
  if (Number.isNaN(savedAt)) {
    return false;
  }

  return Date.now() - savedAt < CACHE_MAX_AGE_MS;
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
    .replace(
      /\{it\}|\{\/it\}|\{sc\}|\{\/sc\}|\{b\}|\{\/b\}|\{inf\}|\{\/inf\}|\{sup\}|\{\/sup\}/g,
      ""
    )
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
        return (item[1] || [])
          .map((usage) => cleanMwText(usage?.t))
          .filter(Boolean);
      }

      if (Array.isArray(item[1])) {
        return item[1]
          .map((child) => cleanMwText(child?.t || child))
          .filter(Boolean);
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

export async function fetchWordDetails(word) {
  const cacheKey = buildCacheKey(word);
  const cache = await loadWordDetailsCache();
  if (cache[cacheKey] && isCacheEntryFresh(cache[cacheKey])) {
    return cache[cacheKey];
  }

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

  const details = {
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

  await saveWordDetailsCache({
    ...cache,
    [cacheKey]: {
      ...details,
      savedAt: new Date().toISOString(),
    },
  });

  return details;
}
