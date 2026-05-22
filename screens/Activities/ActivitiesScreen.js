import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ActivityDetailsModal from './ActivityDetailsModal';

const GAP = 12;
const CONTENT_MAX_WIDTH = 1440;

const COLORS = {
  bg: '#f4fbf6',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#475569',
  border: '#e2e8f0',
  green: '#16a34a',
  greenSoft: '#dcfce7',
  greenSoft2: '#ecfdf5',
  chipBg: '#f8fafc',
  shadow: '#000',
};

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function getLocalizedActivityField(activity, baseField, language) {
  const normalizedLanguage = normalizeLanguage(language);
  return (
    activity?.[`${baseField}_${normalizedLanguage}`] ||
    activity?.[`${baseField}_ar`] ||
    activity?.[`${baseField}_he`] ||
    activity?.[`${baseField}_en`] ||
    activity?.[baseField] ||
    ''
  );
}

function getActivityDateValue(activity, keys) {
  for (const key of keys) {
    if (activity?.[key]) return activity[key];
  }
  return null;
}

function formatActivitySchedule(activity, language) {
  const locale = normalizeLanguage(language) === 'he' ? 'he-IL' : normalizeLanguage(language) === 'ar' ? 'ar-EG' : 'en-US';
  const startDateRaw = getActivityDateValue(activity, ['start_date', 'activity_date', 'date']);
  const endDateRaw = getActivityDateValue(activity, ['end_date', 'activity_end_date', 'date_end']);
  const startTimeRaw = getActivityDateValue(activity, ['start_time', 'time_start', 'activity_time']);
  const endTimeRaw = getActivityDateValue(activity, ['end_time', 'time_end']);

  const formatDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(parsed);
  };

  const formatTime = (value) => {
    if (!value) return '';
    const safeValue = String(value).trim();
    const parsed = new Date(`2000-01-01T${safeValue}`);
    if (Number.isNaN(parsed.getTime())) return safeValue;
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  };

  const startDate = formatDate(startDateRaw);
  const endDate = formatDate(endDateRaw);
  const startTime = formatTime(startTimeRaw);
  const endTime = formatTime(endTimeRaw);

  const dayRange = startDate && endDate && startDate !== endDate
    ? `${startDate} - ${endDate}`
    : startDate || endDate || '';
  const timeRange = startTime && endTime
    ? `${startTime} - ${endTime}`
    : startTime || endTime || '';

  return {
    dayRange,
    timeRange,
  };
}

function getActivitySchoolLabel(activity, language) {
  return (
    getLocalizedActivityField(activity, 'school_name', language) ||
    getLocalizedActivityField(activity, 'school', language) ||
    getLocalizedActivityField(activity, 'host_school', language) ||
    getLocalizedActivityField(activity, 'venue_name', language) ||
    getLocalizedActivityField(activity, 'location_name', language) ||
    getLocalizedActivityField(activity, 'location', language) ||
    ''
  );
}

