// screens/SuccessStories/SuccessStoriesScreen.js
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ALL_VALUE = '__ALL__';

function safeStr(x) {
  return typeof x === 'string' ? x : x == null ? '' : String(x);
}

function initialsFromName(name) {
  const parts = safeStr(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const v = (first + last).toUpperCase();
  return v || '?';
}

function normalizeForSearch(s) {
  return safeStr(s).toLowerCase();
}

/**
 * Pick the best localized value.
 * - Prefer ar/he columns
 * - fallback to old base columns (degree/university/field/current_job/story)
 */
function pickLocalized(row, lang, baseKey) {
  const isArabic = lang === 'ar';
  const isHebrew = lang === 'he';

  const arKey = `${baseKey}_ar`;
  const heKey = `${baseKey}_he`;

  if (isArabic) return row?.[arKey] ?? row?.[baseKey] ?? '';
  if (isHebrew) return row?.[heKey] ?? row?.[baseKey] ?? '';
  return row?.[baseKey] ?? row?.[arKey] ?? row?.[heKey] ?? '';
}

function storyMatchesFilter(row, baseKey, filterValue) {
  if (!filterValue || filterValue === ALL_VALUE) return true;
  const base = safeStr(row?.[baseKey]);
  const ar = safeStr(row?.[`${baseKey}_ar`]);
  const he = safeStr(row?.[`${baseKey}_he`]);
  return base === filterValue || ar === filterValue || he === filterValue;
}

export default function SuccessStoriesScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('successStories');
  const { user } = useAuth();

  const lang = (i18n.language || 'ar').toLowerCase();
  const isArabic = lang === 'ar';
  const isHebrew = lang === 'he';

  const [selectedStory, setSelectedStory] = useState(null);

  const [filterField, setFilterField] = useState(ALL_VALUE);
  const [filterUniversity, setFilterUniversity] = useState(ALL_VALUE);
  const [searchQuery, setSearchQuery] = useState('');

  const [stories, setStories] = useState([]);
  const [featuredStories, setFeaturedStories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fields, setFields] = useState([ALL_VALUE]);
  const [universities, setUniversities] = useState([ALL_VALUE]);

  useEffect(() => {
    fetchStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);

      // Try selecting bilingual columns first.
      const selectBilingual =
        'id,full_name,graduation_year,is_featured,is_approved,created_at,video_url,' +
        'degree,university,field,current_job,story,' +
        'degree_ar,degree_he,university_ar,university_he,field_ar,field_he,current_job_ar,current_job_he,story_ar,story_he';

      let res = await supabase
        .from('success_stories')
        .select(selectBilingual)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      // If schema cache is not refreshed yet, fall back to "*"
      if (res.error) {
        const msg = safeStr(res.error?.message);
        const isSchemaCacheIssue =
          msg.toLowerCase().includes('schema cache') ||
          msg.toLowerCase().includes('could not find') ||
          msg.toLowerCase().includes('column') ||
          msg.toLowerCase().includes('pgrst');

        if (isSchemaCacheIssue) {
          // Fallback: at least load old columns so UI works
          const fallback = await supabase
            .from('success_stories')
            .select('*')
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

          if (fallback.error) throw fallback.error;
          res = fallback;
          console.warn(
            '[SuccessStories] Supabase schema cache might not be refreshed yet. ' +
              "If you just added columns, run: SELECT pg_notify('pgrst','reload schema'); " +
              'or restart Supabase API from the dashboard.'
          );
        } else {
          throw res.error;
        }
      }

      const all = res.data || [];
      setStories(all);

      const featured = all.filter((s) => s?.is_featured).slice(0, 3);
      setFeaturedStories(featured);

      // Build unique lists (store raw values so filtering works across languages)
      const fieldSet = new Set();
      const uniSet = new Set();

      all.forEach((s) => {
        // add all variants so filters keep working when language changes
        ['field', 'field_ar', 'field_he'].forEach((k) => {
          const v = safeStr(s?.[k]).trim();
          if (v) fieldSet.add(v);
        });
        ['university', 'university_ar', 'university_he'].forEach((k) => {
          const v = safeStr(s?.[k]).trim();
          if (v) uniSet.add(v);
        });
      });

      setFields([ALL_VALUE, ...Array.from(fieldSet)]);
      setUniversities([ALL_VALUE, ...Array.from(uniSet)]);
    } catch (error) {
      console.error('fetchStories error:', error);
      Alert.alert('', t('alerts.fetchError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStories();
  };

  const filteredStories = useMemo(() => {
    const q = normalizeForSearch(searchQuery);
    return stories.filter((s) => {
      const matchesField = storyMatchesFilter(s, 'field', filterField);
      const matchesUniversity = storyMatchesFilter(s, 'university', filterUniversity);

      const name = normalizeForSearch(s?.full_name);
      const storyText = normalizeForSearch(
        pickLocalized(s, lang, 'story')
      );
      const job = normalizeForSearch(
        pickLocalized(s, lang, 'current_job')
      );
      const degree = normalizeForSearch(
        pickLocalized(s, lang, 'degree')
      );

      const matchesSearch =
        !q ||
        name.includes(q) ||
        storyText.includes(q) ||
        job.includes(q) ||
        degree.includes(q);

      return matchesField && matchesUniversity && matchesSearch;
    });
  }, [stories, searchQuery, filterField, filterUniversity, lang]);

  const stats = useMemo(() => {
    const storiesCount = stories.length;
    // unique institutions: count across all uni columns
    const uniSet = new Set();
    const fieldSet = new Set();

    stories.forEach((s) => {
      ['university', 'university_ar', 'university_he'].forEach((k) => {
        const v = safeStr(s?.[k]).trim();
        if (v) uniSet.add(v);
      });
      ['field', 'field_ar', 'field_he'].forEach((k) => {
        const v = safeStr(s?.[k]).trim();
        if (v) fieldSet.add(v);
      });
    });

    return {
      storiesCount,
      universitiesCount: uniSet.size,
      fieldsCount: fieldSet.size,
    };
  }, [stories]);

  const openStoryModal = (story) => setSelectedStory(story);
  const closeStoryModal = () => setSelectedStory(null);

  const shareStory = () => {
    Alert.alert('', t('alerts.shareSuccess'));
  };

  const submitStory = () => {
    if (user) navigateTo?.('submitStory');
    else navigateTo?.('signup');
  };

  const clearFilters = () => {
    setFilterField(ALL_VALUE);
    setFilterUniversity(ALL_VALUE);
    setSearchQuery('');
  };

  // UI labels for filter chips should follow current language (but values stay raw)
  const fieldChipLabel = (value) => {
    if (value === ALL_VALUE) return t('filters.allFields');
    return value;
  };
  const uniChipLabel = (value) => {
    if (value === ALL_VALUE) return t('filters.allUniversities');
    return value;
  };

  if (loading && stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>{t('loading.title')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27ae60']} />
      }
    >
      {/* Hero */}
      <LinearGradient
        colors={['#0F172A', '#111827', '#1F2937']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroIconWrap}>
            <FontAwesome name="trophy" size={26} color="#fff" />
          </View>

          <Text style={[styles.heroTitle, isHebrew && styles.rtl, isArabic && styles.rtl]}>
            {t('hero.title')}
          </Text>
          <Text style={[styles.heroSubtitle, isHebrew && styles.rtl, isArabic && styles.rtl]}>
            {t('hero.subtitle')}
          </Text>
          <Text style={[styles.heroDescription, isHebrew && styles.rtl, isArabic && styles.rtl]}>
            {t('hero.description')}
          </Text>

          <TouchableOpacity style={styles.heroButton} onPress={submitStory} activeOpacity={0.9}>
            <FontAwesome name="edit" size={18} color="#0F172A" />
            <Text style={[styles.heroButtonText, isHebrew && styles.rtl, isArabic && styles.rtl]}>
              {user ? t('hero.buttonLoggedIn') : t('hero.buttonGuest')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.storiesCount}</Text>
          <Text style={styles.statLabel}>{t('stats.stories')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.universitiesCount}</Text>
          <Text style={styles.statLabel}>{t('stats.universities')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.fieldsCount}</Text>
          <Text style={styles.statLabel}>{t('stats.fields')}</Text>
        </View>
      </View>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoIcon}>
          <FontAwesome name="info" size={16} color="#0F172A" />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={[styles.infoTitle, isHebrew && styles.rtl, isArabic && styles.rtl]}>
            {t('infoBar.title')}
          </Text>
          <Text style={[styles.infoBody, isHebrew && styles.rtl, isArabic && styles.rtl]}>
            {t('infoBar.body')}
          </Text>
        </View>
      </View>

      {/* Featured */}
      {featuredStories.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={[styles.sectionTitle, isHebrew && styles.rtl, isArabic && styles.rtl]}>
            {t('featured.title')}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.featuredScroll}
            contentContainerStyle={styles.featuredContent}
          >
            {featuredStories.map((story) => {
              const name = safeStr(story?.full_name);
              const job = safeStr(pickLocalized(story, lang, 'current_job'));
              const uni = safeStr(pickLocalized(story, lang, 'university'));
              const initials = initialsFromName(name);

              return (
                <TouchableOpacity
                  key={story.id}
                  style={styles.featuredCard}
                  onPress={() => openStoryModal(story)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#111827', '#0B1220']}
                    style={styles.featuredCardBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.avatarBig}>
                      <Text style={styles.avatarBigText}>{initials}</Text>
                    </View>

                    <Text style={[styles.featuredName, isHebrew && styles.rtl, isArabic && styles.rtl]}>
                      {name}
                    </Text>
                    <Text style={[styles.featuredJob, isHebrew && styles.rtl, isArabic && styles.rtl]}>
                      {job}
                    </Text>
                    <Text style={[styles.featuredUni, isHebrew && styles.rtl, isArabic && styles.rtl]}>
                      {uni}
                    </Text>

                    <View style={styles.featuredBadge}>
                      <FontAwesome name="star" size={12} color="#fff" />
                      <Text style={[styles.featuredBadgeText, isHebrew && styles.rtl, isArabic && styles.rtl]}>
                        {t('featured.badge')}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search + Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#64748B" />
          <TextInput
            style={[styles.searchInput, (isHebrew || isArabic) && styles.rtl]}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, (isHebrew || isArabic) && styles.rtl]}>
            {t('filters.title')}
          </Text>

          {(filterField !== ALL_VALUE || filterUniversity !== ALL_VALUE || searchQuery) && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton} activeOpacity={0.85}>
              <FontAwesome name="times-circle" size={16} color="#EF4444" />
              <Text style={[styles.clearFiltersText, (isHebrew || isArabic) && styles.rtl]}>
                {t('filters.clear')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Field chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersRow}>
            {fields.map((value) => {
              const active = filterField === value;
              return (
                <TouchableOpacity
                  key={`field-${value}`}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilterField(value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive, (isHebrew || isArabic) && styles.rtl]}>
                    {fieldChipLabel(value)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* University chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersRow}>
            {universities.map((value) => {
              const active = filterUniversity === value;
              return (
                <TouchableOpacity
                  key={`uni-${value}`}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilterUniversity(value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive, (isHebrew || isArabic) && styles.rtl]}>
                    {uniChipLabel(value)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.resultsInfo}>
          <Text style={[styles.resultsText, (isHebrew || isArabic) && styles.rtl]}>
            {t('results.count', { count: filteredStories.length })}
          </Text>
        </View>
      </View>

      {/* Stories list */}
      <View style={styles.storiesSection}>
        {filteredStories.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="search" size={22} color="#64748B" />
            </View>
            <Text style={[styles.emptyTitle, (isHebrew || isArabic) && styles.rtl]}>{t('empty.title')}</Text>
            <Text style={[styles.emptyText, (isHebrew || isArabic) && styles.rtl]}>{t('empty.text')}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={clearFilters} activeOpacity={0.9}>
              <FontAwesome name="refresh" size={16} color="#fff" />
              <Text style={[styles.emptyButtonText, (isHebrew || isArabic) && styles.rtl]}>{t('empty.button')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.storiesGrid}>
            {filteredStories.map((story) => {
              const name = safeStr(story?.full_name);
              const job = safeStr(pickLocalized(story, lang, 'current_job'));
              const degree = safeStr(pickLocalized(story, lang, 'degree'));
              const uni = safeStr(pickLocalized(story, lang, 'university'));
              const field = safeStr(pickLocalized(story, lang, 'field'));
              const storyText = safeStr(pickLocalized(story, lang, 'story'));
              const initials = initialsFromName(name);

              return (
                <TouchableOpacity
                  key={story.id}
                  style={styles.storyCard}
                  onPress={() => openStoryModal(story)}
                  activeOpacity={0.9}
                >
                  <View style={styles.storyTopRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    <View style={styles.storyTopText}>
                      <Text style={[styles.studentName, (isHebrew || isArabic) && styles.rtl]}>{name}</Text>
                      <Text style={[styles.studentJob, (isHebrew || isArabic) && styles.rtl]}>{job}</Text>
                      <Text style={[styles.studentDegree, (isHebrew || isArabic) && styles.rtl]}>{degree}</Text>
                    </View>

                    {story?.is_featured ? (
                      <View style={styles.featuredMini}>
                        <FontAwesome name="star" size={12} color="#fff" />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                      <FontAwesome name="university" size={12} color="#0F172A" />
                      <Text style={[styles.metaPillText, (isHebrew || isArabic) && styles.rtl]}>{uni}</Text>
                    </View>

                    <View style={styles.metaPill}>
                      <FontAwesome name="tag" size={12} color="#0F172A" />
                      <Text style={[styles.metaPillText, (isHebrew || isArabic) && styles.rtl]}>{field}</Text>
                    </View>
                  </View>

                  <Text style={[styles.storyPreview, (isHebrew || isArabic) && styles.rtl]} numberOfLines={4}>
                    {storyText}
                  </Text>

                  <View style={styles.readMoreRow}>
                    <Text style={[styles.readMoreText, (isHebrew || isArabic) && styles.rtl]}>
                      {t('storyCard.readFull')}
                    </Text>
                    <FontAwesome name="arrow-left" size={14} color="#2563EB" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* CTA */}
      <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.ctaSection}>
        <View style={styles.ctaIcon}>
          <FontAwesome name="users" size={22} color="#fff" />
        </View>
        <Text style={[styles.ctaTitle, (isHebrew || isArabic) && styles.rtl]}>{t('cta.title')}</Text>
        <Text style={[styles.ctaText, (isHebrew || isArabic) && styles.rtl]}>{t('cta.text')}</Text>
        <TouchableOpacity style={styles.ctaButton} onPress={submitStory} activeOpacity={0.9}>
          <FontAwesome name="edit" size={18} color="#16A34A" />
          <Text style={[styles.ctaButtonText, (isHebrew || isArabic) && styles.rtl]}>
            {user ? t('cta.buttonLoggedIn') : t('cta.buttonGuest')}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Modal */}
      <Modal
        visible={selectedStory !== null}
        animationType="slide"
        transparent
        onRequestClose={closeStoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedStory ? (
              <>
                <ScrollView style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={closeStoryModal} activeOpacity={0.85}>
                      <FontAwesome name="times" size={20} color="#fff" />
                    </TouchableOpacity>

                    <LinearGradient
                      colors={['#0F172A', '#111827']}
                      style={styles.modalHero}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.modalAvatar}>
                        <Text style={styles.modalAvatarText}>
                          {initialsFromName(selectedStory?.full_name)}
                        </Text>
                      </View>

                      <Text style={[styles.modalName, (isHebrew || isArabic) && styles.rtl]}>
                        {safeStr(selectedStory?.full_name)}
                      </Text>

                      <Text style={[styles.modalJob, (isHebrew || isArabic) && styles.rtl]}>
                        {safeStr(pickLocalized(selectedStory, lang, 'current_job'))}
                      </Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={[styles.modalDegree, (isHebrew || isArabic) && styles.rtl]}>
                      {safeStr(pickLocalized(selectedStory, lang, 'degree'))}
                    </Text>

                    <View style={styles.modalMetaRow}>
                      <View style={styles.modalMetaItem}>
                        <FontAwesome name="university" size={16} color="#2563EB" />
                        <Text style={[styles.modalMetaText, (isHebrew || isArabic) && styles.rtl]}>
                          {safeStr(pickLocalized(selectedStory, lang, 'university'))}
                        </Text>
                      </View>

                      <View style={styles.modalMetaItem}>
                        <FontAwesome name="briefcase" size={16} color="#EF4444" />
                        <Text style={[styles.modalMetaText, (isHebrew || isArabic) && styles.rtl]}>
                          {safeStr(pickLocalized(selectedStory, lang, 'field'))}
                        </Text>
                      </View>

                      {selectedStory?.graduation_year ? (
                        <View style={styles.modalMetaItem}>
                          <FontAwesome name="calendar" size={16} color="#F59E0B" />
                          <Text style={[styles.modalMetaText, (isHebrew || isArabic) && styles.rtl]}>
                            {t('modal.graduated', { year: selectedStory.graduation_year })}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, (isHebrew || isArabic) && styles.rtl]}>
                        {t('modal.storyLabel')}
                      </Text>
                      <Text style={[styles.modalStory, (isHebrew || isArabic) && styles.rtl]}>
                        {safeStr(pickLocalized(selectedStory, lang, 'story'))}
                      </Text>
                    </View>

                    {safeStr(selectedStory?.video_url).trim() ? (
                      <TouchableOpacity style={styles.videoButton} activeOpacity={0.9}>
                        <FontAwesome name="play-circle" size={22} color="#EF4444" />
                        <Text style={[styles.videoButtonText, (isHebrew || isArabic) && styles.rtl]}>
                          {t('modal.watchVideo')}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalButton} onPress={shareStory} activeOpacity={0.9}>
                    <FontAwesome name="share-alt" size={18} color="#2563EB" />
                    <Text style={[styles.modalButtonText, (isHebrew || isArabic) && styles.rtl]}>
                      {t('modal.share')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rtl: {
    textAlign: 'right',
  },

  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: '#475569',
  },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 28,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 520,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  heroButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },

  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 18,
    paddingVertical: 16,
    boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.08)',
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '900', color: '#16A34A' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },

  infoBar: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.06)',
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  infoBody: { fontSize: 13, color: '#475569', lineHeight: 20 },

  featuredSection: {
    marginTop: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  featuredScroll: { paddingLeft: 16 },
  featuredContent: { paddingRight: 16, gap: 12 },
  featuredCard: {
    width: 280,
    borderRadius: 18,
    overflow: 'hidden',
  },
  featuredCardBg: {
    padding: 16,
    borderRadius: 18,
    position: 'relative',
    minHeight: 170,
    boxShadow: '0px 12px 26px rgba(15, 23, 42, 0.20)',
  },
  avatarBig: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarBigText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  featuredName: { color: '#fff', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  featuredJob: { color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  featuredUni: { color: 'rgba(255,255,255,0.82)', fontWeight: '600', fontSize: 12 },

  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  filtersSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.06)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },

  filtersHeader: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },

  filtersScroll: { marginTop: 10 },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 6,
    paddingLeft: 2,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  chipTextActive: {
    color: '#fff',
  },

  resultsInfo: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },

  storiesSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 26 },
  storiesGrid: { gap: 12 },

  storyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.06)',
  },
  storyTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontWeight: '900', color: '#0F172A' },

  storyTopText: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  studentJob: { fontSize: 13, fontWeight: '800', color: '#2563EB', marginBottom: 2 },
  studentDegree: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  featuredMini: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },

  storyPreview: {
    marginTop: 10,
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  readMoreRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  readMoreText: {
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 13,
  },

  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  ctaSection: {
    marginHorizontal: 16,
    marginBottom: 26,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    boxShadow: '0px 14px 30px rgba(22, 163, 74, 0.25)',
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 8 },
  ctaText: { fontSize: 13, color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 20 },
  ctaButton: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaButtonText: { color: '#16A34A', fontWeight: '900', fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalContent: { paddingBottom: 92 },
  modalHeader: { position: 'relative' },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHero: {
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  modalName: { color: '#fff', fontWeight: '900', fontSize: 20, marginBottom: 4 },
  modalJob: { color: 'rgba(255,255,255,0.92)', fontWeight: '800', fontSize: 13 },

  modalBody: { padding: 16 },
  modalDegree: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 12 },

  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  modalMetaText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  modalSection: { marginTop: 8 },
  modalSectionTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  modalStory: { fontSize: 13, color: '#334155', lineHeight: 20 },

  videoButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 16,
  },
  videoButtonText: { color: '#EF4444', fontWeight: '900', fontSize: 13 },

  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
  },
  modalButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalButtonText: { fontSize: 13, fontWeight: '900', color: '#2563EB' },
});
