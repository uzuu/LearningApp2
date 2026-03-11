import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const VIEW_MODES = ["day", "week", "month"];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LIGHT_COLORS = {
  bg: "#f4f8ff",
  panel: "#ffffff",
  primary: "#1d6fe8",
  primaryDark: "#1351ac",
  accent: "#ff8a1f",
  text: "#183255",
  muted: "#6780a2",
  border: "#d6e4ff",
  monthMuted: "#f1f5fc",
  monthActive: "#dfeaff",
  weekActive: "#e8f0ff",
};

const DARK_COLORS = {
  bg: "#0b1220",
  panel: "#142235",
  primary: "#4f9bff",
  primaryDark: "#87bcff",
  accent: "#ff9f43",
  text: "#e9f2ff",
  muted: "#9fb3cf",
  border: "#28405e",
  monthMuted: "#0f1b2c",
  monthActive: "#1d3350",
  weekActive: "#1d3350",
};

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHeaderDate(date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getWeekStart(date) {
  const current = normalizeDate(date);
  return addDays(current, -current.getDay());
}

function buildMonthCells(anchorDate) {
  const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const gridStart = addDays(firstDay, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      key: formatDateKey(date),
      inCurrentMonth: date.getMonth() === anchorDate.getMonth(),
    };
  });
}

function ReviewList({ events, styles }) {
  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No review sessions in this range.</Text>
      }
      renderItem={({ item, index }) => (
        <View
          style={[
            styles.reviewCard,
            index % 2 === 0 ? styles.reviewCardBlue : styles.reviewCardOrange,
          ]}
        >
          <Text style={styles.reviewTitle}>{item.title}</Text>
          <Text style={styles.reviewMeta}>Review day +{item.dayOffset}</Text>
          <Text style={styles.reviewMeta}>{formatHeaderDate(item.dateObj)}</Text>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

function AppButton({ title, onPress, variant = "primary", styles }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.appButton,
        variant === "accent" ? styles.appButtonAccent : styles.appButtonPrimary,
        pressed && styles.appButtonPressed,
      ]}
    >
      <Text style={styles.appButtonText}>{title}</Text>
    </Pressable>
  );
}

