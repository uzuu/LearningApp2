import { useMemo, useState } from "react";
import {
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const VIEW_MODES = ["day", "week", "month"];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function ReviewList({ events }) {
  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No review sessions in this range.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{item.title}</Text>
          <Text style={styles.reviewMeta}>Review day +{item.dayOffset}</Text>
          <Text style={styles.reviewMeta}>{formatHeaderDate(item.dateObj)}</Text>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      style={styles.list}
    />
  );
}

export default function Schedule({ navigation, learningItems }) {
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(normalizeDate(new Date()));

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
      <Text style={styles.title}>Review Schedule</Text>

      <View style={styles.topButtonWrap}>
        <Button
          title="Add New Learning"
          onPress={() => navigation.navigate("NewLearning")}
        />
      </View>

      <View style={styles.modeRow}>
        {VIEW_MODES.map((mode) => (
          <Pressable
            key={mode}
            style={[styles.modeButton, viewMode === mode && styles.modeButtonActive]}
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
        <Button title="Prev" onPress={() => shiftView(-1)} />
        <Text style={styles.navLabel}>
          {viewMode === "month"
            ? monthAnchor.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
              })
            : formatHeaderDate(selectedDate)}
        </Text>
        <Button title="Next" onPress={() => shiftView(1)} />
      </View>

      {viewMode === "day" && <ReviewList events={dayEvents} />}

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
          <ReviewList events={weekEvents} />
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
                  <Text style={styles.monthCellCount}>{count > 0 ? count : ""}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.selectedDateLabel}>
            Selected: {formatHeaderDate(selectedDate)}
          </Text>
          <ReviewList events={dayEvents} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  topButtonWrap: {
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#1f6feb",
    borderColor: "#1f6feb",
  },
  modeButtonText: {
    fontWeight: "600",
    color: "#333",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: "600",
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
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  weekCellActive: {
    borderColor: "#1f6feb",
    backgroundColor: "#eaf2ff",
  },
  weekCellDay: {
    fontSize: 12,
    color: "#666",
  },
  weekCellDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  weekCellCount: {
    fontSize: 12,
    color: "#1f6feb",
  },
  weekHeaderRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#666",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  monthCell: {
    width: "14.28%",
    aspectRatio: 1,
    borderWidth: 0.5,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  monthCellMuted: {
    backgroundColor: "#fafafa",
  },
  monthCellActive: {
    backgroundColor: "#eaf2ff",
    borderColor: "#1f6feb",
  },
  monthCellDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthCellCount: {
    fontSize: 11,
    color: "#1f6feb",
  },
  selectedDateLabel: {
    textAlign: "center",
    marginBottom: 8,
    color: "#444",
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
    gap: 8,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  reviewMeta: {
    color: "#555",
    marginTop: 2,
  },
  emptyText: {
    marginTop: 18,
    textAlign: "center",
    color: "#777",
  },
});
