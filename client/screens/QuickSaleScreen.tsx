import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { api } from "@/lib/api";

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

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    setCheckingStatus(true);
    try {
      const businessId = api.getBusinessId();
      if (!businessId) return;
      
      const response = await fetch(
        `${api.getBaseUrl()}/api/businesses/${businessId}/stripe/status`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-owner-token": await api.getOwnerToken() || "",
          },
        }
      );
      
      if (response.ok) {
        const status = await response.json();
        setStripeStatus(status);
      }
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
      if (!businessId) return;
      
      const response = await fetch(
        `${api.getBaseUrl()}/api/businesses/${businessId}/stripe/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-owner-token": await api.getOwnerToken() || "",
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          if (Platform.OS === "web") {
            window.open(data.url, "_blank");
          } else {
            await Linking.openURL(data.url);
          }
        }
      }
    } catch (error) {
      console.error("Error connecting Stripe:", error);
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
        setPaymentUrl(data.paymentUrl || null);
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

  const formatAmount = (value: string): string => {
    if (!value) return "$0.00";
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return `$${num.toFixed(2)}`;
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
        <View style={styles.setupContainer}>
          <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="credit-card" size={48} color={theme.text} />
          </View>
          
          <ThemedText style={styles.setupTitle}>
            Set Up Payments
          </ThemedText>
          
          <ThemedText style={[styles.setupDescription, { color: theme.textSecondary }]}>
            Connect your Stripe account to accept contactless payments directly from your customers. The money goes straight to your bank account.
          </ThemedText>
          
          <Pressable
            style={[styles.connectButton, { backgroundColor: theme.accent }]}
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
        </View>
      </ThemedView>
    );
  }

  if (saleComplete) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["3xl"] }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: theme.success }]}>
            <Feather name="check" size={64} color={theme.buttonText} />
          </View>
          
          <ThemedText style={styles.successTitle}>
            Payment Link Ready
          </ThemedText>
          
          <ThemedText style={styles.successAmount}>
            {formatAmount(amount)}
          </ThemedText>
          
          <ThemedText style={[styles.successDescription, { color: theme.textSecondary }]}>
            Share this payment link with your customer. They can pay securely with any card or digital wallet.
          </ThemedText>
          
          {paymentUrl ? (
            <View style={styles.linkActions}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                onPress={handleSharePaymentLink}
              >
                <Feather name="share-2" size={20} color={theme.buttonText} style={{ marginRight: Spacing.sm }} />
                <ThemedText style={[styles.actionButtonText, { color: theme.buttonText }]}>
                  Share Link
                </ThemedText>
              </Pressable>
              
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.md }]}
                onPress={handleCopyPaymentLink}
              >
                <Feather name="copy" size={20} color={theme.text} style={{ marginRight: Spacing.sm }} />
                <ThemedText style={[styles.actionButtonText, { color: theme.text }]}>
                  Copy Link
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
          
          <Pressable
            style={[styles.newSaleButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={handleClear}
          >
            <ThemedText style={[styles.newSaleButtonText, { color: theme.text }]}>
              New Sale
            </ThemedText>
          </Pressable>
        </View>
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
        <ThemedText style={styles.dollarSign}>$</ThemedText>
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
});
