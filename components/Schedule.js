import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const VIEW_MODES = ["day", "week", "month"];
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_HEIGHT = 64;
const WEEK_HEADER_HEIGHT = 82;
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const DAY_COLUMN_WIDTH = 280;
const WEEK_COLUMN_WIDTH = 126;
const TIME_GUTTER_WIDTH = 62;

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
  timelineLine: "#d8e3f5",
  eventBlue: "#4b88ff",
  eventBlueSoft: "#d8e6ff",
  eventGreen: "#1f8b4c",
  eventGreenSoft: "#ddf5e5",
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
  timelineLine: "#28405e",
  eventBlue: "#4f9bff",
  eventBlueSoft: "#1b3150",
  eventGreen: "#33b36b",
  eventGreenSoft: "#153725",
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

function formatEnglishEventDate(date) {
  return `${date.getMonth() + 1}.${date.getDate()}.${date.getFullYear()}`;
}

function formatTimeRange(timeRange) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(timeRange.startHour)}:${pad(timeRange.startMinute)} - ${pad(
    timeRange.endHour
  )}:${pad(timeRange.endMinute)}`;
}

function formatTimeLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${suffix}`;
}

function formatShortTime(hour, minute) {
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
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

function getEventMinutes(timeRange) {
  const start = timeRange.startHour * 60 + timeRange.startMinute;
  const end = timeRange.endHour * 60 + timeRange.endMinute;
  return {
    start,
    end,
    duration: Math.max(end - start, 30),
  };
}

function buildEventStyle(event, columnWidth) {
  const { start, duration } = getEventMinutes(event.reviewTimeRange);
  return {
    top: (start / 60) * HOUR_HEIGHT + 2,
    left: 4,
    width: columnWidth - 8,
    height: Math.max((duration / 60) * HOUR_HEIGHT - 4, 28),
  };
}

function TimelineEvent({ event, index, styles, columnWidth, onPress }) {
  const eventStyle = buildEventStyle(event, columnWidth);
  const isBlue = event.type !== "new-word";

  return (
    <Pressable
      onPress={() => onPress?.(event)}
      style={[
        styles.timelineEvent,
        isBlue ? styles.timelineEventBlue : styles.timelineEventGreen,
        eventStyle,
      ]}
    >
      <Text style={styles.timelineEventBadge}>
        {event.type === "new-word" ? "NEW WORD" : "LEARNING"}
      </Text>
      <Text numberOfLines={2} style={styles.timelineEventTitle}>
        {event.title}
      </Text>
      <Text style={styles.timelineEventTime}>
        {event.type === "new-word"
          ? `${event.words.length} word${event.words.length === 1 ? "" : "s"}`
          : `${formatShortTime(
              event.reviewTimeRange.startHour,
              event.reviewTimeRange.startMinute
            )} - ${formatShortTime(
              event.reviewTimeRange.endHour,
              event.reviewTimeRange.endMinute
            )}`}
      </Text>
    </Pressable>
  );
}

function TimelineHours({ styles, showTimezone = true }) {
  return (
    <View style={styles.timelineHours}>
      <Text style={styles.timezoneLabel}>
        {showTimezone ? "GMT+08" : ""}
      </Text>
      {HOURS.map((hour) => (
        <View key={hour} style={styles.hourLabelCell}>
          <Text style={styles.hourLabelText}>{formatTimeLabel(hour)}</Text>
        </View>
      ))}
    </View>
  );
}

function DayTimeline({ date, events, styles, onEventPress }) {
  return (
    <View style={styles.timelineWrap}>
      <View style={styles.dayHeaderWrap}>
        <Text style={styles.dayHeaderName}>{WEEK_DAYS[date.getDay()]}</Text>
        <View style={styles.dayHeaderBubble}>
          <Text style={styles.dayHeaderBubbleText}>{date.getDate()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={styles.timelineScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineBodyRow}>
          <TimelineHours styles={styles} />

          <View style={[styles.singleDayColumn, { width: DAY_COLUMN_WIDTH }]}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.hourGridCell} />
            ))}

            {events.map((event, index) => (
              <TimelineEvent
                key={event.id}
                event={event}
                index={index}
                styles={styles}
                columnWidth={DAY_COLUMN_WIDTH}
                onPress={onEventPress}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function WeekTimeline({
  dates,
  eventsByDate,
  selectedKey,
  onSelectDate,
  styles,
  onEventPress,
}) {
  const hoursScrollRef = useRef(null);
  const gridScrollRef = useRef(null);
  const syncingRef = useRef(null);

  const syncScroll = (source, offsetY) => {
    if (syncingRef.current && syncingRef.current !== source) {
      syncingRef.current = null;
      return;
    }

    syncingRef.current = source;
    const targetRef = source === "hours" ? gridScrollRef : hoursScrollRef;
    if (targetRef.current) {
      targetRef.current.scrollTo({ y: offsetY, animated: false });
    }
  };

  return (
    <View style={styles.timelineWrap}>
      <View style={styles.weekStickyLayout}>
        <View>
          <View style={styles.weekStickyHeaderSpacer} />
          <ScrollView
            ref={hoursScrollRef}
            style={styles.timelineScroll}
            contentContainerStyle={styles.timelineScrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) =>
              syncScroll("hours", event.nativeEvent.contentOffset.y)
            }
          >
            <TimelineHours styles={styles} showTimezone={false} />
          </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.weekCalendarHeader}>
              {dates.map((date) => {
                const key = formatDateKey(date);
                const active = key === selectedKey;

                return (
                  <Pressable
                    key={key}
                    style={[styles.weekCalendarDay, { width: WEEK_COLUMN_WIDTH }]}
                    onPress={() => onSelectDate(date)}
                  >
                    <Text style={styles.weekCalendarDayName}>
                      {WEEK_DAYS[date.getDay()]}
                    </Text>
                    <View
                      style={[
                        styles.weekCalendarDateCircle,
                        active && styles.weekCalendarDateCircleActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekCalendarDateText,
                          active && styles.weekCalendarDateTextActive,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView
              ref={gridScrollRef}
              style={styles.timelineScroll}
              contentContainerStyle={styles.timelineScrollContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) =>
                syncScroll("grid", event.nativeEvent.contentOffset.y)
              }
            >
              <View style={styles.weekColumnsRow}>
                {dates.map((date) => {
                  const key = formatDateKey(date);
                  const events = eventsByDate[key] || [];

                  return (
                    <View
                      key={key}
                      style={[styles.weekTimelineColumn, { width: WEEK_COLUMN_WIDTH }]}
                    >
                      {HOURS.map((hour) => (
                        <View key={hour} style={styles.hourGridCell} />
                      ))}

                      {events.map((event, index) => (
                        <TimelineEvent
                          key={event.id}
                          event={event}
                          index={index}
                          styles={styles}
                          columnWidth={WEEK_COLUMN_WIDTH}
                          onPress={onEventPress}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function ReviewList({ events, styles, onEventPress }) {
  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No review sessions in this range.</Text>
      }
      renderItem={({ item, index }) => (
        <Pressable
          onPress={() => onEventPress?.(item)}
          style={[
            styles.reviewCard,
            index % 2 === 0 ? styles.reviewCardBlue : styles.reviewCardOrange,
          ]}
        >
          <Text style={styles.reviewTitle}>{item.title}</Text>
          <Text style={styles.reviewMeta}>{formatTimeRange(item.reviewTimeRange)}</Text>
          <Text style={styles.reviewMeta}>
            {item.type === "new-word"
              ? `${item.words.length} word${item.words.length === 1 ? "" : "s"}`
              : `Review day +${item.dayOffset}`}
          </Text>
          <Text style={styles.reviewMeta}>{formatHeaderDate(item.dateObj)}</Text>
        </Pressable>
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

export default function Schedule({
  navigation,
  learningItems,
  englishWords,
  isDark,
}) {
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(normalizeDate(new Date()));
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const learningReviewEvents = useMemo(() => {
    const events = [];

    learningItems.forEach((item) => {
      if (item.type && item.type !== "learning") {
        return;
      }

      item.reviews.forEach((review, index) => {
        const dateObj = normalizeDate(new Date(review.date));
        const dateKey = formatDateKey(dateObj);

        events.push({
          id: `${item.id}-${index}`,
          title: item.title,
          type: "learning",
          reviewTimeRange: item.reviewTimeRange || {
            startHour: 0,
            startMinute: 0,
            endHour: 0,
            endMinute: 30,
          },
          dayOffset: review.dayOffset,
          dateObj,
          dateKey,
        });
      });
    });

    return events.sort((a, b) => {
      const aStart =
        a.dateObj.getTime() +
        (a.reviewTimeRange.startHour * 60 + a.reviewTimeRange.startMinute) *
          60 *
          1000;
      const bStart =
        b.dateObj.getTime() +
        (b.reviewTimeRange.startHour * 60 + b.reviewTimeRange.startMinute) *
          60 *
          1000;
      return aStart - bStart;
    });
  }, [learningItems]);

  const englishWordEvents = useMemo(() => {
    const groupedByCreatedDate = englishWords.reduce((acc, word) => {
      const sourceDateObj = normalizeDate(new Date(word.createdAt));
      const sourceDateKey = formatDateKey(sourceDateObj);

      if (!acc[sourceDateKey]) {
        acc[sourceDateKey] = {
          sourceDateObj,
          sourceDateKey,
          words: [],
          sourceOrder: word.order ?? 0,
        };
      }

      acc[sourceDateKey].words.push(word);
      acc[sourceDateKey].sourceOrder = Math.min(
        acc[sourceDateKey].sourceOrder,
        word.order ?? 0
      );
      return acc;
    }, {});

    const events = Object.values(groupedByCreatedDate).flatMap((group) => {
      const sortedWords = [...group.words].sort((a, b) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const baseReviews = sortedWords[0]?.reviews || [];

      return baseReviews.map((review) => {
        const dateObj = normalizeDate(new Date(review.date));
        const dateKey = formatDateKey(dateObj);

        return {
          id: `new-word-${group.sourceDateKey}-${dateKey}`,
          title: `New word ${formatEnglishEventDate(group.sourceDateObj)}`,
          type: "new-word",
          reviewTimeRange: {
            startHour: 8,
            startMinute: 0,
            endHour: 10,
            endMinute: 0,
          },
          dateObj,
          dateKey,
          dayOffset: review.dayOffset,
          words: sortedWords,
          sourceDateObj: group.sourceDateObj,
          sourceOrder: group.sourceOrder,
        };
      });
    });

    return events.sort((a, b) => {
      const aStart =
        a.dateObj.getTime() +
        (a.reviewTimeRange.startHour * 60 + a.reviewTimeRange.startMinute) *
          60 *
          1000;
      const bStart =
        b.dateObj.getTime() +
        (b.reviewTimeRange.startHour * 60 + b.reviewTimeRange.startMinute) *
          60 *
          1000;
      if (aStart !== bStart) {
        return aStart - bStart;
      }

      return (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0);
    });
  }, [englishWords]);

  const reviewEvents = useMemo(
    () =>
      [...learningReviewEvents, ...englishWordEvents].sort((a, b) => {
        const aStart =
          a.dateObj.getTime() +
          (a.reviewTimeRange.startHour * 60 + a.reviewTimeRange.startMinute) *
            60 *
            1000;
        const bStart =
          b.dateObj.getTime() +
          (b.reviewTimeRange.startHour * 60 + b.reviewTimeRange.startMinute) *
            60 *
            1000;
        if (aStart !== bStart) {
          return aStart - bStart;
        }

        return (a.sourceOrder ?? -1) - (b.sourceOrder ?? -1);
      }),
    [englishWordEvents, learningReviewEvents]
  );

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

  const handleEventPress = (event) => {
    if (event.type === "new-word") {
      navigation.navigate("Newword", {
        words: event.words,
        dateLabel: formatHeaderDate(event.sourceDateObj || event.dateObj),
      });
    }
  };

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
        <View style={styles.topActionsRow}>
          <View style={styles.topActionItem}>
            <AppButton
              title="Add New Learning"
              variant="accent"
              onPress={() => navigation.navigate("NewLearning")}
              styles={styles}
            />
          </View>
          <View style={styles.topActionItem}>
            <AppButton
              title="English Word"
              onPress={() => navigation.navigate("EnglishWord")}
              styles={styles}
            />
          </View>
        </View>
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

      {viewMode === "day" && (
        <DayTimeline
          date={selectedDate}
          events={dayEvents}
          styles={styles}
          onEventPress={handleEventPress}
        />
      )}

      {viewMode === "week" && (
        <WeekTimeline
          dates={weekDates}
          eventsByDate={eventsByDate}
          selectedKey={selectedKey}
          onSelectDate={setSelectedDate}
          styles={styles}
          onEventPress={handleEventPress}
        />
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
          <ReviewList
            events={dayEvents}
            styles={styles}
            onEventPress={handleEventPress}
          />
        </View>
      )}

      {viewMode === "week" && (
        <View style={styles.weekFooterList}>
          <ReviewList
            events={weekEvents}
            styles={styles}
            onEventPress={handleEventPress}
          />
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
    topActionsRow: {
      flexDirection: "row",
      gap: 8,
    },
    topActionItem: {
      flex: 1,
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
    timelineWrap: {
      flex: 1,
      backgroundColor: colors.panel,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    timelineScroll: {
      flex: 1,
    },
    timelineScrollContent: {
      paddingBottom: 24,
    },
    timelineBodyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    timelineHours: {
      width: TIME_GUTTER_WIDTH,
      backgroundColor: colors.panel,
    },
    timezoneLabel: {
      height: HOUR_HEIGHT,
      textAlign: "center",
      textAlignVertical: "center",
      color: colors.text,
      fontWeight: "700",
      paddingTop: 18,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.timelineLine,
    },
    hourLabelCell: {
      height: HOUR_HEIGHT,
      justifyContent: "flex-start",
      alignItems: "center",
      paddingTop: 6,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.timelineLine,
    },
    hourLabelText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    dayHeaderWrap: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 8,
      backgroundColor: colors.panel,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dayHeaderName: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: 14,
      marginBottom: 6,
    },
    dayHeaderBubble: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    dayHeaderBubbleText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 24,
    },
    singleDayColumn: {
      position: "relative",
      borderRightWidth: 1,
      borderColor: colors.timelineLine,
    },
    hourGridCell: {
      height: HOUR_HEIGHT,
      borderBottomWidth: 1,
      borderColor: colors.timelineLine,
    },
    weekCalendarHeader: {
      flexDirection: "row",
      height: WEEK_HEADER_HEIGHT,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.panel,
      alignItems: "center",
    },
    weekStickyLayout: {
      flexDirection: "row",
      flex: 1,
    },
    weekStickyHeaderSpacer: {
      height: WEEK_HEADER_HEIGHT,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.panel,
    },
    weekCalendarDay: {
      alignItems: "center",
      justifyContent: "center",
    },
    weekCalendarDayName: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 13,
      marginBottom: 6,
    },
    weekCalendarDateCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    weekCalendarDateCircleActive: {
      backgroundColor: colors.primary,
    },
    weekCalendarDateText: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
    },
    weekCalendarDateTextActive: {
      color: "#fff",
    },
    weekColumnsRow: {
      flexDirection: "row",
    },
    weekTimelineColumn: {
      position: "relative",
      borderRightWidth: 1,
      borderColor: colors.timelineLine,
    },
    timelineEvent: {
      position: "absolute",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 6,
      overflow: "hidden",
    },
    timelineEventBlue: {
      backgroundColor: colors.eventBlue,
    },
    timelineEventGreen: {
      backgroundColor: colors.eventGreen,
    },
    timelineEventTitle: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 13,
      marginTop: 2,
    },
    timelineEventTime: {
      color: "#eef4ff",
      fontSize: 11,
      marginTop: 2,
    },
    timelineEventDateText: {
      color: "#eef4ff",
      fontSize: 11,
      marginTop: 2,
      fontWeight: "700",
    },
    timelineEventBadge: {
      color: "#f5f9ff",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.7,
    },
    weekFooterList: {
      marginTop: 10,
      maxHeight: 180,
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
