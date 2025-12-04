import React, { useState, useEffect, useMemo } from "react";
import { View, FlatList, StyleSheet, Alert } from "react-native";
import {
  Text,
  List,
  useTheme,
  IconButton,
  Button,
  Menu,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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

const isSameWeek = (date) => {
  const now = new Date();
  const d = parseDate(date);
  return now - d <= 7 * 24 * 60 * 60 * 1000;
};

const isSameMonth = (date) => {
  const now = new Date();
  const d = parseDate(date);
  return (
    now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()
  );
};

const isSameYear = (date) => {
  const now = new Date();
  const d = parseDate(date);
  return now.getFullYear() === d.getFullYear();
};

const TransactionsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [filter, setFilter] = useState("all");
  const [menuVisible, setMenuVisible] = useState(false);

  const loadTransactions = async () => {
    const e = await AsyncStorage.getItem("expenses");
    const i = await AsyncStorage.getItem("income");

    setExpenses(e ? JSON.parse(e) : []);
    setIncome(i ? JSON.parse(i) : []);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadTransactions);
    return unsubscribe;
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

  const handleDelete = (item) => {
    Alert.alert("Delete", `Remove this ${item.type}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteItem(item),
      },
    ]);
  };

  const allTransactions = useMemo(() => {
    const combined = [
      ...expenses.map((e) => ({ ...e, type: "expense" })),
      ...income.map((i) => ({ ...i, type: "income" })),
    ].sort((a, b) => parseDate(b.date) - parseDate(a.date));

    return combined.filter((item) => {
      if (filter === "weekly") return isSameWeek(item.date);
      if (filter === "monthly") return isSameMonth(item.date);
      if (filter === "yearly") return isSameYear(item.date);
      return true;
    });
  }, [expenses, income, filter]);

  const groupedData = useMemo(() => {
    const map = {};
    allTransactions.forEach((t) => {
      const d = formatDate(t.date);
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return Object.keys(map).map((date) => ({
      title: date,
      data: map[date],
    }));
  }, [allTransactions]);

  const renderItem = (item) => {
    const isExpense = item.type === "expense";
    const color = isExpense ? theme.colors.error : "green";

    return (
      <List.Item
        key={item.id}
        title={item.category}
        description={item.notes}
        left={() => (
          <List.Icon
            icon={isExpense ? "arrow-down-circle" : "arrow-up-circle"}
            color={color}
          />
        )}
        right={() => (
          <View style={styles.row}>
            <Text style={[styles.amount, { color }]}>
              {isExpense ? "-" : "+"}₹{item.amount.toFixed(2)}
            </Text>
            <IconButton
              icon="trash-can-outline"
              size={20}
              onPress={() => handleDelete(item)}
            />
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Button
        mode="text"
        icon="arrow-left"
        onPress={() => navigation.goBack()}
        textColor="black"
        style={{ alignSelf: "flex-start", marginLeft: 10 }}
      >
        Back
      </Button>

      <View style={styles.container}>
        <View style={styles.dropdownWrapper}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMenuVisible(true)}
                icon="filter"
              >
                Filter: {filter.toUpperCase()}
              </Button>
            }
          >
            <Menu.Item
              title="All Transactions"
              onPress={() => {
                setFilter("all");
                setMenuVisible(false);
              }}
            />
            <Menu.Item
              title="Weekly"
              onPress={() => {
                setFilter("weekly");
                setMenuVisible(false);
              }}
            />
            <Menu.Item
              title="Monthly"
              onPress={() => {
                setFilter("monthly");
                setMenuVisible(false);
              }}
            />
            <Menu.Item
              title="Yearly"
              onPress={() => {
                setFilter("yearly");
                setMenuVisible(false);
              }}
            />
          </Menu>
        </View>

        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.dateHeader}>{item.title}</Text>
              {item.data.map((t) => renderItem(t))}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions found.</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  emptyText: { textAlign: "center", marginTop: 40 },
  dropdownWrapper: { alignItems: "flex-start", marginBottom: 10 },

  dateHeader: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontWeight: "bold",
    backgroundColor: "#E9E9E9",
    marginTop: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },
  amount: { fontSize: 16, fontWeight: "bold" },
});

export default TransactionsScreen;
