/**
 * RADAR CHART COMPONENT (Theme matched: blue/white/yellow)
 *
 * ✅ Supports BOTH usages:
 * 1) <RadarChart abilities={[{ ability_score, subjects:{name_ar/name_he/name_en} }]} />
 * 2) <RadarChart labels={['Math', ...]} values={[80, ...]} />
 *
 * i18n:
 * - UI strings (title/legend/empty) from i18next
 * - Labels (subject names) from DB (name_ar/name_he) when "abilities" is used
 *
 * Note: Pure React Native (no SVG).
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const CHART_SIZE = Math.min(width - 80, 320);
const CENTER = CHART_SIZE / 2;
const RADIUS = CHART_SIZE / 2 - 44;

const gridLevels = [20, 40, 60, 80, 100];

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isHe(lang) {
  return String(lang || '').toLowerCase().startsWith('he');
}

function getSubjectNameByLang(ability, index, lang) {
  const s = ability?.subjects;
  const fallback = ability?.subjectName || `Subject ${index + 1}`;

  if (String(lang).toLowerCase() === 'ar') {
    return s?.name_ar || s?.name_en || s?.name_he || fallback;
  }
  if (isHe(lang)) {
    return s?.name_he || s?.name_en || s?.name_ar || fallback;
  }
  return s?.name_en || s?.name_ar || s?.name_he || fallback;
}

export default function RadarChart({ abilities, labels, values }) {
  const { t: rawT, i18n } = useTranslation();
  const lang = i18n.language;

  const t = (key, fallback) => {
    const v = rawT(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

  // Build a unified list of abilities either from:
  // - "abilities" (original format, DB subject names)
  // - OR (labels + values) format
  const computedAbilities = useMemo(() => {
    if (Array.isArray(abilities) && abilities.length) return abilities;

    if (
      Array.isArray(labels) &&
      Array.isArray(values) &&
      labels.length &&
      values.length
    ) {
      return labels
        .map((name, i) => ({
          ability_score: safeNum(values[i]),
          // keep labels as all languages for safety
          subjects: {
            name_ar: String(name || '').trim(),
            name_he: String(name || '').trim(),
            name_en: String(name || '').trim(),
          },
        }))
        .filter((x, idx) => String(getSubjectNameByLang(x, idx, lang) || '').trim().length > 0);
    }

    return [];
  }, [abilities, labels, values, lang]);

  if (!computedAbilities.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t(
            'results.noRadarData',
            String(lang).toLowerCase() === 'ar'
              ? 'لا توجد بيانات كافية لعرض الرسم.'
              : 'אין מספיק נתונים כדי להציג את התרשים.'
          )}
        </Text>
      </View>
    );
  }

  // Sort by score and show Top 8 for clarity
  const displayAbilities = [...computedAbilities]
    .sort((a, b) => safeNum(b.ability_score) - safeNum(a.ability_score))
    .slice(0, 8);

  const angleStep = (2 * Math.PI) / displayAbilities.length;

  const getPoint = (index, score) => {
    const angle = angleStep * index - Math.PI / 2; // start at top
    const distance = (safeNum(score) / 100) * RADIUS;
    return {
      x: CENTER + distance * Math.cos(angle),
      y: CENTER + distance * Math.sin(angle),
      angle,
    };
  };

  const title = t(
    'results.radarTitle',
    String(lang).toLowerCase() === 'ar'
      ? 'خريطة القدرات حسب المواد'
      : 'מפת יכולות לפי מקצועות'
  );

  const topN = t(
    'results.topN',
    String(lang).toLowerCase() === 'ar' ? 'أفضل {{n}}' : 'מובילים {{n}}'
  ).replace('{{n}}', String(displayAbilities.length));

  const legendPoints = t(
    'results.legendPoints',
    String(lang).toLowerCase() === 'ar' ? 'نقاط الأداء' : 'נקודות ביצוע'
  );

  const legendLevels = t(
    'results.legendLevels',
    String(lang).toLowerCase() === 'ar' ? 'مستويات (20–100)' : 'רמות (20–100)'
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{topN}</Text>
        </View>
      </View>

      <View style={[styles.chartContainer, { width: CHART_SIZE, height: CHART_SIZE }]}>
        {/* Grid circles */}
        {gridLevels.map((level) => {
          const r = (level / 100) * RADIUS;
          return (
            <View
              key={`grid-${level}`}
              style={[
                styles.gridCircle,
                {
                  width: r * 2,
                  height: r * 2,
                  borderRadius: r,
                  top: CENTER - r,
                  left: CENTER - r,
                },
              ]}
            />
          );
        })}

        {/* Level labels (left side) */}
        {gridLevels.map((level) => {
          const r = (level / 100) * RADIUS;
          return (
            <Text
              key={`lvl-${level}`}
              style={[
                styles.levelText,
                {
                  left: CENTER - r - 18,
                  top: CENTER - 10,
                },
              ]}
            >
              {level}
            </Text>
          );
        })}

        {/* Axes */}
        {displayAbilities.map((_, index) => (
          <View
            key={`axis-${index}`}
            style={[
              styles.axisLine,
              {
                position: 'absolute',
                left: CENTER,
                top: CENTER,
                width: RADIUS,
                transform: [{ rotate: `${(angleStep * index * 180) / Math.PI - 90}deg` }],
              },
            ]}
          />
        ))}

        {/* Points */}
        {displayAbilities.map((ability, index) => {
          const score = safeNum(ability.ability_score);
          const point = getPoint(index, score);
          return (
            <View
              key={`point-${index}`}
              style={[
                styles.dataPoint,
                {
                  left: point.x - 7,
                  top: point.y - 7,
                },
              ]}
            />
          );
        })}

        {/* Labels */}
        {displayAbilities.map((ability, index) => {
          const score = safeNum(ability.ability_score);
          const labelPoint = getPoint(index, 112); // slightly outside
          const name = getSubjectNameByLang(ability, index, lang);

          let textAlign = 'center';
          if (Math.cos(labelPoint.angle) > 0.3) textAlign = 'left';
          if (Math.cos(labelPoint.angle) < -0.3) textAlign = 'right';

          return (
            <View
              key={`label-${index}`}
              style={[
                styles.label,
                {
                  left: labelPoint.x - 52,
                  top: labelPoint.y - 14,
                  width: 104,
                },
              ]}
            >
              <Text style={[styles.labelText, { textAlign }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.labelScore, { textAlign }]}>{Math.round(score)}%</Text>
            </View>
          );
        })}

        {/* Center dot */}
        <View style={[styles.centerPoint, { left: CENTER - 4, top: CENTER - 4 }]} />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>{legendPoints}</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendText}>{legendLevels}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12 },

  headerRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#142B63',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'right',
  },
  badge: {
    backgroundColor: '#EEF3FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: { color: '#1B3A8A', fontWeight: '900', fontSize: 11 },

  emptyContainer: { height: 220, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6B7FAE', fontWeight: '800' },

  chartContainer: {
    position: 'relative',
    backgroundColor: '#F6F8FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },

  gridCircle: { position: 'absolute', borderWidth: 1, borderColor: '#D6E0FF' },
  axisLine: { height: 1, backgroundColor: '#D6E0FF' },

  levelText: {
    position: 'absolute',
    color: '#6B7FAE',
    fontSize: 10,
    fontWeight: '800',
  },

  dataPoint: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5B301',
    borderWidth: 2,
    borderColor: '#1B3A8A',
  },

  label: { position: 'absolute' },
  labelText: { fontSize: 11, color: '#142B63', fontWeight: '900' },
  labelScore: { marginTop: 2, fontSize: 10, color: '#1B3A8A', fontWeight: '900' },

  centerPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B3A8A',
  },

  legend: {
    flexDirection: 'row-reverse',
    gap: 14,
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5B301',
    borderWidth: 2,
    borderColor: '#1B3A8A',
  },
  legendLine: { width: 18, height: 2, backgroundColor: '#D6E0FF', borderRadius: 2 },
  legendText: { color: '#6B7FAE', fontWeight: '800', fontSize: 12 },
});
