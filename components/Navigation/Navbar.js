import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({ activeTab, onTabPress }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const label = (key, fallback) => {
    const v = t(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

  const tabs = user
    ? [
        { id: 'home', icon: 'home' },
        { id: 'successStories', icon: 'star' },
        { id: 'activities', icon: 'calendar-check-o' },
        { id: 'test', icon: 'edit' }, // ✅ كان accountant — خليها test عشان تطابق keys
        { id: 'profile', icon: 'user' },
      ]
    : [
        { id: 'home', icon: 'home' },
        { id: 'successStories', icon: 'star' },
        { id: 'activities', icon: 'calendar-check-o' },
        { id: 'about', icon: 'info-circle' },
        { id: 'login', icon: 'sign-in' },
      ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabPress(tab.id)}
        >
          <FontAwesome
            name={tab.icon}
            size={24}
            color={activeTab === tab.id ? '#27ae60' : '#94A3B8'}
          />
          <Text style={[styles.label, activeTab === tab.id && styles.activeLabel]}>
            {label(`navigation:tabs.${tab.id}`, tab.id)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  activeLabel: {
    color: '#27ae60',
    fontWeight: '600',
  },
});
