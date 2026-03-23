import { useEffect, useMemo, useRef, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import NewEnglishWord from "./components/NewEnglishWord";
import NewLearning from "./components/NewLearning";
import Newword from "./components/Newword";
import NewWordTest from "./components/NewWordTest";
import Schedule from "./components/Schedule";

const Stack = createNativeStackNavigator();
const REVIEW_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];
const LEARNING_STORAGE_KEY = "learningItems";
const ENGLISH_WORD_STORAGE_KEY = "englishWords";

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default function App() {
  const [learningItems, setLearningItems] = useState([]);
  const [englishWords, setEnglishWords] = useState([]);
  const hasLoadedStorage = useRef(false);
  const colorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(
    colorScheme === "dark" ? "dark" : "light"
  );
  const isDark = themeMode === "dark";

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: isDark ? "#0b1220" : "#f4f8ff",
        card: isDark ? "#122033" : "#1d6fe8",
        text: "#ffffff",
        border: isDark ? "#1d2e46" : "#1559bb",
        primary: isDark ? "#4f9bff" : "#1d6fe8",
      },
    };
  }, [isDark]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const [storedLearningItems, storedEnglishWords] = await Promise.all([
          AsyncStorage.getItem(LEARNING_STORAGE_KEY),
          AsyncStorage.getItem(ENGLISH_WORD_STORAGE_KEY),
        ]);

        if (storedLearningItems) {
          setLearningItems(JSON.parse(storedLearningItems));
        }

        if (storedEnglishWords) {
          setEnglishWords(JSON.parse(storedEnglishWords));
        }
      } catch (error) {
        console.warn("Failed to load stored data.", error);
      } finally {
        hasLoadedStorage.current = true;
      }
    };

    loadStoredData();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage.current) {
      return;
    }

    AsyncStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(learningItems)).catch(
      (error) => {
        console.warn("Failed to save learning items.", error);
      }
    );
  }, [learningItems]);

  useEffect(() => {
    if (!hasLoadedStorage.current) {
      return;
    }

    AsyncStorage.setItem(
      ENGLISH_WORD_STORAGE_KEY,
      JSON.stringify(englishWords)
    ).catch((error) => {
      console.warn("Failed to save english words.", error);
    });
  }, [englishWords]);

  const addLearningItem = ({
    title,
    startHour,
    startMinute,
    endHour,
    endMinute,
  }) => {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      return false;
    }

    const parsedStartHour = Number.parseInt(startHour || "0", 10);
    const parsedStartMinute = Number.parseInt(startMinute || "0", 10);
    const parsedEndHour = Number.parseInt(endHour || "0", 10);
    const parsedEndMinute = Number.parseInt(endMinute || "0", 10);

    const safeStartHour = Number.isNaN(parsedStartHour)
      ? 0
      : Math.min(Math.max(parsedStartHour, 0), 23);
    const safeStartMinute = Number.isNaN(parsedStartMinute)
      ? 0
      : Math.min(Math.max(parsedStartMinute, 0), 59);
    const safeEndHour = Number.isNaN(parsedEndHour)
      ? 0
      : Math.min(Math.max(parsedEndHour, 0), 23);
    const safeEndMinute = Number.isNaN(parsedEndMinute)
      ? 0
      : Math.min(Math.max(parsedEndMinute, 0), 59);

    const startTotalMinutes = safeStartHour * 60 + safeStartMinute;
    const endTotalMinutes = safeEndHour * 60 + safeEndMinute;
    if (endTotalMinutes <= startTotalMinutes) {
      return false;
    }

    const baseDate = normalizeDate(new Date());
    const reviews = REVIEW_INTERVALS.map((days) => ({
      dayOffset: days,
      date: addDays(baseDate, days).toISOString(),
    }));

    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanedTitle,
      type: "learning",
      createdAt: new Date().toISOString(),
      reviewTimeRange: {
        startHour: safeStartHour,
        startMinute: safeStartMinute,
        endHour: safeEndHour,
        endMinute: safeEndMinute,
      },
      reviews,
    };

    setLearningItems((prev) => [...prev, newItem]);
    return true;
  };

  const addEnglishWord = ({ title }) => {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      return false;
    }

    const normalizedTitle = cleanedTitle.toLowerCase();
    const alreadyExists = englishWords.some(
      (word) => word.title.trim().toLowerCase() === normalizedTitle
    );

    if (alreadyExists) {
      return false;
    }

    const baseDate = normalizeDate(new Date());
    const reviews = REVIEW_INTERVALS.map((days) => ({
      dayOffset: days,
      date: addDays(baseDate, days).toISOString(),
    }));

    const newWord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanedTitle,
      createdAt: new Date().toISOString(),
      order: englishWords.length,
      type: "english-word",
      reviews,
    };

    setEnglishWords((prev) => [...prev, newWord]);
    return true;
  };

  const deleteLearningItem = (itemId) => {
    setLearningItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const deleteEnglishWord = (wordId) => {
    setEnglishWords((prev) => prev.filter((word) => word.id !== wordId));
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Schedule"
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? "#122033" : "#1d6fe8" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
          headerBackTitleVisible: false,
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={styles.toggleButton}>
              <Text style={styles.toggleText}>{isDark ? "Light" : "Dark"}</Text>
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="Schedule">
          {(props) => (
            <Schedule
              {...props}
              learningItems={learningItems}
              englishWords={englishWords}
              onDeleteLearningItem={deleteLearningItem}
              isDark={isDark}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="NewLearning"
          options={{ title: "Add New Learning" }}
        >
          {(props) => (
            <NewLearning
              {...props}
              onAddLearningItem={addLearningItem}
              isDark={isDark}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="EnglishWord"
          options={{ title: "English Word" }}
        >
          {(props) => (
            <NewEnglishWord
              {...props}
              onAddEnglishWord={addEnglishWord}
              isDark={isDark}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Newword" options={{ title: "New Word" }}>
          {(props) => (
            <Newword
              {...props}
              onDeleteEnglishWord={deleteEnglishWord}
              isDark={isDark}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="NewWordTest" options={{ title: "New Word Test" }}>
          {(props) => <NewWordTest {...props} isDark={isDark} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  toggleText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});