export default function Schedule({ navigation, learningItems, isDark }) {
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(normalizeDate(new Date()));
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const reviewEvents = useMemo(() => {
    const events = [];

    learningItems.forEach((item) => {
      item.reviews.forEach((review, index) => {
        const dateObj = normalizeDate(new Date(review.date));
        const dateKey = formatDateKey(dateObj);

        events.push({
          id: `${item.id}-${index}`,
          title: item.title,
          dayOffset: review.dayOffset,
          dateObj,
          dateKey,
        });
      });
    });

    return events.sort((a, b) => a.dateObj - b.dateObj);
  }, [learningItems]);

  const eventsByDate = useMemo(() => {
    return reviewEvents.reduce((acc, event) => {
      if (!acc[event.dateKey]) {
        acc[event.dateKey] = [];
      }
      acc[event.dateKey].push(event);
      return acc;
    }, {});
  }, [reviewEvents]);

  const selectedKey = formatDateKey(selectedDate);
  const dayEvents = eventsByDate[selectedKey] || [];

  const weekStart = getWeekStart(selectedDate);
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index)
  );
  const weekEvents = weekDates.flatMap(
    (date) => eventsByDate[formatDateKey(date)] || []
  );

  const monthCells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);

  const shiftView = (amount) => {
    if (viewMode === "day") {
      setSelectedDate((prev) => addDays(prev, amount));
      return;
    }

    if (viewMode === "week") {
      setSelectedDate((prev) => addDays(prev, amount * 7));
      return;
    }

    setMonthAnchor(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1)
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Review Schedule</Text>
        <Text style={styles.subtitle}>Ebbinghaus spaced repetition planner</Text>
      </View>

      <View style={styles.topButtonWrap}>
        <AppButton
          title="Add New Learning"
          variant="accent"
          onPress={() => navigation.navigate("NewLearning")}
          styles={styles}
        />
      </View>

      <View style={styles.modeRow}>
        {VIEW_MODES.map((mode) => (
          <Pressable
            key={mode}
            style={({ pressed }) => [
              styles.modeButton,
              viewMode === mode && styles.modeButtonActive,
              pressed && styles.modeButtonPressed,
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[
                styles.modeButtonText,
                viewMode === mode && styles.modeButtonTextActive,
              ]}
            >
              {mode.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.navRow}>
        <AppButton title="Prev" onPress={() => shiftView(-1)} styles={styles} />
        <Text style={styles.navLabel}>
          {viewMode === "month"
            ? monthAnchor.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
              })
            : formatHeaderDate(selectedDate)}
        </Text>
        <AppButton title="Next" onPress={() => shiftView(1)} styles={styles} />
      </View>

      {viewMode === "day" && <ReviewList events={dayEvents} styles={styles} />}

      {viewMode === "week" && (
        <View style={styles.sectionWrap}>
          <View style={styles.weekRow}>
            {weekDates.map((date) => {
              const key = formatDateKey(date);
              const count = (eventsByDate[key] || []).length;
              const active = key === selectedKey;

              return (
                <Pressable
                  key={key}
                  style={[styles.weekCell, active && styles.weekCellActive]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={styles.weekCellDay}>{WEEK_DAYS[date.getDay()]}</Text>
                  <Text style={styles.weekCellDate}>{date.getDate()}</Text>
                  <Text style={styles.weekCellCount}>{count}</Text>
                </Pressable>
              );
            })}
          </View>
          <ReviewList events={weekEvents} styles={styles} />
        </View>
      )}

      {viewMode === "month" && (
        <View style={styles.sectionWrap}>
          <View style={styles.weekHeaderRow}>
            {WEEK_DAYS.map((dayName) => (
              <Text key={dayName} style={styles.weekHeaderText}>
                {dayName}
              </Text>
            ))}
          </View>

          <View style={styles.monthGrid}>
            {monthCells.map((cell) => {
              const count = (eventsByDate[cell.key] || []).length;
              const isSelected = cell.key === selectedKey;

              return (
                <Pressable
                  key={cell.key}
                  style={[
                    styles.monthCell,
                    !cell.inCurrentMonth && styles.monthCellMuted,
                    isSelected && styles.monthCellActive,
                  ]}
                  onPress={() => setSelectedDate(cell.date)}
                >
                  <Text style={styles.monthCellDate}>{cell.date.getDate()}</Text>
                  {count > 0 && (
                    <View style={styles.monthBadge}>
                      <Text style={styles.monthBadgeText}>{count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.selectedDateLabel}>
            Selected: {formatHeaderDate(selectedDate)}
          </Text>
          <ReviewList events={dayEvents} styles={styles} />
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.bg,
    },
    heroCard: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      textAlign: "center",
      color: colors.primaryDark,
    },
    subtitle: {
      textAlign: "center",
      color: colors.muted,
      marginTop: 4,
      fontSize: 13,
    },
    topButtonWrap: {
      marginBottom: 10,
    },
    appButton: {
      borderRadius: 10,
      minHeight: 42,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    appButtonPrimary: {
      backgroundColor: colors.primary,
    },
    appButtonAccent: {
      backgroundColor: colors.accent,
    },
    appButtonPressed: {
      opacity: 0.9,
    },
    appButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 14,
    },
    modeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    modeButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panel,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: "center",
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeButtonPressed: {
      opacity: 0.9,
    },
    modeButtonText: {
      fontWeight: "700",
      color: colors.text,
    },
    modeButtonTextActive: {
      color: "#fff",
    },
    navRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      gap: 8,
    },
    navLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
      color: colors.text,
    },
    sectionWrap: {
      flex: 1,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 4,
      marginBottom: 10,
    },
    weekCell: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 7,
      alignItems: "center",
      backgroundColor: colors.panel,
    },
    weekCellActive: {
      borderColor: colors.primary,
      backgroundColor: colors.weekActive,
    },
    weekCellDay: {
      fontSize: 12,
      color: colors.muted,
    },
    weekCellDate: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    weekCellCount: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "700",
    },
    weekHeaderRow: {
      flexDirection: "row",
      marginBottom: 6,
    },
    weekHeaderText: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      color: colors.muted,
      fontWeight: "600",
    },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    monthCell: {
      width: "14.28%",
      aspectRatio: 1,
      borderWidth: 0.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.panel,
    },
    monthCellMuted: {
      backgroundColor: colors.monthMuted,
    },
    monthCellActive: {
      backgroundColor: colors.monthActive,
      borderColor: colors.primary,
    },
    monthCellDate: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    monthBadge: {
      marginTop: 4,
      minWidth: 18,
      paddingHorizontal: 4,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    monthBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
    },
    selectedDateLabel: {
      textAlign: "center",
      marginBottom: 8,
      color: colors.text,
      fontWeight: "700",
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 12,
      gap: 8,
    },
    reviewCard: {
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewCardBlue: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    reviewCardOrange: {
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
    },
    reviewTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    reviewMeta: {
      color: colors.muted,
      marginTop: 2,
      fontWeight: "500",
    },
    emptyText: {
      marginTop: 18,
      textAlign: "center",
      color: colors.muted,
      backgroundColor: colors.panel,
      borderRadius: 10,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}

