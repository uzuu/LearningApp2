import { useMemo, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import NewEnglishWord from "./components/NewEnglishWord";
import NewLearning from "./components/NewLearning";
import RepeatEnglish from "./components/RepeatEnglish";
import Schedule from "./components/Schedule";

const Stack = createNativeStackNavigator();
const REVIEW_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

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

    const baseDate = normalizeDate(new Date());
    const reviews = REVIEW_INTERVALS.map((days) => ({
      dayOffset: days,
      date: addDays(baseDate, days).toISOString(),
    }));

    const newWord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanedTitle,
      createdAt: new Date().toISOString(),
      type: "english-word",
      reviewTimeRange: {
        startHour: 0,
        startMinute: 0,
        endHour: 0,
        endMinute: 30,
      },
      reviews,
    };

    setEnglishWords((prev) => [...prev, newWord]);
    return true;
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
        <Stack.Screen
          name="RepeatEnglish"
          options={{ title: "Repeat English" }}
        >
          {(props) => <RepeatEnglish {...props} isDark={isDark} />}
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
