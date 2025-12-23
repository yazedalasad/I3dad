import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ActivityDetailsModal from './ActivityDetailsModal';

const { width } = Dimensions.get('window');
const GAP = 12;
const CARD_WIDTH = (width - 32 - GAP) / 2;

/* ---------------- THEME (أخضر + أبيض) ---------------- */
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

/* ---------------- STAGGER ANIMATION ---------------- */
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* ---------------- CARD WITH POP (hover/press) ---------------- */
function ActivityCard({ item, index, onPress }) {
  const t = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue) => {
    Animated.spring(t, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  };

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const imgH = [190, 140, 170, 210][index % 4];

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
        <Animated.View
          style={[
            styles.card,
            { width: CARD_WIDTH, transform: [{ translateY }, { scale }] },
          ]}
        >
          <View style={styles.imageWrap}>
            <Image source={{ uri: item.image }} style={[styles.image, { height: imgH }]} />
            <View style={styles.imageOverlay} />

            <View style={styles.cornerTag}>
              <FontAwesome name="map-marker" size={12} color={COLORS.green} />
              <Text style={styles.cornerTagText}>الجنوب</Text>
            </View>

            <View style={styles.seatsPill}>
              <Text style={styles.seatsText}>
                👥 {item.registered}/{item.capacity}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text numberOfLines={2} style={styles.title}>
              {item.title_ar}
            </Text>

            <Text numberOfLines={2} style={styles.desc}>
              {item.description_ar}
            </Text>

            <View style={styles.row}>
              <View style={styles.pricePill}>
                <Text style={styles.priceText}>
                  {Number(item.price) === 0 ? 'مجّاني' : `${item.price}₪`}
                </Text>
              </View>

              <View style={styles.ctaMini}>
                <Text style={styles.ctaMiniText}>تفاصيل</Text>
                <FontAwesome name="chevron-left" size={12} color="#fff" />
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Stagger>
  );
}

/* ---------------- MINI SECTION CARD ---------------- */
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

/* ---------------- EXAMPLE CARD ---------------- */
function ExampleCard({ icon, title, desc }) {
  return (
    <View style={styles.exampleCard}>
      <View style={styles.exampleIcon}>
        <Text style={styles.exampleIconText}>{icon}</Text>
      </View>
      <Text style={styles.exampleTitle}>{title}</Text>
      <Text style={styles.exampleDesc}>{desc}</Text>
    </View>
  );
}

