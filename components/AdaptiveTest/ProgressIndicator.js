/**
 * PROGRESS INDICATOR COMPONENT
 * 
 * Shows test progress and current ability estimate
 */

import { StyleSheet, Text, View } from 'react-native';
import { thetaToPercentage } from '../../utils/irt/irtCalculations';

export default function ProgressIndicator({
  current,
  total,
  currentAbility,
  standardError
}) {
  const progress = (current / total) * 100;
  const abilityPercentage = thetaToPercentage(currentAbility);
  
  // Determine ability level
  let abilityLevel = '';
  let abilityColor = '#94A3B8';
  
  if (abilityPercentage >= 80) {
    abilityLevel = 'ممتاز'; // Excellent
    abilityColor = '#27ae60';
  } else if (abilityPercentage >= 60) {
    abilityLevel = 'جيد جداً'; // Very Good
    abilityColor = '#3498db';
  } else if (abilityPercentage >= 40) {
    abilityLevel = 'جيد'; // Good
    abilityColor = '#f39c12';
  } else {
    abilityLevel = 'يحتاج تحسين'; // Needs Improvement
    abilityColor = '#e74c3c';
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            السؤال {current} من {total}
          </Text>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Ability Estimate */}
      {current > 0 && (
        <View style={styles.abilitySection}>
          <View style={styles.abilityRow}>
            <Text style={styles.abilityLabel}>المستوى الحالي:</Text>
            <View style={styles.abilityValue}>
              <Text style={[styles.abilityScore, { color: abilityColor }]}>
                {Math.round(abilityPercentage)}%
              </Text>
              <Text style={[styles.abilityLevel, { color: abilityColor }]}>
                {abilityLevel}
              </Text>
            </View>
          </View>
          
          {/* Confidence Indicator */}
          {standardError && (
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>دقة التقييم:</Text>
              <View style={styles.confidenceBar}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.confidenceSegment,
                      standardError < 0.6 && level <= 5 && styles.confidenceSegmentActive,
                      standardError < 0.4 && level <= 4 && styles.confidenceSegmentActive,
                      standardError < 0.3 && level <= 3 && styles.confidenceSegmentActive,
                      standardError < 0.2 && level <= 2 && styles.confidenceSegmentActive,
                      standardError < 0.1 && level <= 1 && styles.confidenceSegmentActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    padding: 20,
    gap: 16,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  abilitySection: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  abilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  abilityLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  abilityValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  abilityScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  abilityLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  confidenceBar: {
    flexDirection: 'row',
    gap: 4,
  },
  confidenceSegment: {
    width: 20,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
  },
  confidenceSegmentActive: {
    backgroundColor: '#27ae60',
  },
});