function Stagger({ index, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: Math.min(index * 55, 450),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: Math.min(index * 55, 450),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function ActivityCard({ item, index, onPress, language, t }) {
  const animation = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue) => {
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  };

  const scale = animation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const translateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const imgH = [190, 140, 170, 210][index % 4];
  const schedule = formatActivitySchedule(item, language);
  const schoolLabel = getActivitySchoolLabel(item, language);

  return (
    <Stagger index={index}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
        onHoverIn={Platform.OS === 'web' ? () => animateTo(1) : undefined}
        onHoverOut={Platform.OS === 'web' ? () => animateTo(0) : undefined}
        style={styles.cardOuter}
      >
        <Animated.View style={[styles.card, { transform: [{ translateY }, { scale }] }]}>
          <View style={styles.imageWrap}>
            <Image source={{ uri: item.image }} style={[styles.image, { height: imgH }]} />
            <View style={styles.imageOverlay} />

            <View style={styles.cornerTag}>
              <FontAwesome name="map-marker" size={12} color={COLORS.green} />
              <Text style={styles.cornerTagText}>{schoolLabel || t('card.region')}</Text>
            </View>

            <View style={styles.seatsPill}>
              <Text style={styles.seatsText}>
                👥 {item.registered}/{item.capacity}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.metaStrip}>
              {schedule.dayRange ? (
                <View style={styles.metaChip}>
                  <FontAwesome name="calendar" size={12} color={COLORS.green} />
                  <Text style={styles.metaChipText}>{schedule.dayRange}</Text>
                </View>
              ) : null}

              {schedule.timeRange ? (
                <View style={styles.metaChip}>
                  <FontAwesome name="clock-o" size={12} color={COLORS.green} />
                  <Text style={styles.metaChipText}>{schedule.timeRange}</Text>
                </View>
              ) : null}
            </View>

            <Text numberOfLines={2} style={styles.title}>
              {getLocalizedActivityField(item, 'title', language)}
            </Text>

            <Text numberOfLines={2} style={styles.desc}>
              {getLocalizedActivityField(item, 'description', language)}
            </Text>

            {schoolLabel ? (
              <View style={styles.schoolRow}>
                <FontAwesome name="building-o" size={13} color="#2563eb" />
                <Text numberOfLines={1} style={styles.schoolText}>{schoolLabel}</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <View style={styles.pricePill}>
                <Text style={styles.priceText}>
                  {Number(item.price) === 0 ? t('card.free') : `${item.price}₪`}
                </Text>
              </View>

              <View style={styles.ctaMini}>
                <Text style={styles.ctaMiniText}>{t('card.details')}</Text>
                <FontAwesome name="chevron-left" size={12} color="#fff" />
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Stagger>
  );
}

function InfoCard({ icon, title, desc }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <FontAwesome name={icon} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function ExampleCard({ icon, title, desc, style }) {
  return (
    <View style={[styles.exampleCard, style]}>
      <View style={styles.exampleIcon}>
        <Text style={styles.exampleIconText}>{icon}</Text>
      </View>
      <Text style={styles.exampleTitle}>{title}</Text>
      <Text style={styles.exampleDesc}>{desc}</Text>
    </View>
  );
}

function FaqItem({ q, a }) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQ}>{q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const translation = useTranslation('activities');
  const t = translation?.t || ((key) => key);
  const language = translation?.i18n?.language || 'ar';

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeChip, setActiveChip] = useState('all');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .order('activity_date', { ascending: true });

    if (error) {
      console.log('Supabase activities error:', error);
      setActivities([]);
      setLoading(false);
      return;
    }

    setActivities(
      (data || []).map((activity) => ({
        ...activity,
        image:
          activity.image_url ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        isRegistered: false,
      }))
    );

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleRegister = async (activity) => {
    if (!user) return;

    let updatedSelected = null;

    const updated = activities.map((entry) => {
      if (entry.id !== activity.id) return entry;

      if (entry.isRegistered) {
        updatedSelected = {
          ...entry,
          isRegistered: false,
          registered: Math.max(0, Number(entry.registered || 0) - 1),
        };
        return updatedSelected;
      }

      updatedSelected = {
        ...entry,
        isRegistered: true,
        registered: Number(entry.registered || 0) + 1,
      };
      return updatedSelected;
    });

    setActivities(updated);

    if (updatedSelected) {
      setSelected(updatedSelected);
    }
  };

  const chips = useMemo(
    () => [
      { key: 'all', icon: 'th-large', label: t('filters.all') },
      { key: 'workshops', icon: 'wrench', label: t('filters.workshops') },
      { key: 'lectures', icon: 'microphone', label: t('filters.lectures') },
      { key: 'competitions', icon: 'trophy', label: t('filters.competitions') },
      { key: 'afterSchool', icon: 'graduation-cap', label: t('filters.afterSchool') },
    ],
    [t]
  );

  const examples = useMemo(() => {
    const data = t('examples', { returnObjects: true });
    return Array.isArray(data) ? data : [];
  }, [t]);

  const faqs = useMemo(() => {
    const data = t('faq', { returnObjects: true });
    return Array.isArray(data) ? data : [];
  }, [t]);

  const visibleActivities = useMemo(() => activities, [activities]);
  const showDesktopLayout = width >= 1100;
  const contentWidth = Math.min(Math.max(width - 32, 0), CONTENT_MAX_WIDTH);
  const numColumns = width >= 1700 ? 4 : width >= 1280 ? 3 : width >= 820 ? 2 : 1;
  const cardWidth =
    numColumns > 1
      ? Math.max(260, Math.floor((contentWidth - GAP * (numColumns - 1)) / numColumns))
      : contentWidth;

  const heroExamples = useMemo(() => examples.slice(0, showDesktopLayout ? 3 : 2), [examples, showDesktopLayout]);
  const exampleCardStyle = useMemo(
    () => ({
      width: width >= 1200 ? 210 : width >= 900 ? 190 : '100%',
      flexGrow: width >= 900 ? 1 : 0,
      flexBasis: width >= 1200 ? 210 : width >= 900 ? 190 : '100%',
    }),
    [width]
  );

  const header = useMemo(
    () => (
      <View style={styles.headerWrap}>
        <View style={styles.hero}>
          <View style={[styles.heroMainRow, showDesktopLayout && styles.heroMainRowWide]}>
            <View style={[styles.heroIntro, showDesktopLayout && styles.heroIntroWide]}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroIcon}>
                  <FontAwesome name="rocket" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>{t('hero.title')}</Text>
                  <Text style={styles.heroSub}>{t('hero.subtitle')}</Text>
                </View>
              </View>

              <Text style={styles.heroText}>{t('hero.description')}</Text>

              {heroExamples.length ? (
                <View style={styles.heroExamplesBlock}>
                  <View style={styles.heroExamplesHead}>
                    <Text style={styles.heroExamplesTitle}>{t('sections.examples')}</Text>
                    <Text style={styles.heroExamplesHint}>
                      {Platform.OS === 'web' ? t('sections.examplesHintWeb') : t('sections.examplesHintMobile')}
                    </Text>
                  </View>

                  <View style={styles.heroExamplesGrid}>
                    {heroExamples.map((item, index) => (
                      <ExampleCard
                        key={`${item.title}-hero-${index}`}
                        icon={item.icon}
                        title={item.title}
                        desc={item.desc}
                        style={exampleCardStyle}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            <View style={[styles.infoGrid, showDesktopLayout && styles.infoGridWide]}>
              <InfoCard icon="map-marker" title={t('info.whereTitle')} desc={t('info.whereDesc')} />
              <InfoCard icon="users" title={t('info.whoTitle')} desc={t('info.whoDesc')} />
              <InfoCard icon="compass" title={t('info.goalTitle')} desc={t('info.goalDesc')} />
              <InfoCard icon="cogs" title={t('info.howTitle')} desc={t('info.howDesc')} />
            </View>
          </View>

          <View style={styles.chipsRow}>
            {chips.map((chip) => {
              const isActive = chip.key === activeChip;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setActiveChip(chip.key)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <FontAwesome name={chip.icon} size={12} color={isActive ? '#fff' : COLORS.green} />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('sections.faq')}</Text>
          <Text style={styles.sectionHint}>{t('sections.faqHint')}</Text>
        </View>

        <View style={styles.faqWrap}>
          {faqs.map((item, index) => (
            <FaqItem key={`${item.q}-${index}`} q={item.q} a={item.a} />
          ))}
        </View>

        <View style={[styles.sectionRow, { marginTop: 14 }]}>
          <Text style={styles.sectionTitle}>{t('sections.upcoming')}</Text>
          <Text style={styles.sectionHint}>
            {Platform.OS === 'web' ? t('sections.upcomingHintWeb') : t('sections.upcomingHintMobile')}
          </Text>
        </View>
      </View>
    ),
    [activeChip, chips, exampleCardStyle, faqs, heroExamples, showDesktopLayout, t]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={{ marginTop: 10, color: COLORS.muted, fontWeight: '700' }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleActivities}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        renderItem={({ item, index }) => (
          <View style={[styles.cardColumn, { width: cardWidth }]}>
            <ActivityCard
              item={item}
              index={index}
              onPress={() => setSelected(item)}
              language={language}
              t={t}
            />
          </View>
        )}
        columnWrapperStyle={numColumns > 1 ? { gap: GAP, marginBottom: GAP } : undefined}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="calendar" size={22} color={COLORS.green} />
            </View>
            <Text style={styles.emptyTitle}>{t('empty.title')}</Text>
            <Text style={styles.emptyText}>{t('empty.text')}</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <ActivityDetailsModal
        visible={!!selected}
        activity={selected}
        onClose={() => setSelected(null)}
        onToggleRegister={toggleRegister}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: 16,
    paddingBottom: 28,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  headerWrap: { paddingBottom: 6 },
  hero: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroMainRow: {
    gap: 14,
  },
  heroMainRowWide: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
  },
  heroIntro: {
    flexShrink: 1,
  },
  heroIntroWide: {
    flex: 1.2,
  },
  heroTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: { fontWeight: '900', fontSize: 18, color: COLORS.text, textAlign: 'right' },
  heroSub: { marginTop: 2, fontWeight: '800', color: COLORS.muted, textAlign: 'right', fontSize: 17 },
  heroText: { marginTop: 10, color: COLORS.muted, lineHeight: 20, fontSize: 16, textAlign: 'right' },
  infoGrid: { marginTop: 2, gap: 10 },
  infoGridWide: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
  },
  infoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: COLORS.greenSoft2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    minHeight: 76,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: { fontWeight: '900', color: COLORS.text, textAlign: 'right' },
  infoDesc: { marginTop: 2, fontWeight: '800', color: COLORS.muted, textAlign: 'right', fontSize: 17 },
  chipsRow: { marginTop: 14, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  chipText: { fontWeight: '900', color: COLORS.green, fontSize: 17 },
  chipTextActive: { color: '#fff' },
  sectionRow: {
    marginTop: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: { fontWeight: '900', fontSize: 16, color: COLORS.text, textAlign: 'right' },
  sectionHint: { color: COLORS.muted, fontWeight: '700', fontSize: 17, textAlign: 'right' },
  heroExamplesBlock: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  heroExamplesHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  heroExamplesTitle: {
    fontWeight: '900',
    fontSize: 17,
    color: COLORS.text,
    textAlign: 'right',
  },
  heroExamplesHint: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.muted,
    textAlign: 'right',
  },
  heroExamplesGrid: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  exampleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  exampleIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.greenSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignSelf: 'flex-end',
  },
  exampleIconText: { fontSize: 18 },
  exampleTitle: { marginTop: 10, fontWeight: '900', color: COLORS.text, textAlign: 'right', fontSize: 16 },
  exampleDesc: { marginTop: 6, color: COLORS.muted, lineHeight: 18, fontSize: 17, textAlign: 'right' },
  faqWrap: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  faqQ: { fontWeight: '900', color: COLORS.text, textAlign: 'right' },
  faqA: { marginTop: 6, color: COLORS.muted, lineHeight: 19, textAlign: 'right' },
  cardColumn: {
    flexShrink: 0,
  },
  cardOuter: { flex: 1 },
  card: {
    height: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe7e2',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%' },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  cornerTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  cornerTagText: { fontWeight: '900', fontSize: 17, color: COLORS.green },
  seatsPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  seatsText: { fontWeight: '900', color: COLORS.text, fontSize: 17 },
  cardBody: { padding: 14, paddingTop: 13, flexGrow: 1 },
  metaStrip: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  metaChipText: {
    color: '#166534',
    fontSize: 16,
    fontWeight: '900',
  },
  title: { fontWeight: '900', fontSize: 17, marginBottom: 6, color: COLORS.text, textAlign: 'right' },
  desc: { fontSize: 16, color: COLORS.muted, lineHeight: 20, textAlign: 'right' },
  schoolRow: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
  },
  schoolText: {
    flex: 1,
    color: '#2563eb',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  pricePill: {
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  priceText: { fontWeight: '900', color: COLORS.green },
  ctaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },
  ctaMiniText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  emptyWrap: {
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.greenSoft2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontWeight: '900', fontSize: 16, color: COLORS.text },
  emptyText: { marginTop: 6, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
});
