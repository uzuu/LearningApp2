import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
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
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Schedule">
        <Stack.Screen name="Schedule">
          {(props) => <Schedule {...props} learningItems={learningItems} />}
        </Stack.Screen>
        <Stack.Screen name="NewLearning">
          {(props) => (
            <NewLearning {...props} onAddLearningItem={addLearningItem} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
