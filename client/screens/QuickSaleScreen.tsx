import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
  Image,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import QRCode from "qrcode";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { api, Business } from "@/lib/api";
import { getCurrencySymbol, formatPrice } from "@/lib/currency";

type StripeStatus = {
  connected: boolean;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export default function QuickSaleScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  const animationScale = useRef(new Animated.Value(0.5)).current;
  const animationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkStripeStatus();
  }, []);

  useEffect(() => {
    if (saleComplete) {
      Animated.parallel([
        Animated.timing(animationScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animationOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      animationScale.setValue(0.5);
      animationOpacity.setValue(0);
    }
  }, [saleComplete]);

  useEffect(() => {
    if (!stripeStatus?.connected || !stripeStatus.chargesEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animationScale, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animationScale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [stripeStatus]);

  const checkStripeStatus = async () => {
    setCheckingStatus(true);
    try {
      const businessId = api.getBusinessId();
      if (!businessId) return;
      
      const [statusResponse, businessData] = await Promise.all([
        fetch(
          `${api.getBaseUrl()}/api/businesses/${businessId}/stripe/status`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-business-token": await api.getOwnerToken() || "",
            },
          }
        ),
        api.getBusiness(),
      ]);
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setStripeStatus(status);
      }
      if (businessData) setBusiness(businessData);
    } catch (error) {
      console.error("Error checking Stripe status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const businessId = api.getBusinessId();
      if (!businessId) {
        console.error("No business ID found");
        Alert.alert("Error", "Please set up your business first.");
        return;
      }
      
      const token = await api.getOwnerToken();
      if (!token) {
        console.error("No auth token found");
        Alert.alert("Error", "Please log in to your business account.");
        return;
      }
      
      const response = await fetch(
        `${api.getBaseUrl()}/api/businesses/${businessId}/stripe/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-business-token": token,
          },
        }
      );
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        Alert.alert("Error", "Unable to connect to payment service. Please try again.");
        return;
      }
      
      if (response.ok && data.url) {
        if (Platform.OS === "web") {
          window.open(data.url, "_blank");
        } else {
          await Linking.openURL(data.url);
        }
      } else if (data.details?.includes("signed up for Connect")) {
        Alert.alert(
          "Stripe Connect Required",
          "Stripe Connect needs to be enabled on your account. Please visit dashboard.stripe.com and enable Connect in the sidebar."
        );
      } else {
        console.error("Stripe Connect error:", data);
        Alert.alert("Error", data.error || "Failed to connect Stripe. Please try again.");
      }
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      Alert.alert("Error", "Unable to connect to payment service. Please check your connection.");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleNumberPress = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (num === "." && amount.includes(".")) return;
    if (amount.includes(".") && amount.split(".")[1].length >= 2) return;
    setAmount((prev) => prev + num);
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAmount("");
    setDescription("");
    setSaleComplete(false);
    setPaymentUrl(null);
    setQrCode(null);
  };

  const handleSharePaymentLink = async () => {
    if (!paymentUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Pay ${formatAmount(amount)} - ${paymentUrl}`,
        url: paymentUrl,
        title: "Payment Request",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (!paymentUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(paymentUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCharge = async () => {
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    
    try {
      const businessId = api.getBusinessId();
      if (!businessId) return;
      
      const response = await fetch(
        `${api.getBaseUrl()}/api/businesses/${businessId}/quick-sale`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-owner-token": await api.getOwnerToken() || "",
          },
          body: JSON.stringify({
            amount: amountInCents,
            description: description || "Quick Sale",
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const url = data.paymentUrl || null;
        setPaymentUrl(url);
        
        // Generate QR code
        if (url) {
          try {
            const qrDataUrl = await QRCode.toDataURL(url, {
              errorCorrectionLevel: "H",
              margin: 2,
              width: 300,
            } as any);
            setQrCode(qrDataUrl as string);
          } catch (qrError) {
            console.error("Error generating QR code:", qrError);
          }
        }
        
        setSaleComplete(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Error processing sale:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const currencyCode = business?.currency || "USD";
  const currencySymbol = getCurrencySymbol(currencyCode);

  const formatAmount = (value: string): string => {
    if (!value) return `${currencySymbol}0.00`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${currencySymbol}0.00`;
    return formatPrice(Math.round(num * 100), currencyCode);
  };

  const NumberButton = ({ value, onPress }: { value: string; onPress: () => void }) => (
    <Pressable
      style={[styles.numberButton, { backgroundColor: theme.backgroundSecondary }]}
      onPress={onPress}
    >
      <ThemedText style={styles.numberText}>{value}</ThemedText>
    </Pressable>
  );

  if (checkingStatus) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  if (!stripeStatus?.connected || !stripeStatus.chargesEnabled) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <ScrollView contentContainerStyle={styles.setupContainer} showsVerticalScrollIndicator={false}>
          <Animated.View style={[
            styles.animatedIconWrapper,
            {
              transform: [{ scale: animationScale }],
            },
          ]}>
            <View style={[styles.setupIconContainer, { backgroundColor: theme.accent }]}>
              <Feather name="wifi" size={56} color="white" />
            </View>
          </Animated.View>
          
          <ThemedText style={styles.setupTitle}>
            Set Up Payments
          </ThemedText>
          
          <ThemedText style={[styles.setupDescription, { color: theme.textSecondary }]}>
            Connect your Stripe account to accept contactless payments directly from your customers. The money goes straight to your bank account.
          </ThemedText>
          
          <Pressable
            style={({ pressed }) => [
              styles.connectButton, 
              { 
                backgroundColor: theme.accent,
                opacity: pressed ? 0.8 : 1,
              }
            ]}
            onPress={handleConnectStripe}
            disabled={connectingStripe}
          >
            {connectingStripe ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <>
                <Feather name="link" size={20} color={theme.buttonText} style={{ marginRight: Spacing.sm }} />
                <ThemedText style={[styles.connectButtonText, { color: theme.buttonText }]}>
                  Connect Stripe
                </ThemedText>
              </>
            )}
          </Pressable>
          
          <Pressable style={styles.refreshButton} onPress={checkStripeStatus}>
            <ThemedText style={[styles.refreshText, { color: theme.textSecondary }]}>
              Already connected? Tap to refresh
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    );
  }

  if (saleComplete) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <ScrollView contentContainerStyle={styles.successContainer} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.successTitle}>
            Ready to Collect
          </ThemedText>
          
          <ThemedText style={styles.successAmount}>
            {formatAmount(amount)}
          </ThemedText>
          
          <Animated.View style={[
            styles.nfcIconContainer,
            {
              transform: [{ scale: animationScale }],
              opacity: animationOpacity,
            },
          ]}>
            <View style={[styles.nfcIcon, { backgroundColor: theme.accent }]}>
              <Feather name="wifi" size={64} color="white" />
            </View>
          </Animated.View>
          
          {qrCode ? (
            <Pressable 
              onPress={() => paymentUrl && Linking.openURL(paymentUrl)}
              style={({ pressed }) => [
                styles.qrContainer, 
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.borderLight },
                pressed && { opacity: 0.8 }
              ]}
            >
              <View style={styles.qrImageContainer}>
                <Image
                  source={{ uri: qrCode }}
                  style={styles.qrCode}
                />
                <View style={styles.qrCenterOverlay}>
                  <ThemedText style={styles.qrCenterText}>
                    {business?.slug?.toUpperCase() || "PAY"}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.qrInstructions, { color: theme.textSecondary }]}>
                Ask customer to scan with their phone or tap to open link
              </ThemedText>
            </Pressable>
          ) : null}
          
          <View style={styles.linkActions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={handleCopyPaymentLink}
            >
              <Feather name="copy" size={20} color={theme.text} style={{ marginRight: Spacing.sm }} />
              <ThemedText style={[styles.actionButtonText, { color: theme.text }]}>
                Copy Link
              </ThemedText>
            </Pressable>
            
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.accent, marginTop: Spacing.md }]}
              onPress={handleSharePaymentLink}
            >
              <Feather name="share-2" size={20} color={theme.buttonText} style={{ marginRight: Spacing.sm }} />
              <ThemedText style={[styles.actionButtonText, { color: theme.buttonText }]}>
                Share
              </ThemedText>
            </Pressable>
          </View>
          
          <Pressable
            style={[styles.newSaleButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={handleClear}
          >
            <ThemedText style={[styles.newSaleButtonText, { color: theme.text }]}>
              New Sale
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Quick Sale</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Tap to accept payments
        </ThemedText>
      </View>
      
      <View style={styles.amountContainer}>
        <ThemedText style={styles.dollarSign}>{currencySymbol}</ThemedText>
        <ThemedText style={styles.amountText}>
          {amount || "0.00"}
        </ThemedText>
      </View>
      
      <View style={styles.descriptionContainer}>
        <TextInput
          style={[
            styles.descriptionInput, 
            { 
              backgroundColor: theme.backgroundSecondary, 
              color: theme.text,
              borderColor: theme.borderLight,
            }
          ]}
          placeholder="Add description (optional)"
          placeholderTextColor={theme.textTertiary}
          value={description}
          onChangeText={setDescription}
        />
      </View>
      
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          <NumberButton value="1" onPress={() => handleNumberPress("1")} />
          <NumberButton value="2" onPress={() => handleNumberPress("2")} />
          <NumberButton value="3" onPress={() => handleNumberPress("3")} />
        </View>
        <View style={styles.keypadRow}>
          <NumberButton value="4" onPress={() => handleNumberPress("4")} />
          <NumberButton value="5" onPress={() => handleNumberPress("5")} />
          <NumberButton value="6" onPress={() => handleNumberPress("6")} />
        </View>
        <View style={styles.keypadRow}>
          <NumberButton value="7" onPress={() => handleNumberPress("7")} />
          <NumberButton value="8" onPress={() => handleNumberPress("8")} />
          <NumberButton value="9" onPress={() => handleNumberPress("9")} />
        </View>
        <View style={styles.keypadRow}>
          <NumberButton value="." onPress={() => handleNumberPress(".")} />
          <NumberButton value="0" onPress={() => handleNumberPress("0")} />
          <Pressable
            style={[styles.numberButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={handleBackspace}
            onLongPress={handleClear}
          >
            <Feather name="delete" size={24} color={theme.text} />
          </Pressable>
        </View>
      </View>
      
      <Pressable
        style={[
          styles.chargeButton,
          { backgroundColor: parseFloat(amount) > 0 ? theme.accent : theme.backgroundTertiary },
        ]}
        onPress={handleCharge}
        disabled={loading || !parseFloat(amount)}
      >
        {loading ? (
          <ActivityIndicator color={theme.buttonText} />
        ) : (
          <>
            <Feather name="wifi" size={24} color={theme.buttonText} style={{ marginRight: Spacing.sm }} />
            <ThemedText style={[styles.chargeButtonText, { color: theme.buttonText }]}>
              Charge {formatAmount(amount)}
            </ThemedText>
          </>
        )}
      </Pressable>
      
      <View style={{ height: insets.bottom + Spacing.lg }} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerSubtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginVertical: Spacing["2xl"],
  },
  dollarSign: {
    ...Typography.h2,
    marginTop: Spacing.md,
    marginRight: Spacing.xs,
  },
  amountText: {
    fontSize: 72,
    fontWeight: "200",
    letterSpacing: -2,
  },
  descriptionContainer: {
    marginBottom: Spacing["2xl"],
  },
  descriptionInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    borderWidth: 1,
  },
  keypad: {
    flex: 1,
    maxHeight: 320,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  numberButton: {
    flex: 1,
    height: 72,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 32,
    fontWeight: "500",
  },
  chargeButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  chargeButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  setupContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  setupTitle: {
    ...Typography.h3,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  setupDescription: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 26,
  },
  connectButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    width: "100%",
  },
  connectButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  refreshButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  refreshText: {
    ...Typography.small,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  successTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  successAmount: {
    fontSize: 48,
    fontWeight: "200",
    marginBottom: Spacing.lg,
  },
  successDescription: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 26,
  },
  newSaleButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    marginTop: Spacing["2xl"],
  },
  newSaleButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  linkActions: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  actionButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  qrContainer: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrCenterOverlay: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    maxWidth: 80,
  },
  qrCenterText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
  },
  qrInstructions: {
    ...Typography.body,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  qrPlaceholder: {
    width: "100%",
    height: 320,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.lg,
  },
  nfcIconContainer: {
    alignItems: "center",
    marginVertical: Spacing["3xl"],
  },
  nfcIcon: {
    width: 180,
    height: 180,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
  },
  animatedIconWrapper: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  setupIconContainer: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 12,
  },
});
