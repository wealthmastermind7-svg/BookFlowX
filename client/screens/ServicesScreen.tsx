import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { api, Service, Business } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ServicesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (api.getBusinessId()) {
        loadServices();
      }
    }, [])
  );

  const initializeBusiness = async () => {
    try {
      await api.getOrCreateBusiness();
      loadServices();
    } catch (error) {
      console.error("Error initializing business:", error);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const [data, biz] = await Promise.all([
        api.getServices(),
        api.getBusiness(),
      ]);
      setServices(data);
      if (biz) setBusiness(biz);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = () => {
    navigation.navigate("ServiceEditor", {});
  };

  const handleSelectService = (serviceId: string) => {
    navigation.navigate("ServiceEditor", { serviceId });
  };

  const renderItem = ({ item }: { item: Service }) => (
    <ServiceCard
      name={item.name}
      duration={item.duration}
      price={item.price / 100}
      currency={business?.currency || "USD"}
      bookingRate={Math.floor(Math.random() * 100)}
      onPress={() => handleSelectService(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { paddingTop: headerHeight + Spacing["3xl"] }]}>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No Services Yet
      </ThemedText>
      <ThemedText type="body" style={styles.emptyMessage}>
        Create your first service by tapping the + button
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.xl,
        }}
        data={services}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={services.length > 0}
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />
      <FloatingActionButton
        icon="plus"
        onPress={handleCreateService}
        style={{
          position: "absolute",
          right: Spacing.xl,
          bottom: tabBarHeight + Spacing.xl,
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  emptyMessage: {
    textAlign: "center",
    opacity: 0.6,
  },
});
