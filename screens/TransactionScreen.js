import React, { useState, useEffect, useMemo } from "react";
import { View, FlatList, StyleSheet, Alert } from "react-native";
import { Text, List, useTheme, IconButton, Button } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
const parseDate = (value) => {
  if (!value) return new Date();
  let d = new Date(value);
  if (!isNaN(d)) return d;

  if (value.includes("/")) {
    const [dd, mm, yyyy] = value.split("/");
    return new Date(`${yyyy}-${mm}-${dd}`);
  }

  if (value.includes("-")) {
    const [dd, mm, yyyy] = value.split("-");
    return new Date(`${yyyy}-${mm}-${dd}`);
  }

  return new Date();
};

const formatDate = (dateValue) => {
  const d = parseDate(dateValue);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const isSameDay = (d1, d2) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const TransactionsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const loadTransactions = async () => {
    const e = await AsyncStorage.getItem("expenses");
    const i = await AsyncStorage.getItem("income");

    setExpenses(e ? JSON.parse(e) : []);
    setIncome(i ? JSON.parse(i) : []);
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadTransactions);
    return unsub;
  }, []);

  const deleteItem = async (item) => {
    if (item.type === "expense") {
      const updated = expenses.filter((x) => x.id !== item.id);
      setExpenses(updated);
      await AsyncStorage.setItem("expenses", JSON.stringify(updated));
    } else {
      const updated = income.filter((x) => x.id !== item.id);
      setIncome(updated);
      await AsyncStorage.setItem("income", JSON.stringify(updated));
    }
  };

  const handleDelete = (item) =>
    Alert.alert("Delete", `Remove this ${item.type}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteItem(item) },
    ]);

  const allTransactions = useMemo(() => {
    const combined = [
      ...expenses.map((e) => ({ ...e, type: "expense" })),
      ...income.map((i) => ({ ...i, type: "income" })),
    ].sort((a, b) => parseDate(b.date) - parseDate(a.date));

    if (!selectedDate) return combined;
    return combined.filter((item) =>
      isSameDay(parseDate(item.date), selectedDate)
    );
  }, [expenses, income, selectedDate]);

  const groupedData = useMemo(() => {
    const grouped = {};
    allTransactions.forEach((t) => {
      const d = formatDate(t.date);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });
    return Object.keys(grouped).map((date) => ({
      title: date,
      data: grouped[date],
    }));
  }, [allTransactions]);

  const renderItem = (item) => {
    const color = item.type === "expense" ? theme.colors.error : "green";

    return (
      <List.Item
        key={item.id}
        title={item.category}
        titleStyle={{ color: theme.colors.onSurface }}
        description={item.notes}
        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
        left={() => (
          <List.Icon
            icon={
              item.type === "expense" ? "arrow-down-circle" : "arrow-up-circle"
            }
            color={color}
          />
        )}
        right={() => (
          <View style={styles.row}>
            <Text style={[styles.amount, { color }]}>
              {item.type === "expense" ? "-" : "+"}₹{item.amount.toFixed(2)}
            </Text>
            <IconButton
              icon="trash-can-outline"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDelete(item)}
            />
          </View>
        )}
        style={{ backgroundColor: theme.colors.surface, marginVertical: 2 }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Button
        mode="text"
        icon="arrow-left"
        onPress={() => navigation.goBack()}
        textColor={theme.colors.onBackground}
        style={{ alignSelf: "flex-start", marginLeft: 10, marginVertical: 10 }}
      >
        Back
      </Button>

      <View style={styles.calendarContainer}>
        <IconButton
          icon="calendar"
          size={30}
          iconColor={theme.colors.primary}
          onPress={() => setShowPicker(true)}
        />

        {selectedDate && (
          <Button
            mode="text"
            onPress={() => setSelectedDate(null)}
            textColor={theme.colors.error}
          >
            Clear Date
          </Button>
        )}
      </View>
      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <View>
            <Text
              style={[
                styles.dateHeader,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            >
              {item.title}
            </Text>
            {item.data.map((t) => renderItem(t))}
          </View>
        )}
        ListEmptyComponent={
          <Text
            style={[styles.emptyText, { color: theme.colors.onBackground }]}
          >
            No transactions found.
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  emptyText: { textAlign: "center", marginTop: 40 },
  calendarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    marginBottom: 10,
  },
  dateHeader: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },
  amount: { fontSize: 16, fontWeight: "bold", marginRight: 8 },
});

export default TransactionsScreen;
