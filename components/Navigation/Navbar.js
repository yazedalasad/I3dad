import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { font, lh, textColors } from '../../src/theme/typography';
import FloatingLanguageSwitcher from '../FloatingLanguageSwitcher';

export default function Navbar({ activeTab, onTabPress }) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const [accountExpanded, setAccountExpanded] = useState(false);
  const isRTL =
    String(i18n.language || '').toLowerCase().startsWith('ar') ||
    String(i18n.language || '').toLowerCase().startsWith('he');

  const label = (key, fallback) => {
    const value = t(key);
    return typeof value === 'string' && value !== key ? value : fallback;
  };

  const doSignOut = async () => {
    await signOut?.();
    setAccountExpanded(false);
    onTabPress?.('home');
  };

  const tabs = user
    ? [
        { id: 'home', icon: 'home' },
        { id: 'successStories', icon: 'star' },
        { id: 'activities', icon: 'calendar-check-o' },
        { id: 'games', icon: 'gamepad' },
        { id: 'universitiesAndColleges', icon: 'university' },
        { id: 'adaptiveTest', icon: 'edit' },
      ]
    : [
        { id: 'home', icon: 'home' },
        { id: 'successStories', icon: 'star' },
        { id: 'activities', icon: 'calendar-check-o' },
        { id: 'about', icon: 'info-circle' },
        { id: 'login', icon: 'sign-in' },
      ];

  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;
  const iconSize = isMobile ? 20 : isTablet ? 22 : 24;
  const tabMinHeight = isMobile ? 68 : isTablet ? 76 : 84;
  const navItemWidth = isMobile ? Math.max(68, Math.floor((width - 48) / 4.5)) : isTablet ? 88 : undefined;
  const horizontalPadding = isMobile ? 12 : isTablet ? 18 : 24;

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
        <View style={[styles.topRow, isRTL && styles.topRowRtl]}>
          <FloatingLanguageSwitcher inline />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navScroll}
          contentContainerStyle={[styles.navScrollContent, isRTL && styles.navScrollContentRtl]}
        >
          <View style={[styles.shell, isRTL && styles.shellRtl, isMobile && styles.shellCompact]}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    styles.scrollTab,
                    { minHeight: tabMinHeight, width: navItemWidth },
                    isActive && styles.activeTab,
                  ]}
                  onPress={() => onTabPress(tab.id)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.iconWrap, isMobile && styles.iconWrapCompact, isActive && styles.activeIconWrap]}>
                    <FontAwesome
                      name={tab.icon}
                      size={iconSize}
                      color={isActive ? '#16a34a' : textColors.muted}
                    />
                  </View>
                  <Text
                    numberOfLines={isMobile ? 1 : 2}
                    style={[
                      styles.label,
                      isMobile && styles.labelCompact,
                      isActive && styles.activeLabel,
                      isRTL && styles.rtlLabel,
                    ]}
                  >
                    {label(`navigation:tabs.${tab.id}`, tab.id)}
                  </Text>
                  {isActive ? <View style={styles.activeGlow} /> : null}
                </TouchableOpacity>
              );
            })}
            {user ? (
              <View
                style={[
                  styles.accountTab,
                  styles.scrollTab,
                  { minHeight: tabMinHeight, width: navItemWidth },
                  accountExpanded && styles.accountTabExpanded,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.accountTabMain,
                    { minHeight: tabMinHeight },
                    activeTab === 'profile' && styles.activeTab,
                    accountExpanded && styles.accountTabMainExpanded,
                  ]}
                  onPress={() => setAccountExpanded((value) => !value)}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      styles.accountIconWrap,
                      isMobile && styles.iconWrapCompact,
                      activeTab === 'profile' && styles.activeIconWrap,
                    ]}
                  >
                    <FontAwesome
                      name="user-circle"
                      size={iconSize - 2}
                      color={activeTab === 'profile' ? '#16a34a' : '#94A3B8'}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      isMobile && styles.labelCompact,
                      activeTab === 'profile' && styles.activeLabel,
                      isRTL && styles.rtlLabel,
                    ]}
                  >
                    {label('navigation:tabs.profile', 'حسابي')}
                  </Text>
                  {activeTab === 'profile' ? <View style={styles.activeGlow} /> : null}
                </TouchableOpacity>

                {accountExpanded ? (
                  <View style={styles.accountDropdown}>
                    <TouchableOpacity
                      style={styles.accountDropdownItem}
                      onPress={() => {
                        setAccountExpanded(false);
                        onTabPress?.('profile');
                      }}
                      activeOpacity={0.9}
                    >
                      <FontAwesome name="user" size={14} color="#0f766e" />
                      <Text style={styles.accountDropdownText}>{label('navigation:tabs.profile', 'حسابي')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.accountDropdownItem, styles.accountDropdownDanger]}
                      onPress={doSignOut}
                      activeOpacity={0.9}
                    >
                      <FontAwesome name="sign-out" size={14} color="#dc2626" />
                      <Text style={[styles.accountDropdownText, styles.accountDropdownDangerText]}>
                        {label('common.logout', 'خروج')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#f8fbff',
    borderBottomWidth: 1,
    borderBottomColor: '#d9e6f5',
  },
  inner: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  innerDesktop: {
    paddingHorizontal: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  accountTab: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 18,
  },
  scrollTab: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 72,
  },
  accountTabExpanded: {
    minHeight: 168,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  accountTabMain: {
    position: 'relative',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  accountTabMainExpanded: {
    backgroundColor: '#f0fdf4',
  },
  accountIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  accountDropdown: {
    width: '100%',
    paddingHorizontal: 6,
    paddingBottom: 8,
    gap: 6,
  },
  accountDropdownItem: {
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  accountDropdownDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  accountDropdownText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '900',
  },
  accountDropdownDangerText: {
    color: '#dc2626',
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    flexGrow: 1,
    flexShrink: 0,
    gap: 8,
    width: '100%',
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e2ef',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  shellCompact: {
    gap: 6,
    padding: 6,
    borderRadius: 18,
  },
  navScroll: {
    width: '100%',
  },
  navScrollContent: {
    paddingHorizontal: 2,
    flexGrow: 1,
  },
  navScrollContentRtl: {
    flexDirection: 'row-reverse',
  },
  shellRtl: {
    flexDirection: 'row-reverse',
  },
  tab: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrapCompact: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  activeIconWrap: {
    backgroundColor: '#ffffff',
    borderColor: '#dcfce7',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: font('navLabel'),
    lineHeight: lh('navLabel'),
    color: textColors.muted,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '800',
  },
  labelCompact: {
    fontSize: font('tiny'),
    lineHeight: lh('tiny'),
    marginTop: 4,
  },
  activeLabel: {
    color: '#15803d',
    fontWeight: '900',
  },
  rtlLabel: {
    writingDirection: 'rtl',
  },
  activeGlow: {
    position: 'absolute',
    bottom: 4,
    width: 24,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
});
