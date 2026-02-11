import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Alert, 
  Platform,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/I18nContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { api } from "@/lib/api";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import * as Haptics from "expo-haptics";

type TrainingDataType = {
  id: string;
  type: 'qa_pair' | 'website_crawl' | 'document';
  question?: string;
  answer?: string;
  content?: string;
  title?: string;
  sourceUrl?: string;
  createdAt: string;
};

const silkBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

export default function AgentTrainingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgentTraining'>>();
  const { businessId, businessName } = route.params;
  const { theme } = useTheme();
  const { t } = useI18n();
  const headerHeight = useHeaderHeight();
  
  const [trainingData, setTrainingData] = useState<TrainingDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [qaModalVisible, setQaModalVisible] = useState(false);
  const [question, setQuestion] = useState("");
  const [addingQa, setAddingQa] = useState(false);
  const [content, setContent] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");

  // Refs for focusing
  const answerRef = React.useRef<TextInput>(null);

  // Added focus tracking to prevent re-render blur
  const [isFocused, setIsFocused] = useState<string | null>(null);

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      const data = await api.apiRequest<TrainingDataType[]>('GET', `/api/businesses/${businessId}/training`);
      setTrainingData(data);
    } catch (error) {
      console.error("Error loading training data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setCrawling(true);
    try {
      const result = await api.apiRequest('POST', `/api/businesses/${businessId}/training/crawl`, {
        url: crawlUrl,
        maxPages: 10
      });
      Alert.alert("Success", "Website content has been crawled and added to training data.");
      loadTrainingData();
      setCrawlUrl("");
    } catch (error) {
      Alert.alert("Error", "Failed to crawl website. Please ensure the URL is correct and public.");
    } finally {
      setCrawling(false);
    }
  };

  const handleAddQa = async () => {
    if (!question || !qaAnswer) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setAddingQa(true);
    try {
      await api.apiRequest('POST', `/api/businesses/${businessId}/training/qa`, {
        question,
        answer: qaAnswer
      });
      setQuestion("");
      setQaAnswer("");
      setQaModalVisible(false);
      loadTrainingData();
    } catch (error) {
      Alert.alert("Error", "Failed to add Q&A pair.");
    } finally {
      setAddingQa(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      await api.apiRequest('DELETE', `/api/training/${id}`);
      setTrainingData(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      Alert.alert("Error", "Failed to delete item.");
    }
  };

  const renderTrainingItem = (item: TrainingDataType) => (
    <View key={item.id} style={[styles.glassCard, styles.itemCard]}>
      <View style={styles.itemIconBox}>
        <Feather 
          name={item.type === 'website_crawl' ? 'globe' : item.type === 'qa_pair' ? 'message-square' : 'file-text'} 
          size={16} 
          color="#fff" 
        />
      </View>
      <View style={styles.itemContent}>
        <ThemedText style={styles.itemTitle} numberOfLines={1}>
          {item.type === 'website_crawl' ? item.title : item.type === 'qa_pair' ? item.question : 'Custom Content'}
        </ThemedText>
        <ThemedText style={styles.itemSubtitle} numberOfLines={1}>
          {item.type === 'website_crawl' ? item.sourceUrl : item.type === 'qa_pair' ? item.answer : item.content}
        </ThemedText>
      </View>
      <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
        <Feather name="trash-2" size={18} color="#EF4444" />
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.backgroundOverlay} />

      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: headerHeight + 20, 
          paddingBottom: 40,
          paddingHorizontal: 24 
        }}
        keyboardShouldPersistTaps="handled"
      >
          <View style={[styles.glassCard, styles.headerCard]}>
            <ThemedText style={styles.headerTitle}>{t('training.title')}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {t('training.subtitle')}
            </ThemedText>
          </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('training.webCrawler')}</ThemedText>
          <View style={[styles.glassCard, styles.crawlCard]}>
            <ThemedText style={styles.cardInfo}>
              {t('training.webCrawlerDesc')}
            </ThemedText>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={t('training.urlPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={crawlUrl}
                onChangeText={setCrawlUrl}
                autoCapitalize="none"
                keyboardType="url"
                textContentType="URL"
              />
              <Pressable 
                style={[styles.crawlButton, crawling && { opacity: 0.7 }]} 
                onPress={handleCrawl}
                disabled={crawling}
              >
                {crawling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.crawlButtonText}>{t('training.getData')}</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('training.customContent')}</ThemedText>
          <ThemedText style={styles.cardInfo}>
            Paste information about your company (services, policies, hours) for the assistant to learn.
          </ThemedText>
          <View style={[styles.glassCard, styles.qaInputCard]}>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder={t('training.customContentPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={content}
              onChangeText={setContent}
              multiline
              onFocus={() => setIsFocused('content')}
              onBlur={() => setIsFocused(null)}
            />
            <View style={styles.qaButtonRow}>
              <Pressable 
                style={[styles.addButton, addingQa && { opacity: 0.7 }]}
                disabled={addingQa}
                onPress={async () => {
                  if (!content) return;
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                  setAddingQa(true);
                  try {
                    await api.apiRequest('POST', `/api/businesses/${businessId}/training/text`, {
                      content: content
                    });
                    setContent("");
                    loadTrainingData();
                  } catch (error) {
                    Alert.alert("Error", "Failed to add content.");
                  } finally {
                    setAddingQa(false);
                  }
                }}
              >
                {addingQa ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <ThemedText style={styles.addButtonText}>{t('training.addContent')}</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Q&A Section removed due to typing issues on iOS */}
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>{t('training.trainingLinks')}</ThemedText>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{trainingData.length}</ThemedText>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#fff" />
          ) : trainingData.length === 0 ? (
            <View style={[styles.glassCard, styles.emptyCard]}>
              <Feather name="inbox" size={32} color="rgba(255,255,255,0.2)" />
              <ThemedText style={styles.emptyText}>{t('training.noTrainingData')}</ThemedText>
            </View>
          ) : (
            trainingData.map(renderTrainingItem)
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerCard: {
    marginBottom: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  crawlCard: {
    gap: 16,
  },
  cardInfo: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 15,
  },
  crawlButton: {
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  crawlButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  addLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  qaInputCard: {
    gap: 12,
  },
  qaInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.lg,
    padding: 16,
    color: "#fff",
    fontSize: 15,
    minHeight: 48,
  },
  qaButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
});
