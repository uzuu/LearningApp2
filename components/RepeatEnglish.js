import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LIGHT_COLORS = {
  bg: "#f4f8ff",
  panel: "#ffffff",
  primary: "#1d6fe8",
  accent: "#ff8a1f",
  text: "#183255",
  muted: "#6a82a3",
  border: "#d6e4ff",
};

const DARK_COLORS = {
  bg: "#0b1220",
  panel: "#142235",
  primary: "#4f9bff",
  accent: "#ff9f43",
  text: "#e9f2ff",
  muted: "#9fb3cf",
  border: "#28405e",
};

export default function RepeatEnglish({ route, isDark }) {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const words = route.params?.words || [];
  const dateLabel = route.params?.dateLabel || "";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Repeat English</Text>
        <Text style={styles.subtitle}>{dateLabel}</Text>
      </View>

      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No english words for this date.</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.wordCard}>
            <Text style={styles.wordIndex}>{index + 1}</Text>
            <Text style={styles.wordText}>{item.title}</Text>
          </View>
        )}
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
      gap: 10,
      paddingBottom: 16,
    },
    wordCard: {
      backgroundColor: colors.panel,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    wordIndex: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      color: "#fff",
      textAlign: "center",
      textAlignVertical: "center",
      fontWeight: "800",
      overflow: "hidden",
    },
    wordText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      flex: 1,
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
