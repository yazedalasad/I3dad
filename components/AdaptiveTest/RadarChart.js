/**
 * Radar chart — SVG layout with spaced trait labels and a single left scale axis.
 *
 * Supports:
 * 1) <RadarChart abilities={[{ ability_score, subjects }]} />
 * 2) <RadarChart labels={[...]} values={[...]} />
 */

import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

function traitPressHandlers(interactive, index, selectedIndex, onTraitPress) {
  if (!interactive || typeof onTraitPress !== 'function') return {};
  const selected = selectedIndex === index;
  return {
    onPress: () => onTraitPress(index),
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  };
}

const GRID_LEVELS = [20, 40, 60, 80, 100];

const DEFAULT_LABEL_LAYOUT = {
  textAnchor: 'middle',
  percentDy: -14,
  labelDy: 12,
  labelLineDy: 15,
  radiusBoost: 0,
  labelSize: 15,
  percentSize: 20,
};

const COLORS = {
  grid: '#DCE7FF',
  axis: '#C8D8F8',
  fill: 'rgba(37, 99, 235, 0.2)',
  stroke: '#2563EB',
  dot: '#F59E0B',
  dotBorder: '#0F2A5F',
  label: '#102A68',
  percent: '#1E4FBF',
};

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isHe(lang) {
  return String(lang || '').toLowerCase().startsWith('he');
}

function isRtlLang(lang) {
  const value = String(lang || '').toLowerCase();
  return value.startsWith('he') || value.startsWith('ar');
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

function shortenLabel(text, maxLen = 14) {
  const value = String(text || '').trim();
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
}

function getChartMetrics(windowWidth) {
  const compact = safeNum(windowWidth, 390) < 520;
  const viewWidth = compact
    ? Math.min(Math.max(safeNum(windowWidth, 360) - 24, 340), 380)
    : Math.min(Math.max(safeNum(windowWidth, 900) - 48, 520), 560);
  const viewHeight = compact ? 420 : 500;
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2 + (compact ? 8 : 10);
  const outerPad = compact ? 76 : 92;
  const radarRadius = Math.min(compact ? 118 : 138, Math.min(centerX, centerY) - outerPad);
  const labelRadius = radarRadius + (compact ? 48 : 55);
  const percentRadius = radarRadius + (compact ? 68 : 78);
  return {
    viewWidth,
    viewHeight,
    centerX,
    centerY,
    radarRadius,
    labelRadius,
    percentRadius,
    compact,
  };
}

function pointAt(index, radius, total, centerX, centerY) {
  const angle = (-90 + index * (360 / total)) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
    angle,
  };
}

