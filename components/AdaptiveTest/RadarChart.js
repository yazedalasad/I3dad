/**
 * RADAR CHART COMPONENT
 * 
 * Displays student abilities across subjects in a radar/spider chart
 * Simplified version using SVG (can be enhanced with react-native-svg later)
 */

import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const CHART_SIZE = Math.min(width - 80, 300);
const CENTER = CHART_SIZE / 2;
const RADIUS = CHART_SIZE / 2 - 40;

export default function RadarChart({ abilities }) {
  if (!abilities || abilities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>لا توجد بيانات كافية</Text>
      </View>
    );
  }

  // Limit to 10 subjects for better visualization
  const displayAbilities = abilities.slice(0, 10);
  const angleStep = (2 * Math.PI) / displayAbilities.length;

  // Calculate points for the polygon
  const getPoint = (index, score) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const distance = (score / 100) * RADIUS;
    return {
      x: CENTER + distance * Math.cos(angle),
      y: CENTER + distance * Math.sin(angle)
    };
  };

  // Generate polygon path
  const polygonPoints = displayAbilities.map((ability, index) => {
    const point = getPoint(index, ability.ability_score);
    return `${point.x},${point.y}`;
  }).join(' ');

  // Generate grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { width: CHART_SIZE, height: CHART_SIZE }]}>
        {/* Grid Circles */}
        {gridLevels.map((level) => {
          const r = (level / 100) * RADIUS;
          return (
            <View
              key={level}
              style={[
                styles.gridCircle,
                {
                  width: r * 2,
                  height: r * 2,
                  borderRadius: r,
                  top: CENTER - r,
                  left: CENTER - r,
                }
              ]}
            />
          );
        })}

        {/* Axis Lines */}
        {displayAbilities.map((_, index) => {
          const endPoint = getPoint(index, 100);
          return (
            <View
              key={`axis-${index}`}
              style={[
                styles.axisLine,
                {
                  position: 'absolute',
                  left: CENTER,
                  top: CENTER,
                  width: RADIUS,
                  transform: [
                    { rotate: `${(angleStep * index * 180) / Math.PI - 90}deg` }
                  ],
                  transformOrigin: '0 0',
                }
              ]}
            />
          );
        })}

        {/* Data Points */}
        {displayAbilities.map((ability, index) => {
          const point = getPoint(index, ability.ability_score);
          return (
            <View
              key={`point-${index}`}
              style={[
                styles.dataPoint,
                {
                  left: point.x - 6,
                  top: point.y - 6,
                }
              ]}
            />
          );
        })}

        {/* Labels */}
        {displayAbilities.map((ability, index) => {
          const labelPoint = getPoint(index, 110); // Slightly outside
          const angle = angleStep * index - Math.PI / 2;
          
          // Adjust text alignment based on position
          let textAlign = 'center';
          if (Math.cos(angle) > 0.3) textAlign = 'left';
          if (Math.cos(angle) < -0.3) textAlign = 'right';

          return (
            <View
              key={`label-${index}`}
              style={[
                styles.label,
                {
                  left: labelPoint.x - 40,
                  top: labelPoint.y - 10,
                  width: 80,
                }
              ]}
            >
              <Text style={[styles.labelText, { textAlign }]}>
                {ability.subjects.name_ar}
              </Text>
              <Text style={[styles.labelScore, { textAlign }]}>
                {Math.round(ability.ability_score)}%
              </Text>
            </View>
          );
        })}

        {/* Center Point */}
        <View style={[styles.centerPoint, { left: CENTER - 4, top: CENTER - 4 }]} />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#27ae60' }]} />
          <Text style={styles.legendText}>مستوى قدراتك</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  chartContainer: {
    position: 'relative',
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  gridCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#334155',
  },
  axisLine: {
    height: 1,
    backgroundColor: '#334155',
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27ae60',
    borderWidth: 2,
    borderColor: '#fff',
  },
  label: {
    position: 'absolute',
  },
  labelText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  labelScore: {
    fontSize: 10,
    color: '#27ae60',
    fontWeight: '700',
  },
  centerPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
