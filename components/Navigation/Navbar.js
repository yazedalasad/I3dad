import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { font, lh, textColors } from '../../src/theme/typography';
import FloatingLanguageSwitcher from '../FloatingLanguageSwitcher';

export default function Navbar({ activeTab, onTabPress, canGoBack = false, onBackPress }) {
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

  const handleSignOut = () => {
    doSignOut();
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
  const isCompact = width < 720;
  const isDesktop = width >= 1024;
  const navItemWidth = isCompact ? Math.max(76, Math.floor((width - 96) / 4)) : undefined;

  return (
    <View style={styles.container}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
      <View style={[styles.topRow, isRTL && styles.topRowRtl]}>
        <View style={styles.languageSlot}>
          <FloatingLanguageSwitcher inline />
        </View>
        <TouchableOpacity
          style={[styles.backButton, !canGoBack && styles.backButtonHidden]}
          onPress={onBackPress}
          disabled={!canGoBack}
          activeOpacity={0.9}
        >
          <FontAwesome
            name={isRTL ? 'arrow-right' : 'arrow-left'}
            size={20}
            color={canGoBack ? textColors.primary : 'transparent'}
          />
          <Text style={[styles.backLabel, !canGoBack && styles.backLabelHidden]}>
            {label('common.back', 'Back')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navScroll}
        contentContainerStyle={[styles.navScrollContent, isRTL && styles.navScrollContentRtl]}
      >
        <View style={[styles.shell, isRTL && styles.shellRtl]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, styles.scrollTab, { width: navItemWidth }, isActive && styles.activeTab]}
                onPress={() => onTabPress(tab.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.iconWrap, isActive && styles.activeIconWrap]}>
                  <FontAwesome
                    name={tab.icon}
                    size={26}
                    color={isActive ? '#16a34a' : textColors.muted}
                  />
                </View>
                <Text style={[styles.label, isActive && styles.activeLabel, isRTL && styles.rtlLabel]}>
                  {label(`navigation:tabs.${tab.id}`, tab.id)}
                </Text>
                {isActive ? <View style={styles.activeGlow} /> : null}
              </TouchableOpacity>
            );
          })}
          {user ? (
            <View style={[styles.accountTab, styles.scrollTab, { width: navItemWidth }, accountExpanded && styles.accountTabExpanded]}>
              <TouchableOpacity
                style={[
                  styles.accountTabMain,
                  activeTab === 'profile' && styles.activeTab,
                  accountExpanded && styles.accountTabMainExpanded,
                ]}
                onPress={() => setAccountExpanded((value) => !value)}
                activeOpacity={0.9}
              >
                <View style={[styles.accountIconWrap, activeTab === 'profile' && styles.activeIconWrap]}>
                  <FontAwesome name="user-circle" size={22} color={activeTab === 'profile' ? '#16a34a' : '#94A3B8'} />
                </View>
                <Text numberOfLines={1} style={[styles.label, activeTab === 'profile' && styles.activeLabel, isRTL && styles.rtlLabel]}>
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
                    onPress={handleSignOut}
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#f8fbff',
    borderBottomWidth: 1,
    borderBottomColor: '#d9e6f5',
  },
  inner: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
  },
  innerDesktop: {
    paddingHorizontal: 6,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  topRowRtl: {
    flexDirection: 'row-reverse',
  },
  languageSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e2ef',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  backButtonHidden: {
    opacity: 0,
  },
  backLabel: {
    fontSize: font('navLabel'),
    lineHeight: lh('navLabel'),
    color: textColors.primary,
    fontWeight: '900',
  },
  backLabelHidden: {
    color: 'transparent',
  },
  accountTab: {
    position: 'relative',
    alignItems: 'center',
    minHeight: 84,
    justifyContent: 'flex-start',
    borderRadius: 22,
  },
  scrollTab: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 82,
  },
  accountTabExpanded: {
    minHeight: 176,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  accountTabMain: {
    position: 'relative',
    alignItems: 'center',
    width: '100%',
    minHeight: 84,
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  accountTabMainExpanded: {
    backgroundColor: '#f0fdf4',
  },
  accountIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  accountDropdown: {
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 7,
  },
  accountDropdownItem: {
    minHeight: 36,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  accountDropdownDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  accountDropdownText: {
    color: '#0f766e',
    fontSize: 17,
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
    gap: 10,
    width: '100%',
    padding: 10,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e2ef',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 7,
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
    minHeight: 84,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  activeTab: {
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeIconWrap: {
    backgroundColor: '#ffffff',
    borderColor: '#dcfce7',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  label: {
    fontSize: font('navLabel'),
    lineHeight: lh('navLabel'),
    color: textColors.muted,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '800',
  },
  activeLabel: {
    color: '#15803d',
    fontWeight: '900',
    fontSize: font('body'),
    lineHeight: lh('body'),
  },
  rtlLabel: {
    writingDirection: 'rtl',
  },
  activeGlow: {
    position: 'absolute',
    bottom: 6,
    width: 30,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
});
