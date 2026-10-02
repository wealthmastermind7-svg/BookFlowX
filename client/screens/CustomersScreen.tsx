import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, Customer, CustomerInsightsResult, CustomerInsight, getCustomerInsights } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { CustomerCard } from "@/components/CustomerCard";

const money = (amount: number, currency?: string | null) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(amount); }
  catch { return `${amount}`; }
};

function InsightCustomer({ item, currency, onPress }: { item: CustomerInsight; currency: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.insightRow, pressed && { opacity: 0.8 }]}>
      <View style={styles.insightAvatar}><Text style={styles.insightInitial}>{item.name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase()}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.insightName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.insightMeta}>{item.totalBookings} viewings · {money(item.totalSpend, currency)}</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#8B6F47" />
    </Pressable>
  );
}

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [insights, setInsights] = useState<CustomerInsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("USD");

  const loadCustomers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const business = await api.getOrCreateBusiness();
      const [data, customerInsights] = await Promise.all([api.getCustomers(), getCustomerInsights(business.id)]);
      setCustomers(data);
      setCurrency(business.currency || "USD");
      setInsights(customerInsights);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useFocusEffect(useCallback(() => {
    if (api.getBusinessId()) loadCustomers(true);
  }, [loadCustomers]));

  const filteredCustomers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((client) => client.name.toLowerCase().includes(needle) || client.email.toLowerCase().includes(needle) || (client.phone || "").toLowerCase().includes(needle));
  }, [customers, query]);

  const openClient = (customer: Customer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(customer.name, `${t("customers.email")}: ${customer.email}\n${t("customers.phone")}: ${customer.phone || t("common.na")}\n${t("customers.totalBookings")}: ${customer.totalBookings || 0}`, [{ text: t("common.close") }]);
  };
  const openInsightClient = (client: CustomerInsight) => {
    const customer = customers.find((item) => item.id === client.id);
    if (customer) openClient(customer);
    else Alert.alert(client.name, `${client.email}\n${client.totalBookings} viewings · ${money(client.totalSpend, currency)}`, [{ text: t("common.close") }]);
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
      <View style={styles.eyebrow}><View style={styles.liveDot} /><Text style={styles.eyebrowText}>CLIENT DIRECTORY</Text></View>
      <Text style={styles.title}>Clients</Text>
      <Text style={styles.subtitle}>Every conversation, ready when you are.</Text>
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color="#8B6F47" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search clients" placeholderTextColor="#8B6F47" style={styles.searchInput} returnKeyType="search" accessibilityLabel="Search clients" />
        {query ? <Pressable onPress={() => setQuery("")} hitSlop={10}><Feather name="x-circle" size={17} color="#8B6F47" /></Pressable> : null}
      </View>
      {!query && insights ? (
        <>
          <Text style={styles.sectionTitle}>Client pulse</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCell}><Text style={styles.summaryValue}>{insights.summary.totalCustomers}</Text><Text style={styles.summaryLabel}>TOTAL CLIENTS</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}><Text style={styles.summaryValue}>{insights.summary.vipCount}</Text><Text style={styles.summaryLabel}>TOP CLIENTS</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}><Text style={styles.summaryValue}>{insights.summary.atRiskCount}</Text><Text style={styles.summaryLabel}>AT RISK</Text></View>
          </View>
          {insights.topCustomers.length > 0 ? (
            <View style={styles.insightPanel}>
              <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Top clients</Text><Text style={styles.panelNote}>By confirmed booking value</Text></View><Feather name="award" size={17} color="#C17F3E" /></View>
              {insights.topCustomers.slice(0, 3).map((item) => <InsightCustomer key={item.id} item={item} currency={currency} onPress={() => openInsightClient(item)} />)}
            </View>
          ) : null}
          {insights.atRiskCustomers.length > 0 ? (
            <View style={styles.insightPanel}>
              <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Due for a follow-up</Text><Text style={styles.panelNote}>Clients who may need a nudge</Text></View><Feather name="activity" size={17} color="#B87831" /></View>
              {insights.atRiskCustomers.slice(0, 3).map((item) => <InsightCustomer key={item.id} item={item} currency={currency} onPress={() => openInsightClient(item)} />)}
            </View>
          ) : null}
          {insights.mostFrequentServices.length > 0 ? (
            <View style={styles.insightPanel}>
              <View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Popular viewing types</Text><Text style={styles.panelNote}>Most requested by your clients</Text></View><Feather name="trending-up" size={17} color="#C17F3E" /></View>
              {insights.mostFrequentServices.slice(0, 3).map((service) => (
                <View key={service.name} style={styles.serviceInsight}>
                  <Text style={styles.serviceInsightName}>{service.name}</Text>
                  <Text style={styles.serviceInsightCount}>{service.count} bookings</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      <View style={styles.listHeading}>
        <Text style={styles.sectionTitle}>{query ? "Search results" : "All clients"}</Text>
        <Text style={styles.resultCount}>{filteredCustomers.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CustomerCard name={item.name} email={item.email} phone={item.phone || undefined} totalBookings={item.totalBookings || 0} onPress={() => openClient(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name={query ? "search" : "users"} size={21} color="#C17F3E" /></View>
            <Text style={styles.emptyTitle}>{query ? "No matching clients" : "Your client book is clear"}</Text>
            <Text style={styles.emptyCopy}>{query ? "Try another name, email or number." : "New viewing enquiries will appear here."}</Text>
          </View>
        ) : (
          <View style={styles.skeletonList}>{[1, 2, 3].map((id) => <View key={id} style={styles.skeleton} />)}</View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 28 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCustomers(true)} tintColor="#C17F3E" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF7F2" },
  list: { paddingHorizontal: 20 },
  header: { paddingBottom: 20 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C17F3E" },
  eyebrowText: { color: "#8B6F47", fontSize: 12, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: "#1C1410", fontSize: 30, fontWeight: "700", letterSpacing: -0.2, fontFamily: "PlayfairDisplay-Bold" },
  subtitle: { color: "#6B5744", fontSize: 14, marginTop: 5, marginBottom: 20 },
  searchBox: { height: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DDD0" },
  searchInput: { flex: 1, color: "#1C1410", fontSize: 14, paddingVertical: 0 },
  sectionTitle: { color: "#1C1410", fontSize: 20, fontWeight: "700", fontFamily: "PlayfairDisplay-Bold" },
  summaryCard: { flexDirection: "row", alignItems: "center", marginTop: 13, padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DDD0" },
  summaryCell: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#1C1410", fontSize: 20, fontWeight: "700" },
  summaryLabel: { color: "#8B6F47", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, marginTop: 4 },
  summaryDivider: { width: 1, height: 28, backgroundColor: "#E8DDD0" },
  insightPanel: { marginTop: 24, padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DDD0" },
  panelHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  panelTitle: { color: "#1C1410", fontSize: 20, fontWeight: "700", fontFamily: "PlayfairDisplay-Bold" },
  panelNote: { color: "#8B6F47", fontSize: 12, marginTop: 3 },
  insightRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#F0E8DE" },
  insightAvatar: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#F4EEE6", marginRight: 10 },
  insightInitial: { color: "#A8662F", fontSize: 12, fontWeight: "800" },
  insightName: { color: "#1C1410", fontSize: 14, fontWeight: "600" },
  insightMeta: { color: "#8B6F47", fontSize: 12, marginTop: 3 },
  serviceInsight: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#F0E8DE" },
  serviceInsightName: { color: "#1C1410", fontSize: 14, fontWeight: "600" },
  serviceInsightCount: { color: "#8B6F47", fontSize: 12 },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  resultCount: { color: "#A8662F", fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DDD0" },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#F4EEE6", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: "#1C1410", fontSize: 20, fontWeight: "700", fontFamily: "PlayfairDisplay-Bold" },
  emptyCopy: { color: "#8B6F47", fontSize: 14, textAlign: "center", marginTop: 6 },
  skeletonList: { gap: 10 },
  skeleton: { height: 88, borderRadius: 20, backgroundColor: "#F0E8DE", borderWidth: 1, borderColor: "#E8DDD0" },
});