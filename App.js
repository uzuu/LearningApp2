import { useMemo, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import NewLearning from "./components/NewLearning";
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

  const addLearningItem = (title) => {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
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
      createdAt: new Date().toISOString(),
      reviews,
    };

    setLearningItems((prev) => [...prev, newItem]);
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
            <Schedule {...props} learningItems={learningItems} isDark={isDark} />
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
