import { FontAwesome } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function StudentCard({ student }) {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(5)).current;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
      }),
      Animated.spring(shadowAnim, {
        toValue: 15,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(shadowAnim, {
        toValue: 5,
        useNativeDriver: false,
      })
    ]).start();
  };

  return (
    <Animated.View 
      style={[
        styles.card,
        {
          transform: [{ scale: scaleAnim }],
          shadowRadius: shadowAnim,
          elevation: shadowAnim,
        }
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.nameSection}>
          <Text style={styles.name}>{student.name}</Text>
          <View style={styles.degreeContainer}>
            <FontAwesome name="certificate" size={16} color="#fff" />
            <Text style={styles.degree}>{student.degree}</Text>
          </View>
        </View>
      </View>

      {/* Story Section */}
      <View style={styles.body}>
        <View style={styles.storySection}>
          <Text style={styles.story} numberOfLines={4}>
            {student.story}
          </Text>
        </View>
      </View>

      {/* Job Section - Fixed at bottom */}
      <View style={styles.jobContainer}>
        <FontAwesome name="briefcase" size={16} color="#2c3e50" />
        <Text style={styles.job}>{student.job}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    elevation: 5,
    width: 320,
    height: 300,
    marginVertical: 10,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#27ae60',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  nameSection: {
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'right',
  },
  degreeContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  degree: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  storySection: {
    alignItems: 'flex-end',
  },
  story: {
    color: '#5d6d7e',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
  },
  jobContainer: {
    backgroundColor: '#d5f5e3',
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 2,
    borderTopColor: '#27ae60',
  },
  job: {
    color: '#2c3e50',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'right',
  },
});
