import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

const SIZE = 260;
const CENTER = SIZE / 2;
const MAX_RADIUS = 82;
const LABEL_RADIUS = 112;
const GRID_LEVELS = [0.35, 0.65, 1];
const COLORS = {
  grid: '#DCE7FF',
  axis: '#C8D8F8',
  fill: 'rgba(37, 99, 235, 0.18)',
  stroke: '#2563EB',
  dot: '#F5B400',
  dotBorder: '#0F2A5F',
  label: '#0F2A5F',
  percent: '#52678F',
};

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function pointAt(index, radius, total = 5) {
  const angle = (-90 + index * (360 / total)) * (Math.PI / 180);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function pointsString(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export default function BigFiveRadarChart({ data = [] }) {
  const traits = data.slice(0, 5).map((item) => ({
    label: String(item?.label || '').trim(),
    value: clampScore(item?.value),
  }));

  const scorePoints = traits.map((trait, index) =>
    pointAt(index, (trait.value / 100) * MAX_RADIUS, traits.length)
  );

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} accessible>
        {GRID_LEVELS.map((level) => {
          const ringPoints = traits.map((_, index) => pointAt(index, MAX_RADIUS * level, traits.length));
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

        {traits.map((_, index) => {
          const end = pointAt(index, MAX_RADIUS, traits.length);
          return (
            <Line
              key={`axis-${index}`}
              x1={CENTER}
              y1={CENTER}
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

        {scorePoints.map((point, index) => (
          <Circle
            key={`dot-${traits[index].label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={4.5}
            fill={COLORS.dot}
            stroke={COLORS.dotBorder}
            strokeWidth={1.5}
          />
        ))}

        {traits.map((trait, index) => {
          const labelPoint = pointAt(index, LABEL_RADIUS, traits.length);
          const anchor = labelPoint.x > CENTER + 24 ? 'start' : labelPoint.x < CENTER - 24 ? 'end' : 'middle';
          const baselineOffset = labelPoint.y < CENTER ? -2 : 12;
          return (
            <Fragment key={`label-${trait.label}-${index}`}>
              <SvgText
                x={labelPoint.x}
                y={labelPoint.y + baselineOffset}
                fill={COLORS.label}
                fontSize={13}
                fontWeight="800"
                textAnchor={anchor}
              >
                {trait.label}
              </SvgText>
              <SvgText
                x={labelPoint.x}
                y={labelPoint.y + baselineOffset + 16}
                fill={COLORS.percent}
                fontSize={11}
                fontWeight="700"
                textAnchor={anchor}
              >
                {`${Math.round(trait.value)}%`}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
