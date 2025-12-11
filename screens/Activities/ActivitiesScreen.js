import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 40) / 2 - 8;

export default function ActivitiesScreen({ navigateTo }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadActivities();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      
      const allCategory = {
        id: 'all',
        code: 'all',
        name_ar: 'جميع الأنشطة',
        name_he: 'כל הפעילויות',
        icon: 'globe',
        color: '#3498db'
      };
      
      setCategories([allCategory, ...data.map(cat => ({
        ...cat,
        id: cat.id,
        name: cat.name_ar,
        icon: cat.icon,
        color: getCategoryColor(cat.code)
      }))]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // جلب الأنشطة من قاعدة البيانات
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select(`
          *,
          activity_categories (*),
          activity_tags (tag_ar)
        `)
        .eq('is_active', true)
        .order('activity_date', { ascending: true });
      
      if (error) throw error;
      
      // تحويل البيانات لتتناسب مع المكون
      const formattedActivities = activitiesData.map(activity => ({
        id: activity.id,
        title: activity.title_ar,
        category: activity.category_id,
        city: activity.city_ar,
        date: activity.activity_date,
        time: activity.start_time,
        endTime: activity.end_time,
        endDate: activity.end_date,
        location: activity.location_ar,
        organizer: activity.organizer_ar,
        description: activity.description_ar,
        capacity: activity.capacity,
        registered: activity.registered,
        price: activity.price,
        image: activity.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
        tags: activity.activity_tags?.map(tag => tag.tag_ar) || [],
        featured: activity.featured,
        status: activity.status,
        targetAudience: activity.target_audience,
        difficultyLevel: activity.difficulty_level
      }));
      
      setActivities(formattedActivities);
      
      // الأنشطة القريبة
      const upcoming = formattedActivities
        .filter(activity => {
          const activityDate = new Date(activity.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return activityDate >= today;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);
      
      setUpcomingActivities(upcoming);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categoryCode) => {
    const colors = {
      'workshops': '#9b59b6',
      'trainings': '#2ecc71',
      'competitions': '#e74c3c',
      'events': '#f39c12',
      'projects': '#1abc9c',
      'all': '#3498db'
    };
    return colors[categoryCode] || '#3498db';
  };

  const getCategoryName = (categoryId) => {
    if (categoryId === 'all') return 'جميع الأنشطة';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name_ar || '';
  };

  const filteredActivities = selectedFilter === 'all' 
    ? activities 
    : activities.filter(activity => activity.category === selectedFilter);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleRegister = async (activityId) => {
    if (!user) {
      navigateTo('login');
      return;
    }
    
    try {
      // التسجيل للنشاط
      const { error } = await supabase
        .from('activity_registrations')
        .insert({
          activity_id: activityId,
          user_id: user.id,
          status: 'pending'
        });
      
      if (error) throw error;
      
      // تحديث عدد المسجلين
      const activity = activities.find(a => a.id === activityId);
      if (activity && activity.registered < activity.capacity) {
        const { error: updateError } = await supabase
          .from('activities')
          .update({ registered: activity.registered + 1 })
          .eq('id', activityId);
        
        if (updateError) throw updateError;
        
        // إعادة تحميل البيانات
        await loadActivities();
      }
      
      console.log('تم التسجيل بنجاح للنشاط:', activityId);
    } catch (error) {
      console.error('Error registering for activity:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTimeRemaining = (dateString) => {
    const now = new Date();
    const activityDate = new Date(dateString);
    const diffTime = activityDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'منتهي';
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays <= 7) return `${diffDays} أيام`;
    return formatDate(dateString);
  };

  const renderActivityCard = ({ item }) => {
    const category = categories.find(cat => cat.id === item.category);
    const cardColor = category?.color || '#3498db';
    
    return (
      <TouchableOpacity 
        style={styles.activityCard}
        onPress={() => navigateTo('activityDetails', { activityId: item.id })}
      >
        {/* صورة النشاط */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.image }} 
            style={styles.activityImage}
            resizeMode="cover"
          />
          
          {item.featured && (
            <View style={styles.featuredBadge}>
              <FontAwesome name="star" size={10} color="#fff" />
              <Text style={styles.featuredText}>مميز</Text>
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />
          
          <View style={styles.imageOverlay}>
            <View style={[styles.categoryBadge, { backgroundColor: cardColor }]}>
              <Text style={styles.categoryBadgeText}>
                {getCategoryName(item.category)}
              </Text>
            </View>
            
            <View style={styles.dateBadge}>
              <FontAwesome name="calendar" size={10} color="#fff" />
              <Text style={styles.dateBadgeText}>
                {getTimeRemaining(item.date)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* محتوى البطاقة */}
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.activityDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.activityMeta}>
            <View style={styles.metaItem}>
              <FontAwesome name="map-marker" size={12} color="#7f8c8d" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.city}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <FontAwesome name="clock-o" size={12} color="#7f8c8d" />
              <Text style={styles.metaText}>
                {item.time?.substring(0, 5)}
              </Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <FontAwesome name="users" size={12} color="#7f8c8d" />
              <Text style={styles.statText}>
                {item.registered}/{item.capacity}
              </Text>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={[
                styles.priceText,
                item.price === 0 && styles.freePrice
              ]}>
                {item.price === 0 ? 'مجاني' : `${item.price} ₪`}
              </Text>
            </View>
          </View>
          
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 2 && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>+{item.tags.length - 2}</Text>
                </View>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={[
              styles.registerButton,
              item.registered >= item.capacity && styles.registerButtonDisabled
            ]}
            onPress={() => handleRegister(item.id)}
            disabled={item.registered >= item.capacity}
          >
            <FontAwesome 
              name={item.registered >= item.capacity ? "calendar-times-o" : "calendar-plus-o"} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.registerButtonText}>
              {item.registered >= item.capacity ? 'مكتمل' : 'سجل الآن'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryItem = ({ item }) => {
    const isActive = selectedFilter === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          { backgroundColor: isActive ? item.color : '#f8f9fa' }
        ]}
        onPress={() => setSelectedFilter(item.id)}
      >
        <FontAwesome 
          name={item.icon} 
          size={18} 
          color={isActive ? '#fff' : item.color} 
        />
        <Text style={[
          styles.categoryText,
          { color: isActive ? '#fff' : '#2c3e50' }
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderUpcomingCard = (activity, index) => {
    const category = categories.find(cat => cat.id === activity.category);
    const cardColor = category?.color || '#3498db';
    
    return (
      <TouchableOpacity 
        key={activity.id}
        style={styles.upcomingCard}
        onPress={() => navigateTo('activityDetails', { activityId: activity.id })}
      >
        <LinearGradient
          colors={[cardColor, `${cardColor}CC`]}
          style={styles.upcomingGradient}
        >
          <View style={styles.upcomingHeader}>
            <View style={styles.upcomingDateBadge}>
              <Text style={styles.upcomingDateNumber}>
                {new Date(activity.date).getDate()}
              </Text>
              <Text style={styles.upcomingDateMonth}>
                {new Date(activity.date).toLocaleDateString('ar-SA', { month: 'short' })}
              </Text>
            </View>
            
            <View style={styles.upcomingSpots}>
              <FontAwesome name="users" size={12} color="#fff" />
              <Text style={styles.upcomingSpotsText}>
                {activity.capacity - activity.registered} مقاعد
              </Text>
            </View>
          </View>
          
          <Text style={styles.upcomingTitle} numberOfLines={2}>
            {activity.title}
          </Text>
          
          <Text style={styles.upcomingLocation} numberOfLines={1}>
            <FontAwesome name="map-marker" size={12} color="#fff" /> {activity.city}
          </Text>
          
          <View style={styles.upcomingFooter}>
            <Text style={styles.upcomingTime}>
              <FontAwesome name="clock-o" size={12} color="#fff" /> {activity.time?.substring(0, 5)}
            </Text>
            
            {activity.featured && (
              <View style={styles.upcomingFeatured}>
                <FontAwesome name="star" size={12} color="#fff" />
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل الأنشطة...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <LinearGradient
        colors={['#3498db', '#2980b9']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <FontAwesome name="calendar-check-o" size={32} color="#fff" />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>أنشطة المدارس</Text>
            <Text style={styles.headerSubtitle}>
              اكتشف ورش العمل والتدريبات والفعاليات
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#3498db']}
            tintColor="#3498db"
          />
        }
      >
        {/* الفئات */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>التصنيفات</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* الأنشطة القادمة */}
        {upcomingActivities.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>قريباً</Text>
              <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                <Text style={styles.seeAllText}>عرض الكل</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.upcomingScroll}
            >
              {upcomingActivities.map((activity, index) => 
                renderUpcomingCard(activity, index)
              )}
            </ScrollView>
          </View>
        )}

        {/* جميع الأنشطة */}
        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedFilter === 'all' 
                ? 'جميع الأنشطة' 
                : getCategoryName(selectedFilter)}
            </Text>
            <Text style={styles.resultsCount}>
              {filteredActivities.length} نشاط
            </Text>
          </View>

          {filteredActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="calendar-times-o" size={60} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>
                لم يتم العثور على أنشطة
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={styles.emptyStateButtonText}>عرض جميع الأنشطة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredActivities}
              renderItem={renderActivityCard}
              keyExtractor={item => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.activitiesGrid}
            />
          )}
        </View>

        {/* إنشاء نشاط جديد */}
        {user && (
          <View style={styles.createSection}>
            <LinearGradient
              colors={['#27ae60', '#229954']}
              style={styles.createGradient}
            >
              <FontAwesome name="lightbulb-o" size={32} color="#fff" />
              <Text style={styles.createTitle}>هل لديك فكرة لنشاط؟</Text>
              <Text style={styles.createText}>
                شارك خبرتك مع مجتمع التعليم
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigateTo('createActivity')}
              >
                <Text style={styles.createButtonText}>اقترح نشاطاً</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* إحصائيات */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>إحصائيات</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{activities.length}+</Text>
              <Text style={styles.statLabel}>نشاط</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {activities.reduce((sum, activity) => sum + activity.registered, 0)}+
              </Text>
              <Text style={styles.statLabel}>مسجل</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Math.round(activities.reduce((sum, activity) => sum + activity.registered, 0) / 
                  Math.max(1, activities.reduce((sum, activity) => sum + activity.capacity, 0)) * 100)}%
              </Text>
              <Text style={styles.statLabel}>نسبة الحجز</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {new Set(activities.map(a => a.city)).size}+
              </Text>
              <Text style={styles.statLabel}>مدينة</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    fontFamily: 'System',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTexts: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'System',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    fontFamily: 'System',
  },
  scrollView: {
    flex: 1,
  },
  categoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'right',
    fontFamily: 'System',
  },
  categoriesList: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 90,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    fontFamily: 'System',
  },
  upcomingSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    fontFamily: 'System',
  },
  upcomingScroll: {
    paddingRight: 16,
  },
  upcomingCard: {
    width: 180,
    marginLeft: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  upcomingGradient: {
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  upcomingDateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 45,
  },
  upcomingDateNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  upcomingDateMonth: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'System',
    marginTop: 2,
  },
  upcomingSpots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingSpotsText: {
    fontSize: 10,
    color: '#fff',
    marginRight: 4,
    fontFamily: 'System',
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'right',
    marginVertical: 8,
    fontFamily: 'System',
  },
  upcomingLocation: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'right',
    fontFamily: 'System',
  },
  upcomingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  upcomingTime: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    fontFamily: 'System',
  },
  upcomingFeatured: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activitiesSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  resultsCount: {
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: 'System',
  },
  activitiesGrid: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  imageContainer: {
    height: 120,
    position: 'relative',
  },
  activityImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    left: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'System',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'System',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 1,
    gap: 4,
  },
  featuredText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'System',
  },
  activityContent: {
    padding: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 6,
    fontFamily: 'System',
  },
  activityDescription: {
    fontSize: 12,
    color: '#34495e',
    lineHeight: 16,
    textAlign: 'right',
    marginBottom: 12,
    fontFamily: 'System',
  },
  activityMeta: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#7f8c8d',
    fontFamily: 'System',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#7f8c8d',
    fontFamily: 'System',
  },
  priceContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e74c3c',
    fontFamily: 'System',
  },
  freePrice: {
    color: '#27ae60',
  },
  tagsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tagText: {
    fontSize: 10,
    color: '#2c3e50',
    fontFamily: 'System',
  },
  registerButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  registerButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  registerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'System',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptyStateButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'System',
  },
  createSection: {
    padding: 16,
  },
  createGradient: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  createText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    fontFamily: 'System',
  },
  createButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 160,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27ae60',
    textAlign: 'center',
    fontFamily: 'System',
  },
  statsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'System',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  statItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '45%',
    minWidth: 140,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3498db',
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontFamily: 'System',
  },
});
