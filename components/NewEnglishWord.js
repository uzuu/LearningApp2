import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function NewEnglishWord({
  navigation,
  onAddEnglishWord,
  isDark,
}) {
  const [title, setTitle] = useState("");
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleAdd = () => {
    const added = onAddEnglishWord({ title });
    if (!added) {
      return;
    }

    setTitle("");
    navigation.navigate("Schedule");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.card}>
        <Text style={styles.title}>English Word</Text>
        <Text style={styles.caption}>
          Enter only the word. The app will find the Mongolian translation,
          pronunciation, and 5 example sentences automatically.
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
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Text style={styles.saveButtonText}>Save English Word</Text>
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
