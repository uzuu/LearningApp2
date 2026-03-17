import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INTERVALS = "1, 2, 4, 8, 16, 32, 64, 128";

const LIGHT_COLORS = {
  bg: "#f4f8ff",
  panel: "#ffffff",
  primary: "#1d6fe8",
  accent: "#ff8a1f",
  text: "#183255",
  muted: "#6a82a3",
  border: "#d6e4ff",
  inputBg: "#f8fbff",
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
};

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    hour,
    minute,
  };
});

function formatTimeLabel(hourText, minuteText) {
  const rawHour = hourText === "" ? 0 : Number.parseInt(hourText, 10);
  const rawMinute = minuteText === "" ? 0 : Number.parseInt(minuteText, 10);
  const safeHour = Number.isNaN(rawHour) ? 0 : rawHour;
  const safeMinute = Number.isNaN(rawMinute) ? 0 : rawMinute;
  const period = safeHour >= 12 ? "pm" : "am";
  const hour12 = safeHour % 12 === 0 ? 12 : safeHour % 12;
  return `${hour12}:${String(safeMinute).padStart(2, "0")}${period}`;
}

export default function NewLearning({ navigation, onAddLearningItem, isDark }) {
  const [title, setTitle] = useState("");
  const [startHour, setStartHour] = useState("0");
  const [startMinute, setStartMinute] = useState("0");
  const [endHour, setEndHour] = useState("0");
  const [endMinute, setEndMinute] = useState("30");
  const [focused, setFocused] = useState(false);
  const [openPicker, setOpenPicker] = useState(null);
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectTime = (type, hour, minute) => {
    if (type === "start") {
      setStartHour(String(hour));
      setStartMinute(String(minute));
    } else {
      setEndHour(String(hour));
      setEndMinute(String(minute));
    }
    setOpenPicker(null);
  };

  const handleAdd = () => {
    const added = onAddLearningItem({
      title,
      startHour,
      startMinute,
      endHour,
      endMinute,
    });
    if (!added) {
      return;
    }

    setTitle("");
    setStartHour("0");
    setStartMinute("0");
    setEndHour("0");
    setEndMinute("30");
    navigation.navigate("Schedule");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.card}>
        <Text style={styles.title}>Add New Learning</Text>
        <Text style={styles.caption}>
          Reviews will be scheduled on: {INTERVALS} days
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter what you learned"
          placeholderTextColor={colors.muted}
          style={[styles.input, focused && styles.inputFocused]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        <View style={styles.durationRow}>
          <View style={styles.durationField}>
            <Text style={styles.fieldLabel}>Start Time</Text>
            <Pressable
              onPress={() =>
                setOpenPicker((current) => (current === "start" ? null : "start"))
              }
              style={[
                styles.timeSelector,
                openPicker === "start" && styles.timeSelectorActive,
              ]}
            >
              <Text style={styles.timeSelectorText}>
                {formatTimeLabel(startHour, startMinute)}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.rangeDash}>-</Text>

          <View style={styles.durationField}>
            <Text style={styles.fieldLabel}>End Time</Text>
            <Pressable
              onPress={() =>
                setOpenPicker((current) => (current === "end" ? null : "end"))
              }
              style={[
                styles.timeSelector,
                openPicker === "end" && styles.timeSelectorActive,
              ]}
            >
              <Text style={styles.timeSelectorText}>
                {formatTimeLabel(endHour, endMinute)}
              </Text>
            </Pressable>
          </View>
        </View>

        {openPicker && (
          <View style={styles.pickerCard}>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item.value}
              style={styles.pickerList}
              nestedScrollEnabled
              renderItem={({ item }) => {
                const isSelected =
                  openPicker === "start"
                    ? Number.parseInt(startHour, 10) === item.hour &&
                      Number.parseInt(startMinute, 10) === item.minute
                    : Number.parseInt(endHour, 10) === item.hour &&
                      Number.parseInt(endMinute, 10) === item.minute;

                return (
                  <Pressable
                    onPress={() => selectTime(openPicker, item.hour, item.minute)}
                    style={[
                      styles.pickerItem,
                      isSelected && styles.pickerItemSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected,
                      ]}
                    >
                      {formatTimeLabel(String(item.hour), String(item.minute))}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        <Text style={styles.helperText}>
          Enter the start and end time for that day's review session.
        </Text>

        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Text style={styles.saveButtonText}>Save And Schedule Reviews</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 14,
      justifyContent: "center",
      backgroundColor: colors.bg,
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
    },
    durationRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
    },
    durationField: {
      flex: 1,
      gap: 6,
    },
    rangeDash: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "700",
      paddingBottom: 10,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    timeSelector: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      minHeight: 52,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputBg,
    },
    timeSelectorActive: {
      borderColor: colors.primary,
      borderBottomWidth: 3,
    },
    timeSelectorText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    pickerCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.panel,
      maxHeight: 220,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    pickerList: {
      maxHeight: 220,
    },
    pickerItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemSelected: {
      backgroundColor: colors.primary,
    },
    pickerItemText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
    pickerItemTextSelected: {
      color: "#fff",
      fontWeight: "700",
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
    inputFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.panel,
    },
    helperText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    pressed: {
      opacity: 0.9,
    },
  });
}

