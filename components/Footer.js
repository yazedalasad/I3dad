import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Footer() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        <FontAwesome name="graduation-cap" size={24} color="#27ae60" /> I3dad
      </Text>

      <Text style={styles.tagline}>تمكين الطلاب العرب الإسرائيليين منذ 2024</Text>

      <View style={styles.socialLinks}>
        <TouchableOpacity accessibilityLabel="facebook">
          <FontAwesome name="facebook" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="instagram">
          <FontAwesome name="instagram" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="linkedin">
          <FontAwesome name="linkedin" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="twitter">
          <FontAwesome name="twitter" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.footerLinks}>
        <TouchableOpacity onPress={() => navigation.navigate('About')}>
          <Text style={styles.link}>من نحن</Text>
        </TouchableOpacity>

        <Text style={styles.separator}>|</Text>
        <Text style={styles.link}>سياسة الخصوصية</Text>

        <Text style={styles.separator}>|</Text>
        <Text style={styles.link}>تواصل معنا</Text>

        <Text style={styles.separator}>|</Text>
        <Text style={styles.link}>دعم</Text>
      </View>

      <Text style={styles.copyright}>
        © 2024 I3dad. جميع الحقوق محفوظة. | صنع بـ{' '}
        <FontAwesome name="heart" size={14} color="#27ae60" /> للطلاب العرب الإسرائيليين
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b2b1f',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  tagline: {
    color: '#dfe6e9',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  link: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    color: '#95a5a6',
    fontSize: 13,
    marginHorizontal: 4,
  },
  copyright: {
    color: '#dfe6e9',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
