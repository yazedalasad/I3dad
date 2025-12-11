/**
 * PROGRESS INDICATOR COMPONENT
 * 
 * Shows test progress, time remaining, and current ability estimate
 * Optimized for comprehensive exam under 40 minutes
 */

import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { thetaToPercentage } from '../../utils/irt/irtCalculations';

export default function ProgressIndicator({
  current,
  total,
  currentAbility,
  standardError,
  isComprehensive = true,
  overallProgress,
  subjectProgress,
  subjectId,
  subjectCount,
  timeSpent,
  skippedCount,
  totalExamTime,
  remainingTime,
  subjectName
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

  // Calculate time statistics
  const minutesSpent = Math.floor(totalExamTime / 60);
  const secondsSpent = totalExamTime % 60;
  const minutesRemaining = Math.floor(remainingTime / 60);
  const secondsRemaining = remainingTime % 60;

  // Calculate question progress within subject (for comprehensive exam)
  let subjectProgressPercentage = 0;
  if (subjectProgress && subjectProgress.total > 0) {
    subjectProgressPercentage = (subjectProgress.answered / subjectProgress.total) * 100;
  }

  return (
    <View style={styles.container}>
      {/* Header Row: Exam Info */}
      <View style={styles.headerRow}>
        <View style={styles.examInfo}>
          <Text style={styles.examTitle}>الامتحان الشامل</Text>
          {subjectName && (
            <Text style={styles.subjectTitle}>
              {subjectName}
            </Text>
          )}
        </View>
        
        <View style={styles.timeSection}>
          <View style={styles.timeBadge}>
            <FontAwesome name="clock-o" size={14} color="#fff" />
            <Text style={styles.timeText}>
              {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')}
            </Text>
          </View>
          <Text style={styles.timeLabel}>متبقي</Text>
        </View>
      </View>

      {/* Main Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressText}>
              السؤال {current} من {total}
            </Text>
            {isComprehensive && subjectProgress && (
              <Text style={styles.subjectProgressText}>
                {subjectProgress.answered} من {subjectProgress.total} في المادة الحالية
              </Text>
            )}
          </View>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        
        {/* Subject Progress (for comprehensive) */}
        {isComprehensive && subjectProgress && subjectProgress.total > 0 && (
          <View style={styles.subjectProgressBarContainer}>
            <View style={[styles.subjectProgressBar, { width: `${subjectProgressPercentage}%` }]} />
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Ability Estimate */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="chart-line" size={16} color="#3498db" />
            <Text style={styles.statTitle}>المستوى الحالي</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: abilityColor }]}>
              {Math.round(abilityPercentage)}%
            </Text>
            <Text style={[styles.statLabel, { color: abilityColor }]}>
              {abilityLevel}
            </Text>
          </View>
        </View>

        {/* Time Spent */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="hourglass-half" size={16} color="#f39c12" />
            <Text style={styles.statTitle}>الوقت</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {minutesSpent}:{secondsSpent.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>
              دقيقة
            </Text>
          </View>
        </View>

        {/* Skipped Questions */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="forward" size={16} color="#f39c12" />
            <Text style={styles.statTitle}>تخطي</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: skippedCount > 0 ? '#f39c12' : '#27ae60' }]}>
              {skippedCount}
            </Text>
            <Text style={[styles.statLabel, { color: skippedCount > 0 ? '#f39c12' : '#27ae60' }]}>
              {skippedCount === 0 ? 'لا يوجد' : 'سؤال'}
            </Text>
          </View>
        </View>

        {/* Questions per Minute */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="bolt" size={16} color="#27ae60" />
            <Text style={styles.statTitle}>السرعة</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {totalExamTime > 0 ? (current / (totalExamTime / 60)).toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.statLabel}>
              سؤال/دقيقة
            </Text>
          </View>
        </View>
      </View>

      {/* Confidence Indicator */}
      {standardError && (
        <View style={styles.confidenceSection}>
          <View style={styles.confidenceHeader}>
            <Text style={styles.confidenceLabel}>دقة التقييم:</Text>
            <Text style={styles.confidenceValue}>
              {Math.max(0, 100 - (standardError / 0.5) * 100).toFixed(0)}%
            </Text>
          </View>
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

      {/* Time Warning (if less than 10 minutes remaining) */}
      {remainingTime > 0 && remainingTime <= 600 && (
        <View style={styles.timeWarning}>
          <FontAwesome name="exclamation-circle" size={14} color="#e74c3c" />
          <Text style={styles.timeWarningText}>
            أقل من 10 دقائق متبقية
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  examInfo: {
    flex: 1,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subjectTitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timeSection: {
    alignItems: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTextContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  subjectProgressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressPercentage: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 3,
  },
  subjectProgressBarContainer: {
    height: 3,
    backgroundColor: '#0F172A',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 2,
  },
  subjectProgressBar: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 1.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statContent: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  confidenceSection: {
    marginTop: 4,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  confidenceValue: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
  },
  confidenceBar: {
    flexDirection: 'row',
    gap: 4,
  },
  confidenceSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  confidenceSegmentActive: {
    backgroundColor: '#27ae60',
  },
  timeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  timeWarningText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
});