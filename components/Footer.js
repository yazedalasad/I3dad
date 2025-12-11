import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, TouchableOpacity, View } from 'react-native';

export default function Footer() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        <FontAwesome name="graduation-cap" size={24} color="#27ae60" /> I3dad
      </Text>
      <Text style={styles.tagline}>تمكين الطلاب العرب الإسرائيليين منذ 2024</Text>
      
      <View style={styles.socialLinks}>
        <TouchableOpacity>
          <FontAwesome name="facebook" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <FontAwesome name="instagram" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <FontAwesome name="linkedin" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
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
        © 2024 I3dad. جميع الحقوق محفوظة. | صنع بـ 
        <FontAwesome name="heart" size={14} color="#27ae60" /> 
        للطلاب العرب الإسرائيليين
      </Text>
    </View>
  );
}
