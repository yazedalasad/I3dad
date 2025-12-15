import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const GAP = 12;
const CARD_WIDTH = (width - 32 - GAP) / 2;

/* ---------------- STAGGER ANIMATION ---------------- */
function Stagger({ index, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 70, 500),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: Math.min(index * 70, 500),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function ActivitiesScreen() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null); // modal activity

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .order('activity_date');

    setActivities(
      (data || []).map((a) => ({
        ...a,
        image:
          a.image_url ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        isRegistered: false, // local state
      }))
    );
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* ---------------- REGISTER / UNREGISTER ---------------- */
  const toggleRegister = async (activity) => {
    if (!user) return;

    const updated = activities.map((a) => {
      if (a.id !== activity.id) return a;

      if (a.isRegistered) {
        return {
          ...a,
          isRegistered: false,
          registered: Math.max(0, a.registered - 1),
        };
      } else {
        return {
          ...a,
          isRegistered: true,
          registered: a.registered + 1,
        };
      }
    });

    setActivities(updated);

    // real DB logic later (step 2)
  };

  /* ---------------- CARD ---------------- */
  const renderCard = ({ item, index }) => {
    const imgH = [190, 140, 170, 210][index % 4];

    return (
      <Stagger index={index}>
        <Pressable
          onPress={() => setSelected(item)}
          style={({ pressed }) => [
            styles.card,
            {
              width: CARD_WIDTH,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Image source={{ uri: item.image }} style={[styles.image, { height: imgH }]} />

          <View style={styles.cardBody}>
            <Text numberOfLines={2} style={styles.title}>
              {item.title_ar}
            </Text>

            <Text numberOfLines={2} style={styles.desc}>
              {item.description_ar}
            </Text>

            <View style={styles.row}>
              <Text style={styles.meta}>
                👥 {item.registered}/{item.capacity}
              </Text>
              <Text style={styles.price}>
                {item.price === 0 ? 'Free' : `${item.price}₪`}
              </Text>
            </View>
          </View>
        </Pressable>
      </Stagger>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={activities}
        keyExtractor={(i) => i.id}
        numColumns={2}
        renderItem={renderCard}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* ---------------- MODAL (FACEBOOK STYLE) ---------------- */}
      <Modal visible={!!selected} animationType="fade" transparent>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modal}>
            {selected && (
              <>
                <Image source={{ uri: selected.image }} style={styles.modalImage} />

                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{selected.title_ar}</Text>

                  <Text style={styles.modalDesc}>{selected.description_ar}</Text>

                  <View style={styles.modalRow}>
                    <Text>👥 {selected.registered}/{selected.capacity}</Text>
                    <Text>{selected.price === 0 ? 'Free' : `${selected.price}₪`}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      selected.isRegistered && styles.actionBtnActive,
                    ]}
                    onPress={() => toggleRegister(selected)}
                  >
                    <FontAwesome
                      name={selected.isRegistered ? 'times' : 'calendar-plus-o'}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.actionText}>
                      {selected.isRegistered ? 'Unregister' : 'Register'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  image: { width: '100%' },
  cardBody: { padding: 12 },
  title: { fontWeight: '900', fontSize: 14, marginBottom: 4 },
  desc: { fontSize: 12, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { fontSize: 12 },
  price: { fontWeight: '900', color: '#3498db' },

  /* MODAL */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  modalImage: { width: '100%', height: 220 },
  modalContent: { padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  modalDesc: { fontSize: 14, color: '#444', marginBottom: 12 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },

  actionBtn: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#3498db',
  },
  actionBtnActive: { backgroundColor: '#e74c3c' },
  actionText: { color: '#fff', fontWeight: '900' },
});