/* ---------------- FAQ ITEM ---------------- */
function FaqItem({ q, a }) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQ}>{q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function ActivitiesScreen() {
  const { user } = useAuth();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState(null); // modal activity

  // UI-only filters (شكل فقط حالياً)
  const [activeChip, setActiveChip] = useState('الكل');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    // نفس منطق الداتا تقريباً - بدون تغييرات كبيرة
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
      (data || []).map((a) => ({
        ...a,
        image:
          a.image_url ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        isRegistered: false, // local state for now
      }))
    );

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* ---------------- REGISTER / UNREGISTER (UI only) ---------------- */
  const toggleRegister = async (activity) => {
    if (!user) return;

    const updated = activities.map((a) => {
      if (a.id !== activity.id) return a;

      if (a.isRegistered) {
        return {
          ...a,
          isRegistered: false,
          registered: Math.max(0, Number(a.registered || 0) - 1),
        };
      }
      return {
        ...a,
        isRegistered: true,
        registered: Number(a.registered || 0) + 1,
      };
    });

    setActivities(updated);
    // DB logic later
  };

  const chips = useMemo(
    () => [
      { key: 'الكل', icon: 'th-large' },
      { key: 'ورشات', icon: 'wrench' },
      { key: 'محاضرات', icon: 'microphone' },
      { key: 'مسابقات', icon: 'trophy' },
      { key: 'بعد الدوام', icon: 'graduation-cap' },
    ],
    []
  );

  const examples = useMemo(
    () => [
      {
        icon: '🩺',
        title: 'جرّب تخصص الطب',
        desc: 'تجربة عملية: كيف الطبيب بفكّر؟ مهام بسيطة وأدوات ممتعة.',
      },
      {
        icon: '🎓',
        title: 'لقاء مع طلاب جامعة',
        desc: 'تجارب حقيقية: كيف اختاروا تخصصهم؟ نصائح صادقة من واقعنا.',
      },
      {
        icon: '💻',
        title: 'تحدّي برمجة للمبتدئين',
        desc: 'ألغاز بسيطة + جوّ منافسة + حماس + أحياناً جوائز رمزية.',
      },
      {
        icon: '✍️',
        title: 'ورشة كتابة وإقناع',
        desc: 'كيف تكتب عن نفسك وتعرض أفكارك بثقة؟ مهارة بتفيدك بكل مجال.',
      },
      {
        icon: '🧱',
        title: 'هندسة وبناء',
        desc: 'تصميم نموذج صغير + تفكير هندسي + شغل جماعي ممتع.',
      },
    ],
    []
  );

  const faqs = useMemo(
    () => [
      {
        q: 'هل لازم يكون عندي خبرة مسبقة؟',
        a: 'لا. الفعاليات مناسبة للمبتدئين، وبتبدأ خطوة خطوة وبأسلوب ممتع.',
      },
      {
        q: 'وين بتنعمل الفعاليات؟',
        a: 'غالباً داخل المدارس في الجنوب، وأحياناً بمراكز قريبة حسب النشاط.',
      },
      {
        q: 'شو بستفيد بالنهاية؟',
        a: 'بتطلع بفكرة أوضح عن تخصصك المناسب، وتجربة عملية، وثقة أكبر بقرارك.',
      },
    ],
    []
  );

  // حالياً chips شكل فقط (بدون فلترة داتا)
  const visibleActivities = useMemo(() => activities, [activities]);

  const Header = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <FontAwesome name="rocket" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>فعاليات بتقرّبك من حلمك 🎯</Text>
              <Text style={styles.heroSub}>
                لطلاب صف 9–12 • داخل المدارس • في الجنوب
              </Text>
            </View>
          </View>

          <Text style={styles.heroText}>
            هاي الفعاليات معمولة بالأساس لطلاب مجتمعنا العربي في مدارس الجنوب.
            الهدف إنك تكتشف شو بتحب، شو بنفعلك، وكيف تختار تخصص/جامعة بثقة.
            رح تلاقي محاضرات ملهمة، ورشات عملية، ومسابقات ممتعة… وبالآخر بتطلع
            بخطوة واضحة لإلك!
          </Text>

          {/* INFO TABLE STYLE (cards grid) */}
          <View style={styles.infoGrid}>
            <InfoCard icon="map-marker" title="أين؟" desc="مدارس الجنوب" />
            <InfoCard icon="users" title="لمين؟" desc="طلاب صف 9–12" />
            <InfoCard icon="compass" title="الهدف؟" desc="تخصص/مهنة مناسبة" />
            <InfoCard icon="cogs" title="كيف؟" desc="ورش + محاضرات + تجارب" />
          </View>

          {/* CHIPS */}
          <View style={styles.chipsRow}>
            {chips.map((c) => {
              const active = c.key === activeChip;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setActiveChip(c.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <FontAwesome name={c.icon} size={12} color={active ? '#fff' : COLORS.green} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* EXAMPLES */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>أمثلة عن فعالياتنا 🔥</Text>
          <Text style={styles.sectionHint}>
            {Platform.OS === 'web' ? 'مرّر الماوس' : 'اسحب'} وشوف الأفكار
          </Text>
        </View>

        <FlatList
          data={examples}
          keyExtractor={(x, i) => `${x.title}-${i}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 2, gap: 10 }}
          renderItem={({ item }) => (
            <ExampleCard icon={item.icon} title={item.title} desc={item.desc} />
          )}
        />

        {/* FAQ */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>أسئلة سريعة 💡</Text>
          <Text style={styles.sectionHint}>إجابات مختصرة وواضحة</Text>
        </View>

        <View style={styles.faqWrap}>
          {faqs.map((f, i) => (
            <FaqItem key={`${f.q}-${i}`} q={f.q} a={f.a} />
          ))}
        </View>

        {/* LIST TITLE */}
        <View style={[styles.sectionRow, { marginTop: 14 }]}>
          <Text style={styles.sectionTitle}>الفعاليات القادمة</Text>
          <Text style={styles.sectionHint}>
            {Platform.OS === 'web' ? 'Hover' : 'اضغط'} على الكرت للتفاصيل
          </Text>
        </View>
      </View>
    );
  }, [activeChip, chips, examples, faqs]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={{ marginTop: 10, color: COLORS.muted, fontWeight: '700' }}>
          جاري تحميل الفعاليات…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleActivities}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        renderItem={({ item, index }) => (
          <ActivityCard item={item} index={index} onPress={() => setSelected(item)} />
        )}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="calendar" size={22} color={COLORS.green} />
            </View>
            <Text style={styles.emptyTitle}>ما في فعاليات حالياً</Text>
            <Text style={styles.emptyText}>
              اسحب لتحديث الصفحة، أو ارجع بعد فترة — رح تنزل فعاليات جديدة قريباً.
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Modal component (file موجود بنفس المجلد) */}
      <ActivityDetailsModal
        visible={!!selected}
        activity={selected}
        onClose={() => setSelected(null)}
        onToggleRegister={toggleRegister}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerWrap: { paddingBottom: 10 },

  hero: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
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
  heroSub: { marginTop: 2, fontWeight: '800', color: COLORS.muted, textAlign: 'right', fontSize: 12 },
  heroText: {
    marginTop: 10,
    color: COLORS.muted,
    lineHeight: 20,
    fontSize: 13,
    textAlign: 'right',
  },

  infoGrid: {
    marginTop: 12,
    gap: 10,
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
  infoDesc: { marginTop: 2, fontWeight: '800', color: COLORS.muted, textAlign: 'right', fontSize: 12 },

  chipsRow: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  chipText: { fontWeight: '900', color: COLORS.green, fontSize: 12 },
  chipTextActive: { color: '#fff' },

  sectionRow: {
    marginTop: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: { fontWeight: '900', fontSize: 16, color: COLORS.text, textAlign: 'right' },
  sectionHint: { color: COLORS.muted, fontWeight: '700', fontSize: 12, textAlign: 'right' },

  exampleCard: {
    width: 220,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
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
  exampleTitle: { marginTop: 10, fontWeight: '900', color: COLORS.text, textAlign: 'right' },
  exampleDesc: { marginTop: 6, color: COLORS.muted, lineHeight: 18, fontSize: 12, textAlign: 'right' },

  faqWrap: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  faqQ: { fontWeight: '900', color: COLORS.text, textAlign: 'right' },
  faqA: { marginTop: 6, color: COLORS.muted, lineHeight: 19, textAlign: 'right' },

  cardOuter: { flex: 1 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  cornerTagText: { fontWeight: '900', fontSize: 12, color: COLORS.green },

  seatsPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  seatsText: { fontWeight: '900', color: COLORS.text, fontSize: 12 },

  cardBody: { padding: 12 },
  title: { fontWeight: '900', fontSize: 14, marginBottom: 4, color: COLORS.text, textAlign: 'right' },
  desc: { fontSize: 12, color: COLORS.muted, lineHeight: 17, textAlign: 'right' },

  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  pricePill: {
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  priceText: { fontWeight: '900', color: COLORS.green },

  ctaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },
  ctaMiniText: { color: '#fff', fontWeight: '900', fontSize: 12 },

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
