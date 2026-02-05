import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Dimensions,
  TextInput,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { 
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { getBusinessKnowledge, updateBusinessKnowledge, scrapeWebsite, BusinessKnowledgeData, getTrainingData, crawlWebsite, deleteTrainingData, addQAPair, TrainingDataItem } from "@/lib/api";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const lightPlayBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

type BusinessInfoNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  "BusinessInfo"
>;

interface BusinessKnowledge {
  websiteUrl?: string;
  aboutBusiness?: string;
  servicesDescription?: string;
  hoursOfOperation?: string;
  locationInfo?: string;
  faqJson?: string;
  additionalInfo?: string;
}

interface FAQ {
  question: string;
  answer: string;
}

function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={30} tint="light" style={[styles.glassPanel, style]}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.glassPanel, styles.glassPanelAndroid, style]}>
      {children}
    </View>
  );
}

export default function BusinessInfoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BusinessInfoNavigationProp>();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [training, setTraining] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [aboutBusiness, setAboutBusiness] = useState("");
  const [servicesDescription, setServicesDescription] = useState("");
  const [hoursOfOperation, setHoursOfOperation] = useState("");
  const [locationInfo, setLocationInfo] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  
  // Training data (crawled pages and Q&A)
  const [trainingData, setTrainingData] = useState<TrainingDataItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [showQaForm, setShowQaForm] = useState(false);

  useEffect(() => {
    loadBusinessKnowledge();
    loadTrainingData();
  }, []);

  const loadBusinessKnowledge = async () => {
    setLoading(true);
    try {
      const response = await getBusinessKnowledge();
      if (response.knowledge) {
        const k = response.knowledge;
        setWebsiteUrl(k.websiteUrl || "");
        setCrawlUrl(k.websiteUrl || "");
        setAboutBusiness(k.aboutBusiness || "");
        setServicesDescription(k.servicesDescription || "");
        setHoursOfOperation(k.hoursOfOperation || "");
        setLocationInfo(k.locationInfo || "");
        setAdditionalInfo(k.additionalInfo || "");
        try {
          const parsedFaqs = k.faqJson ? JSON.parse(k.faqJson) : [];
          setFaqs(parsedFaqs);
        } catch {
          setFaqs([]);
        }
      }
    } catch (error) {
      console.error("Error loading business knowledge:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingData = async () => {
    try {
      const data = await getTrainingData();
      setTrainingData(data);
    } catch (error) {
      console.error("Error loading training data:", error);
    }
  };

  const handleCrawlWebsite = async () => {
    if (!crawlUrl.trim()) {
      Alert.alert("URL Required", "Please enter a website URL.");
      return;
    }

    let url = crawlUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
      setCrawlUrl(url);
    }

    setCrawling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await crawlWebsite(url, 10);
      if (response.pagesCrawled === 0) {
        throw new Error("No pages could be crawled. Please check the URL and try again.");
      }
      await loadTrainingData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Website content has been crawled and added to training data. ${response.pagesCrawled} page(s) processed.`);
    } catch (error: any) {
      console.error("Error crawling website:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Crawl Failed", error.message || "Could not crawl the website. Please try again.");
    } finally {
      setCrawling(false);
    }
  };

  const handleDeleteTrainingItem = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await deleteTrainingData(id);
      setTrainingData(trainingData.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting training data:", error);
      Alert.alert("Error", "Could not delete this item.");
    }
  };

  const handleAddQa = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      Alert.alert("Required", "Please enter both question and answer.");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addQAPair(newQuestion.trim(), newAnswer.trim());
      setNewQuestion("");
      setNewAnswer("");
      setShowQaForm(false);
      await loadTrainingData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not add Q&A pair.");
    }
  };

  const handleTrainFromWebsite = async () => {
    if (!websiteUrl.trim()) {
      Alert.alert("Website Required", "Please enter your website URL first.");
      return;
    }

    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
      setWebsiteUrl(url);
    }

    setTraining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await scrapeWebsite(url);
      if (response.knowledge) {
        const k = response.knowledge;
        setAboutBusiness(k.aboutBusiness || "");
        setServicesDescription(k.servicesDescription || "");
        setHoursOfOperation(k.hoursOfOperation || "");
        setLocationInfo(k.locationInfo || "");
        setAdditionalInfo(k.additionalInfo || "");
        try {
          const parsedFaqs = k.faqJson ? JSON.parse(k.faqJson) : [];
          setFaqs(parsedFaqs);
        } catch {
          setFaqs([]);
        }
        setHasChanges(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Training Complete", "We've learned information from your website. Review and edit as needed.");
      }
    } catch (error: any) {
      console.error("Error training from website:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Training Failed", error.message || "Could not learn information from the website. Please try again or enter details manually.");
    } finally {
      setTraining(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateBusinessKnowledge({
        websiteUrl,
        aboutBusiness,
        servicesDescription,
        hoursOfOperation,
        locationInfo,
        faqJson: JSON.stringify(faqs),
        additionalInfo,
      });
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your business information has been updated. Your voice assistant will now use this info to answer questions.");
    } catch (error: any) {
      console.error("Error saving business knowledge:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
    setHasChanges(true);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateFaq = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
    setHasChanges(true);
  };

  const markChanged = () => setHasChanges(true);

  if (loading) {
    return (
      <ImageBackground source={lightPlayBackground} style={styles.background} resizeMode="cover">
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={lightPlayBackground} style={styles.background} resizeMode="cover">
      <KeyboardAwareScrollViewCompat
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + 120 }
        ]}
      >
        <Animated.View entering={FadeIn.duration(600)}>
          <ThemedText style={styles.title}>VOICE ASSISTANT INFO</ThemedText>
          <ThemedText style={styles.subtitle}>
            This information powers your AI voice assistant. Customers calling will get answers based on what you enter here.
          </ThemedText>
        </Animated.View>

        {/* Web Crawler Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ThemedText style={styles.sectionLabel}>Web Crawler</ThemedText>
          <GlassPanel style={styles.section}>
            <ThemedText style={styles.sectionDescription}>
              Enter a website URL to automatically extract content for training. For large sites, we'll start with the most relevant pages.
            </ThemedText>
            
            <View style={styles.crawlInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={crawlUrl}
                onChangeText={setCrawlUrl}
                placeholder="https://example.com"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Pressable
                onPress={handleCrawlWebsite}
                disabled={crawling || !crawlUrl.trim()}
                style={[styles.getDataButton, (crawling || !crawlUrl.trim()) && styles.actionButtonDisabled]}
              >
                {crawling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.getDataButtonText}>Get Data</ThemedText>
                )}
              </Pressable>
            </View>
          </GlassPanel>
        </Animated.View>

        {/* Uploaded Links Section */}
        {trainingData.filter(d => d.type === 'website_crawl').length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View style={styles.sectionLabelRow}>
              <ThemedText style={styles.sectionLabel}>Uploaded Links</ThemedText>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countText}>{trainingData.filter(d => d.type === 'website_crawl').length}</ThemedText>
              </View>
            </View>
            <GlassPanel style={styles.section}>
              {trainingData.filter(d => d.type === 'website_crawl').map((item) => (
                <View key={item.id} style={styles.uploadedLinkRow}>
                  <View style={styles.linkIconContainer}>
                    <Feather name="globe" size={16} color="rgba(100,150,255,0.8)" />
                  </View>
                  <View style={styles.linkTextContainer}>
                    <ThemedText style={styles.linkTitle} numberOfLines={1}>
                      {item.title || "Untitled Page"}
                    </ThemedText>
                    <ThemedText style={styles.linkUrl} numberOfLines={1}>
                      {item.sourceUrl}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteTrainingItem(item.id)}
                    style={styles.deleteButton}
                  >
                    <Feather name="trash-2" size={18} color="rgba(255,100,100,0.8)" />
                  </Pressable>
                </View>
              ))}
            </GlassPanel>
          </Animated.View>
        )}

        {/* Custom Q&A Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.sectionLabelRow}>
            <ThemedText style={styles.sectionLabel}>Custom Q&A</ThemedText>
            <Pressable onPress={() => setShowQaForm(!showQaForm)}>
              <ThemedText style={styles.addQaLink}>+ Add Q&A</ThemedText>
            </Pressable>
          </View>
          <GlassPanel style={styles.section}>
            {showQaForm && (
              <View style={styles.qaFormContainer}>
                <TextInput
                  style={styles.textInput}
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                  placeholder="Question (e.g., What are your hours?)"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                  value={newAnswer}
                  onChangeText={setNewAnswer}
                  placeholder="Answer..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                />
                <Pressable onPress={handleAddQa} style={styles.actionButton}>
                  <Feather name="plus" size={18} color="#fff" />
                  <ThemedText style={styles.actionButtonText}>Add Q&A</ThemedText>
                </Pressable>
              </View>
            )}
            
            {trainingData.filter(d => d.type === 'qa_pair').length === 0 && !showQaForm ? (
              <View style={styles.emptyQaContainer}>
                <Feather name="message-square" size={32} color="rgba(255,255,255,0.3)" />
                <ThemedText style={styles.emptyQaText}>No custom Q&A pairs yet</ThemedText>
              </View>
            ) : (
              trainingData.filter(d => d.type === 'qa_pair').map((item) => (
                <View key={item.id} style={styles.qaItemRow}>
                  <View style={styles.qaItemContent}>
                    <ThemedText style={styles.qaQuestion}>Q: {item.question}</ThemedText>
                    <ThemedText style={styles.qaAnswer}>A: {item.answer}</ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteTrainingItem(item.id)}
                    style={styles.deleteButton}
                  >
                    <Feather name="trash-2" size={18} color="rgba(255,100,100,0.8)" />
                  </Pressable>
                </View>
              ))
            )}
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassPanel style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="info" size={18} color="#fff" />
              <ThemedText style={styles.sectionTitle}>About Your Business</ThemedText>
            </View>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={aboutBusiness}
              onChangeText={(text) => { setAboutBusiness(text); markChanged(); }}
              placeholder="Tell customers what your business does, your mission, and what makes you special..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
            />
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <GlassPanel style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="list" size={18} color="#fff" />
              <ThemedText style={styles.sectionTitle}>Services Details</ThemedText>
            </View>
            <ThemedText style={styles.sectionDescription}>
              Additional details about your services beyond pricing (e.g., what's included, preparation needed).
            </ThemedText>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={servicesDescription}
              onChangeText={(text) => { setServicesDescription(text); markChanged(); }}
              placeholder="Describe your services in more detail..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
            />
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <GlassPanel style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="clock" size={18} color="#fff" />
              <ThemedText style={styles.sectionTitle}>Hours of Operation</ThemedText>
            </View>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={hoursOfOperation}
              onChangeText={(text) => { setHoursOfOperation(text); markChanged(); }}
              placeholder="Mon-Fri: 9am - 5pm&#10;Sat: 10am - 2pm&#10;Sun: Closed"
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={3}
            />
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <GlassPanel style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="map-pin" size={18} color="#fff" />
              <ThemedText style={styles.sectionTitle}>Location</ThemedText>
            </View>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={locationInfo}
              onChangeText={(text) => { setLocationInfo(text); markChanged(); }}
              placeholder="Your address, service area, parking info, landmarks..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={3}
            />
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <GlassPanel style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="help-circle" size={18} color="#fff" />
              <ThemedText style={styles.sectionTitle}>FAQs</ThemedText>
            </View>
            <ThemedText style={styles.sectionDescription}>
              Common questions customers might ask. The voice assistant will use these to answer.
            </ThemedText>
            
            {faqs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <View style={styles.faqHeader}>
                  <ThemedText style={styles.faqLabel}>Q{index + 1}</ThemedText>
                  <Pressable onPress={() => handleRemoveFaq(index)} hitSlop={10}>
                    <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={faq.question}
                  onChangeText={(text) => handleUpdateFaq(index, "question", text)}
                  placeholder="Question..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput, { marginTop: Spacing.sm }]}
                  value={faq.answer}
                  onChangeText={(text) => handleUpdateFaq(index, "answer", text)}
                  placeholder="Answer..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}
            
            <Pressable onPress={handleAddFaq} style={styles.addFaqButton}>
              <Feather name="plus" size={18} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.addFaqText}>Add FAQ</ThemedText>
            </Pressable>
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <GlassPanel style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="file-text" size={18} color="#fff" />
              <ThemedText style={styles.sectionTitle}>Additional Info</ThemedText>
            </View>
            <ThemedText style={styles.sectionDescription}>
              Any other helpful information (payment methods, policies, team info, etc.)
            </ThemedText>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={additionalInfo}
              onChangeText={(text) => { setAdditionalInfo(text); markChanged(); }}
              placeholder="Other details customers might ask about..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
            />
          </GlassPanel>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, saving && styles.actionButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Feather name="check" size={18} color="#000" />
          )}
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Changes"}
          </ThemedText>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  glassPanel: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    marginTop: 12,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: 15,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: Spacing.sm,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.sm + 4,
  },
  scrapeButton: {
    marginTop: Spacing.md,
  },
  faqItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  faqLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
  addFaqButton: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  addFaqText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  actionButton: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  saveButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  crawlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  getDataButton: {
    backgroundColor: "rgba(100,150,255,0.3)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(100,150,255,0.4)",
  },
  getDataButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  countBadge: {
    backgroundColor: "rgba(100,150,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadedLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  linkIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(100,150,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  linkUrl: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  addQaLink: {
    color: "rgba(100,150,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  qaFormContainer: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  emptyQaContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyQaText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
  qaItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  qaItemContent: {
    flex: 1,
  },
  qaQuestion: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  qaAnswer: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
  },
});
