import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// FIXED: Remove the missing import or replace with a working API URL
// const { API_BASE_URL } = require('../../config/api'); // REMOVE THIS LINE

export default function TotalExamScreen({ navigateTo }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIXED: Add your API URL directly or use environment variable
  const API_BASE_URL = 'http://localhost:8000'; // Or your actual backend URL

  console.log('=== TOTAL EXAM SCREEN DEBUG ===');
  console.log('🚀 STARTING TOTAL EXAM - Checking navigation...');
  console.log('navigateTo function available:', typeof navigateTo === 'function');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching subjects from:', `${API_BASE_URL}/api/subjects/`);
      
      // For testing: Use mock data if API is not available
      const useMockData = true; // Set to false when your API is ready
      
      if (useMockData) {
        console.log('📦 Using mock data for development');
        // Mock data for development
        setTimeout(() => {
          setSubjects([
            { id: 1, name: 'Mathematics', icon: 'calculator', description: 'Test your math skills' },
            { id: 2, name: 'Physics', icon: 'atom', description: 'Physics concepts and formulas' },
            { id: 3, name: 'Chemistry', icon: 'flask', description: 'Chemical reactions and elements' },
            { id: 4, name: 'Biology', icon: 'dna', description: 'Life sciences and organisms' },
            { id: 5, name: 'History', icon: 'landmark', description: 'Historical events and figures' },
            { id: 6, name: 'English', icon: 'language', description: 'Language and literature' },
          ]);
          setLoading(false);
        }, 1000);
        return;
      }
      
      // Real API call
      const response = await fetch(`${API_BASE_URL}/api/subjects/`);
      const data = await response.json();
      
      if (response.ok) {
        setSubjects(data);
        console.log(`📚 Loaded ${data.length} subjects`);
      } else {
        setError(data.message || 'Failed to fetch subjects');
        console.error('❌ Error fetching subjects:', data.message);
      }
    } catch (err) {
      console.error('❌ Network error fetching subjects:', err);
      setError('Network error. Using mock data for now.');
      
      // Fallback to mock data on error
      setSubjects([
        { id: 1, name: 'Mathematics', icon: 'calculator', description: 'Test your math skills' },
        { id: 2, name: 'Physics', icon: 'atom', description: 'Physics concepts and formulas' },
        { id: 3, name: 'Chemistry', icon: 'flask', description: 'Chemical reactions and elements' },
        { id: 4, name: 'Biology', icon: 'dna', description: 'Life sciences and organisms' },
        { id: 5, name: 'History', icon: 'landmark', description: 'Historical events and figures' },
        { id: 6, name: 'English', icon: 'language', description: 'Language and literature' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subject) => {
    console.log(`📝 Selected subject: ${subject.name} (ID: ${subject.id})`);
    
    if (navigateTo && typeof navigateTo === 'function') {
      console.log(`🔄 Navigating to startAdaptiveTest with subject: ${subject.name}`);
      navigateTo('startAdaptiveTest', {
        subjectId: subject.id,
        subjectName: subject.name,
        isComprehensive: false
      });
    } else {
      console.error('❌ Navigation function not available!');
      Alert.alert('Navigation Error', 'Unable to navigate. Please try again.');
    }
  };

  const handleComprehensiveTest = () => {
    console.log('🎯 Starting comprehensive test');
    
    if (navigateTo && typeof navigateTo === 'function') {
      const allSubjectIds = subjects.map(subject => subject.id);
      const allSubjectNames = subjects.map(subject => subject.name);
      
      console.log(`📊 Comprehensive test includes ${allSubjectIds.length} subjects`);
      
      navigateTo('startAdaptiveTest', {
        subjectIds: allSubjectIds,
        subjectNames: allSubjectNames,
        isComprehensive: true
      });
    } else {
      console.error('❌ Navigation function not available!');
      Alert.alert('Navigation Error', 'Unable to navigate. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading subjects...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSubjects}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#27ae60', '#2ecc71']}
        style={styles.header}
      >
        <FontAwesome name="graduation-cap" size={50} color="#fff" />
        <Text style={styles.headerTitle}>Adaptive Assessment</Text>
        <Text style={styles.headerSubtitle}>
          Choose a subject to start your adaptive test
        </Text>
      </LinearGradient>

      {/* Comprehensive Test Card */}
      <TouchableOpacity 
        style={styles.comprehensiveCard} 
        onPress={handleComprehensiveTest}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#3498db', '#2980b9']}
          style={styles.comprehensiveGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="star" size={30} color="#fff" />
          <Text style={styles.comprehensiveTitle}>Comprehensive Test</Text>
          <Text style={styles.comprehensiveDescription}>
            Take a comprehensive test covering all subjects
          </Text>
          <View style={styles.comprehensiveBadge}>
            <Text style={styles.comprehensiveBadgeText}>Recommended</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Subjects Grid */}
      <View style={styles.subjectsContainer}>
        <Text style={styles.sectionTitle}>Choose a Subject</Text>
        <Text style={styles.sectionSubtitle}>
          Select a specific subject for focused assessment
        </Text>
        
        <View style={styles.subjectsGrid}>
          {subjects.length > 0 ? (
            subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={styles.subjectCard}
                onPress={() => handleSubjectSelect(subject)}
                activeOpacity={0.8}
              >
                <View style={styles.subjectIconContainer}>
                  <FontAwesome 
                    name={subject.icon || 'book'} 
                    size={28} 
                    color="#27ae60" 
                  />
                </View>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectDescription}>
                  {subject.description || `Test your knowledge in ${subject.name}`}
                </Text>
                <View style={styles.subjectArrow}>
                  <FontAwesome name="arrow-right" size={16} color="#27ae60" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noSubjectsContainer}>
              <FontAwesome name="book" size={40} color="#95a5a6" />
              <Text style={styles.noSubjectsText}>No subjects available</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchSubjects}>
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>How the Adaptive Test Works</Text>
        
        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Question Difficulty Adjustment</Text>
            <Text style={styles.stepDescription}>
              The test adapts to your level - questions get harder or easier based on your answers
            </Text>
          </View>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Personalized Assessment</Text>
            <Text style={styles.stepDescription}>
              Get a detailed analysis of your strengths and areas for improvement
            </Text>
          </View>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Career Recommendations</Text>
            <Text style={styles.stepDescription}>
              Receive personalized career suggestions based on your performance
            </Text>
          </View>
        </View>
      </View>

      {/* Start Test Button */}
      <TouchableOpacity 
        style={styles.startButton} 
        onPress={handleComprehensiveTest}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#27ae60', '#2ecc71']}
          style={styles.startButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="play-circle" size={24} color="#fff" />
          <Text style={styles.startButtonText}>Start Comprehensive Test</Text>
        </LinearGradient>
      </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noSubjectsContainer: {
    alignItems: 'center',
    padding: 40,
    width: '100%',
  },
  noSubjectsText: {
    fontSize: 18,
    color: '#95a5a6',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  comprehensiveCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  comprehensiveGradient: {
    padding: 24,
    alignItems: 'center',
  },
  comprehensiveTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  comprehensiveDescription: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  comprehensiveBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  comprehensiveBadgeText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '700',
  },
  subjectsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 24,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  subjectIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f8e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subjectDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  subjectArrow: {
    marginTop: 8,
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  startButton: {
    margin: 20,
    marginBottom: 40,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});