function pointsString(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function getLabelZone(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  if (sin < -0.42) return 'top';
  if (sin > 0.42) return 'bottom';
  if (cos < -0.38) return 'left';
  return 'right';
}

function getLabelLayout(zone, compact, lineCount) {
  const gap = compact ? 12 : 14;
  const labelSize = compact ? 14 : 16;
  const percentSize = compact ? 18 : 20;
  const lineStep = compact ? 14 : 15;

  switch (zone) {
    case 'top':
      return {
        textAnchor: 'middle',
        useRadialStack: true,
        labelLineDy: lineStep,
        radiusBoost: compact ? 8 : 10,
        labelSize,
        percentSize,
      };
    case 'bottom':
      return {
        textAnchor: 'middle',
        useRadialStack: true,
        labelLineDy: lineStep,
        radiusBoost: compact ? 6 : 8,
        labelSize,
        percentSize,
      };
    case 'left':
      return {
        textAnchor: 'end',
        useRadialStack: false,
        percentDy: -(gap + 12),
        labelDy: 12,
        labelLineDy: lineStep,
        radiusBoost: compact ? 32 : 38,
        labelSize,
        percentSize,
      };
    case 'right':
      return {
        textAnchor: 'start',
        useRadialStack: false,
        percentDy: -(gap + 12),
        labelDy: 12,
        labelLineDy: lineStep,
        radiusBoost: compact ? 28 : 34,
        labelSize,
        percentSize,
      };
    default:
      return { ...DEFAULT_LABEL_LAYOUT, labelSize, percentSize };
  }
}

function splitLabelLines(name, maxChars = 11) {
  const text = String(name || '').trim();
  if (text.length <= maxChars) return [text];
  const mid = Math.ceil(text.length / 2);
  let splitAt = text.lastIndexOf(' ', mid);
  if (splitAt < 4) splitAt = mid;
  const line1 = text.slice(0, splitAt).trim();
  const line2 = text.slice(splitAt).trim();
  if (!line2) return [line1];
  return [line1, line2];
}

export default function RadarChart({
  abilities,
  labels,
  values,
  headerTitle,
  headerBadge,
  maxItems = 8,
  preserveOrder = false,
  interactive = false,
  selectedIndex = null,
  onTraitPress,
}) {
  const { t: rawT, i18n } = useTranslation();
  const lang = i18n.language;
  const rtl = isRtlLang(lang);
  const { width: windowWidth } = useWindowDimensions();
  const metrics = getChartMetrics(windowWidth);
  const {
    viewWidth,
    viewHeight,
    centerX,
    centerY,
    radarRadius,
    labelRadius,
    percentRadius,
    compact,
  } = metrics;

  const t = (key, fallback) => {
    const v = rawT(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

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

  const displayAbilities = (
    preserveOrder
      ? [...computedAbilities]
      : [...computedAbilities].sort((a, b) => safeNum(b.ability_score) - safeNum(a.ability_score))
  ).slice(0, Math.max(3, Number(maxItems) || 8));

  const count = displayAbilities.length;
  const scorePoints = displayAbilities.map((ability, index) => {
    const score = safeNum(ability.ability_score);
    return pointAt(index, (score / 100) * radarRadius, count, centerX, centerY);
  });

  const title =
    headerTitle ||
    t(
      'results.radarTitle',
      String(lang).toLowerCase() === 'ar'
        ? 'خريطة القدرات حسب المواد'
        : 'מפת יכולות לפי מקצועות'
    );

  const topN =
    headerBadge ||
    t(
      'results.topN',
      String(lang).toLowerCase() === 'ar' ? 'أفضل {{n}}' : 'מובילים {{n}}'
    ).replace('{{n}}', String(displayAbilities.length));

  const legendPoints = t(
    'results.legendPoints',
    String(lang).toLowerCase() === 'ar' ? 'نقاط السمات' : 'נקודות תכונות'
  );

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, rtl && styles.titleRtl]}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{topN}</Text>
        </View>
      </View>

      <View style={[styles.chartFrame, { width: viewWidth, height: viewHeight }]}>
        <Svg width={viewWidth} height={viewHeight} viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
          {GRID_LEVELS.map((level) => {
            const ringPoints = displayAbilities.map((_, index) =>
              pointAt(index, radarRadius * (level / 100), count, centerX, centerY)
            );
            return (
              <Polygon
                key={`grid-${level}`}
                points={pointsString(ringPoints)}
                fill="none"
                stroke={COLORS.grid}
                strokeWidth={1}
              />
            );
          })}

          {displayAbilities.map((_, index) => {
            const end = pointAt(index, radarRadius, count, centerX, centerY);
            return (
              <Line
                key={`axis-${index}`}
                x1={centerX}
                y1={centerY}
                x2={end.x}
                y2={end.y}
                stroke={COLORS.axis}
                strokeWidth={1}
              />
            );
          })}

          <Polygon
            points={pointsString(scorePoints)}
            fill={COLORS.fill}
            stroke={COLORS.stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {interactive
            ? scorePoints.map((point, index) => (
                <Circle
                  key={`hit-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={26}
                  fill="transparent"
                  {...traitPressHandlers(interactive, index, selectedIndex, onTraitPress)}
                />
              ))
            : null}

          {scorePoints.map((point, index) => {
            const selected = interactive && selectedIndex === index;
            return (
              <Circle
                key={`dot-${index}`}
                cx={point.x}
                cy={point.y}
                r={selected ? 7 : compact ? 5 : 5.5}
                fill={COLORS.dot}
                stroke={selected ? '#2455D6' : COLORS.dotBorder}
                strokeWidth={selected ? 2.5 : 1.5}
                {...traitPressHandlers(interactive, index, selectedIndex, onTraitPress)}
              />
            );
          })}

          {displayAbilities.map((ability, index) => {
            const score = Math.round(safeNum(ability.ability_score));
            const name = getSubjectNameByLang(ability, index, lang);
            const axisPoint = pointAt(index, labelRadius, count, centerX, centerY);
            const zone = getLabelZone(axisPoint.angle);
            const lines = splitLabelLines(shortenLabel(name, compact ? 16 : 18), compact ? 10 : 11);
            const layout = {
              ...DEFAULT_LABEL_LAYOUT,
              ...getLabelLayout(zone, compact, lines.length),
            };
            const textAnchor = layout.textAnchor || 'middle';
            const boost = safeNum(layout.radiusBoost, 0);
            const selected = interactive && selectedIndex === index;
            const labelFill = selected ? '#1E4FBF' : COLORS.label;
            const percentFill = selected ? '#2455D6' : COLORS.percent;
            const pressHandlers = traitPressHandlers(interactive, index, selectedIndex, onTraitPress);

            if (layout.useRadialStack) {
              const percentPoint = pointAt(index, percentRadius + boost, count, centerX, centerY);
              const labelPoint = pointAt(index, labelRadius + boost, count, centerX, centerY);

              return (
                <Fragment key={`trait-label-${index}`}>
                  {zone === 'top' ? (
                    <>
                      <SvgText
                        x={percentPoint.x}
                        y={percentPoint.y - 2}
                        fill={percentFill}
                        fontSize={layout.percentSize}
                        fontWeight="800"
                        textAnchor={textAnchor}
                        {...pressHandlers}
                      >
                        {`${score}%`}
                      </SvgText>
                      {lines.map((line, lineIndex) => (
                        <SvgText
                          key={`name-${index}-${lineIndex}`}
                          x={labelPoint.x}
                          y={labelPoint.y + 12 + lineIndex * layout.labelLineDy}
                          fill={labelFill}
                          fontSize={layout.labelSize}
                          fontWeight="800"
                          textAnchor={textAnchor}
                          {...pressHandlers}
                        >
                          {line}
                        </SvgText>
                      ))}
                    </>
                  ) : (
                    <>
                      {lines.map((line, lineIndex) => (
                        <SvgText
                          key={`name-${index}-${lineIndex}`}
                          x={labelPoint.x}
                          y={labelPoint.y + 12 + lineIndex * layout.labelLineDy}
                          fill={labelFill}
                          fontSize={layout.labelSize}
                          fontWeight="800"
                          textAnchor={textAnchor}
                          {...pressHandlers}
                        >
                          {line}
                        </SvgText>
                      ))}
                      <SvgText
                        x={percentPoint.x}
                        y={percentPoint.y + 14}
                        fill={percentFill}
                        fontSize={layout.percentSize}
                        fontWeight="800"
                        textAnchor={textAnchor}
                        {...pressHandlers}
                      >
                        {`${score}%`}
                      </SvgText>
                    </>
                  )}
                </Fragment>
              );
            }

            const anchorPoint = pointAt(index, labelRadius + boost, count, centerX, centerY);

            return (
              <Fragment key={`trait-label-${index}`}>
                <SvgText
                  x={anchorPoint.x}
                  y={anchorPoint.y}
                  dy={safeNum(layout.percentDy, DEFAULT_LABEL_LAYOUT.percentDy)}
                  fill={percentFill}
                  fontSize={layout.percentSize}
                  fontWeight="800"
                  textAnchor={textAnchor}
                  {...pressHandlers}
                >
                  {`${score}%`}
                </SvgText>
                {lines.map((line, lineIndex) => (
                  <SvgText
                    key={`name-${index}-${lineIndex}`}
                    x={anchorPoint.x}
                    y={anchorPoint.y}
                    dy={
                      safeNum(layout.labelDy, DEFAULT_LABEL_LAYOUT.labelDy) +
                      lineIndex * safeNum(layout.labelLineDy, DEFAULT_LABEL_LAYOUT.labelLineDy)
                    }
                    fill={labelFill}
                    fontSize={layout.labelSize}
                    fontWeight="800"
                    textAnchor={textAnchor}
                    {...pressHandlers}
                  >
                    {line}
                  </SvgText>
                ))}
              </Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>{legendPoints}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    flex: 1,
    color: '#142B63',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'left',
  },
  titleRtl: { textAlign: 'right' },
  badge: {
    backgroundColor: '#EEF3FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: { color: '#1B3A8A', fontWeight: '900', fontSize: 14 },

  chartFrame: {
    alignSelf: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    overflow: 'visible',
  },

  emptyContainer: { height: 220, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6B7FAE', fontWeight: '800' },

  legend: {
    width: '100%',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#0F2A5F',
  },
  legendText: { color: '#52678F', fontWeight: '700', fontSize: 13 },
});
