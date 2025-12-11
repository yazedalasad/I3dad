import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function SuccessStoriesScreen({ navigateTo }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedStory, setSelectedStory] = useState(null);
  const [filterField, setFilterField] = useState('الكل');
  const [filterUniversity, setFilterUniversity] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fields, setFields] = useState(['الكل']);
  const [universities, setUniversities] = useState(['الكل']);
  const [featuredStories, setFeaturedStories] = useState([]);

  // جلب القصص من Supabase
  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      
      // جلب جميع القصص المعتمدة
      const { data: storiesData, error } = await supabase
        .from('success_stories')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStories(storiesData || []);
      
      // جلب القصص المميزة
      const { data: featuredData } = await supabase
        .from('success_stories')
        .select('*')
        .eq('is_approved', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(3);

      setFeaturedStories(featuredData || []);
      
      // استخراج المجالات والجامعات الفريدة
      const uniqueFields = ['الكل', ...new Set(storiesData.map(s => s.field).filter(Boolean))];
      const uniqueUniversities = ['الكل', ...new Set(storiesData.map(s => s.university).filter(Boolean))];
      
      setFields(uniqueFields);
      setUniversities(uniqueUniversities);

    } catch (error) {
      console.error('خطأ في جلب القصص:', error);
      alert('حدث خطأ في جلب القصص. الرجاء المحاولة مرة أخرى');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStories();
  };

  // تصفية القصص بناءً على الفلاتر المحددة
  const filteredStories = stories.filter(story => {
    const matchesField = filterField === 'الكل' || story.field === filterField;
    const matchesUniversity = filterUniversity === 'الكل' || story.university === filterUniversity;
    const matchesSearch = 
      story.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.story?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.current_job?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.degree?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesField && matchesUniversity && matchesSearch;
  });

  const openStoryModal = (story) => {
    setSelectedStory(story);
  };

  const closeStoryModal = () => {
    setSelectedStory(null);
  };

  const shareStory = () => {
    // في التطبيق الحقيقي، سيفتح هذا نافذة المشاركة الأصلية
    alert('تمت مشاركة القصة بنجاح!');
  };

  const submitStory = () => {
    if (user) {
      navigateTo('submitStory');
    } else {
      navigateTo('signup');
    }
  };

  const handleFieldFilter = (field) => {
    setFilterField(field);
  };

  const handleUniversityFilter = (university) => {
    setFilterUniversity(university);
  };

  const clearFilters = () => {
    setFilterField('الكل');
    setFilterUniversity('الكل');
    setSearchQuery('');
  };

  if (loading && stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>جاري تحميل القصص...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#27ae60']}
        />
      }
    >
      {/* الهيدر الرئيسي */}
      <LinearGradient
        colors={['#2c3e50', '#34495e', '#4a6583']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <FontAwesome name="star" size={60} color="#f39c12" />
          <Text style={styles.heroTitle}>قصص النجاح</Text>
          <Text style={styles.heroSubtitle}>إلهام من مجتمعنا</Text>
          <Text style={styles.heroDescription}>
            قصص حقيقية لطلاب عرب إسرائيليين وجدوا طريقهم نحو النجاح من خلال I3dad
          </Text>
          
          <TouchableOpacity style={styles.shareStoryButton} onPress={submitStory}>
            <FontAwesome name="edit" size={20} color="#fff" />
            <Text style={styles.shareStoryButtonText}>
              {user ? 'شارك قصتك' : 'سجل لحسابك وشارك قصتك'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* قسم الإحصائيات */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stories.length}</Text>
          <Text style={styles.statLabel}>قصة نجاح</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{universities.length - 1}</Text>
          <Text style={styles.statLabel}>جامعة</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{fields.length - 1}</Text>
          <Text style={styles.statLabel}>مجال</Text>
        </View>
      </View>

      {/* القصص المميزة */}
      {featuredStories.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="star" size={20} color="#f39c12" /> 
            القصص المميزة
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.featuredScroll}
            contentContainerStyle={styles.featuredContent}
          >
            {featuredStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={styles.featuredCard}
                onPress={() => openStoryModal(story)}
              >
                <Image 
                  source={{ uri: story.image_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }} 
                  style={styles.featuredImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.featuredOverlay}
                >
                  <Text style={styles.featuredName}>{story.full_name}</Text>
                  <Text style={styles.featuredJob}>{story.current_job}</Text>
                  <Text style={styles.featuredDegree}>{story.university}</Text>
                </LinearGradient>
                <View style={styles.featuredBadge}>
                  <FontAwesome name="star" size={12} color="#fff" />
                  <Text style={styles.featuredBadgeText}>مميز</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* البحث والفلاتر */}
      <View style={styles.filtersSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن قصة بالاسم أو المهنة أو التخصص..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times" size={18} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersHeader}>
          <Text style={styles.filtersTitle}>الفلاتر</Text>
          {(filterField !== 'الكل' || filterUniversity !== 'الكل') && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <FontAwesome name="times-circle" size={16} color="#e74c3c" />
              <Text style={styles.clearFiltersText}>مسح الفلاتر</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterField === 'الكل' && styles.filterChipActive]}
            onPress={() => handleFieldFilter('الكل')}
          >
            <Text style={[styles.filterChipText, filterField === 'الكل' && styles.filterChipTextActive]}>
              جميع المجالات
            </Text>
          </TouchableOpacity>
          
          {fields.filter(f => f !== 'الكل').map((field, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.filterChip, filterField === field && styles.filterChipActive]}
              onPress={() => handleFieldFilter(field)}
            >
              <Text style={[styles.filterChipText, filterField === field && styles.filterChipTextActive]}>
                {field}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterUniversity === 'الكل' && styles.filterChipActive]}
            onPress={() => handleUniversityFilter('الكل')}
          >
            <Text style={[styles.filterChipText, filterUniversity === 'الكل' && styles.filterChipTextActive]}>
              جميع الجامعات
            </Text>
          </TouchableOpacity>
          
          {universities.filter(u => u !== 'الكل').map((university, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.filterChip, filterUniversity === university && styles.filterChipActive]}
              onPress={() => handleUniversityFilter(university)}
            >
              <Text style={[styles.filterChipText, filterUniversity === university && styles.filterChipTextActive]}>
                {university}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredStories.length} قصة
          </Text>
          {filterField !== 'الكل' && (
            <View style={styles.activeFilter}>
              <FontAwesome name="tag" size={14} color="#3498db" />
              <Text style={styles.activeFilterText}>{filterField}</Text>
            </View>
          )}
          {filterUniversity !== 'الكل' && (
            <View style={styles.activeFilter}>
              <FontAwesome name="university" size={14} color="#e74c3c" />
              <Text style={styles.activeFilterText}>{filterUniversity}</Text>
            </View>
          )}
        </View>
      </View>

      {/* شبكة القصص */}
      <View style={styles.storiesSection}>
        {filteredStories.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="search" size={60} color="#bdc3c7" />
            <Text style={styles.emptyStateTitle}>لا توجد قصص</Text>
            <Text style={styles.emptyStateText}>حاول تغيير الفلاتر أو البحث عن شيء آخر</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={clearFilters}>
              <FontAwesome name="refresh" size={16} color="#fff" />
              <Text style={styles.emptyStateButtonText}>عرض جميع القصص</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.storiesGrid}>
            {filteredStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyCard}
                onPress={() => openStoryModal(story)}
              >
                <Image 
                  source={{ uri: story.image_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }} 
                  style={styles.storyImage}
                />
                
                {story.is_featured && (
                  <View style={styles.featuredIndicator}>
                    <FontAwesome name="star" size={12} color="#fff" />
                  </View>
                )}
                
                <View style={styles.storyCardContent}>
                  <Text style={styles.studentName}>{story.full_name}</Text>
                  <Text style={styles.studentJob}>{story.current_job}</Text>
                  <Text style={styles.studentDegree}>{story.degree}</Text>
                  
                  <View style={styles.storyMeta}>
                    <View style={styles.metaItem}>
                      <FontAwesome name="university" size={14} color="#7f8c8d" />
                      <Text style={styles.metaText}>{story.university}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <FontAwesome name="tag" size={14} color="#7f8c8d" />
                      <Text style={styles.metaText}>{story.field}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.storyPreview} numberOfLines={3}>
                    {story.story}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.readMoreButton}
                    onPress={() => openStoryModal(story)}
                  >
                    <Text style={styles.readMoreText}>
                      قراءة القصة كاملة
                    </Text>
                    <FontAwesome name="arrow-left" size={14} color="#3498db" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* قسم الدعوة للعمل */}
      <LinearGradient
        colors={['#27ae60', '#2ecc71']}
        style={styles.ctaSection}
      >
        <FontAwesome name="users" size={50} color="#fff" />
        <Text style={styles.ctaTitle}>كن جزءاً من قصص النجاح</Text>
        <Text style={styles.ctaText}>
          شارك تجربتك لتصبح مصدر إلهام للجيل القادم من الطلاب العرب في إسرائيل
        </Text>
        <TouchableOpacity style={styles.ctaButton} onPress={submitStory}>
          <FontAwesome name="edit" size={20} color="#27ae60" />
          <Text style={styles.ctaButtonText}>
            {user ? 'شارك قصتك الآن' : 'سجل لحسابك'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* مودال تفاصيل القصة */}
      <Modal
        visible={selectedStory !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={closeStoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedStory && (
              <>
                <ScrollView style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={closeStoryModal}>
                      <FontAwesome name="times" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Image 
                      source={{ uri: selectedStory.image_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }} 
                      style={styles.modalImage}
                    />
                  </View>
                  
                  <View style={styles.modalBody}>
                    <Text style={styles.modalName}>{selectedStory.full_name}</Text>
                    <Text style={styles.modalJob}>{selectedStory.current_job}</Text>
                    <Text style={styles.modalDegree}>{selectedStory.degree}</Text>

                    <View style={styles.modalMeta}>
                      <View style={styles.modalMetaItem}>
                        <FontAwesome name="university" size={16} color="#3498db" />
                        <Text style={styles.modalMetaText}>{selectedStory.university}</Text>
                      </View>
                      <View style={styles.modalMetaItem}>
                        <FontAwesome name="briefcase" size={16} color="#e74c3c" />
                        <Text style={styles.modalMetaText}>{selectedStory.field}</Text>
                      </View>
                      {selectedStory.graduation_year && (
                        <View style={styles.modalMetaItem}>
                          <FontAwesome name="calendar" size={16} color="#f39c12" />
                          <Text style={styles.modalMetaText}>تخرج {selectedStory.graduation_year}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.storySection}>
                      <Text style={styles.sectionLabel}>القصة الكاملة</Text>
                      <Text style={styles.fullStory}>{selectedStory.story}</Text>
                    </View>

                    {selectedStory.video_url && (
                      <TouchableOpacity style={styles.videoButton}>
                        <FontAwesome name="play-circle" size={24} color="#e74c3c" />
                        <Text style={styles.videoButtonText}>
                          شاهد مقابلة الفيديو
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.adviceSection}>
                      <Text style={styles.sectionLabel}>نصيحة للمستقبل</Text>
                      <Text style={styles.adviceText}>
                        "لا تخف من تغيير مسارك إذا وجدت شغفك الحقيقي. التعليم هو وسيلة وليس غاية."
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalButton} onPress={shareStory}>
                    <FontAwesome name="share-alt" size={20} color="#3498db" />
                    <Text style={styles.modalButtonText}>مشاركة القصة</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    marginTop: 20,
    fontSize: 16,
    color: '#7f8c8d',
  },
  hero: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    paddingBottom: 40,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.95,
  },
  heroDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    opacity: 0.9,
  },
  shareStoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  shareStoryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#27ae60',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  featuredSection: {
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 15,
    marginHorizontal: 20,
    textAlign: 'right',
  },
  featuredScroll: {
    paddingLeft: 20,
  },
  featuredContent: {
    paddingRight: 20,
  },
  featuredCard: {
    width: 280,
    height: 200,
    borderRadius: 16,
    marginRight: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
  },
  featuredName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'right',
  },
  featuredJob: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
    marginTop: 2,
    opacity: 0.9,
  },
  featuredDegree: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'right',
    marginTop: 2,
    opacity: 0.8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#f39c12',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filtersSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchIcon: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'right',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clearFiltersText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersScroll: {
    marginBottom: 10,
  },
  filtersContent: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  filterChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  filterChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  filterChipText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    marginLeft: 5,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
  },
  storiesSection: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#bdc3c7',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  storiesGrid: {
    gap: 20,
  },
  storyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  storyImage: {
    width: '100%',
    height: 200,
  },
  featuredIndicator: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: '#f39c12',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCardContent: {
    padding: 20,
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 5,
    textAlign: 'right',
  },
  studentJob: {
    fontSize: 16,
    color: '#3498db',
    marginBottom: 8,
    textAlign: 'right',
    fontWeight: '600',
  },
  studentDegree: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'right',
    lineHeight: 20,
  },
  storyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginRight: 5,
  },
  storyPreview: {
    fontSize: 15,
    color: '#34495e',
    lineHeight: 22,
    marginBottom: 15,
    textAlign: 'right',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  readMoreText: {
    color: '#3498db',
    fontWeight: '700',
    fontSize: 15,
  },
  ctaSection: {
    padding: 40,
    alignItems: 'center',
    margin: 20,
    borderRadius: 20,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 25,
    opacity: 0.95,
    lineHeight: 24,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    gap: 10,
  },
  ctaButtonText: {
    color: '#27ae60',
    fontWeight: '700',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
  },
  modalContent: {
    paddingBottom: 100,
  },
  modalHeader: {
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalBody: {
    padding: 25,
  },
  modalName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 5,
  },
  modalJob: {
    fontSize: 18,
    color: '#3498db',
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: '600',
  },
  modalDegree: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    marginBottom: 25,
  },
  modalMetaItem: {
    alignItems: 'center',
    gap: 8,
  },
  modalMetaText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginTop: 5,
  },
  storySection: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'right',
  },
  fullStory: {
    fontSize: 17,
    color: '#34495e',
    lineHeight: 28,
    textAlign: 'right',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdeaea',
    padding: 18,
    borderRadius: 15,
    gap: 10,
    marginBottom: 30,
  },
  videoButtonText: {
    color: '#e74c3c',
    fontWeight: '700',
    fontSize: 16,
  },
  adviceSection: {
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    marginBottom: 30,
  },
  adviceText: {
    fontSize: 18,
    color: '#2c3e50',
    fontStyle: 'italic',
    lineHeight: 26,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    backgroundColor: '#ecf0f1',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3498db',
  },
});
