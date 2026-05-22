import { Platform } from 'react-native';

/** Web: `textShadow` string; native: RN textShadow* props. */
export function textShadowStyle(color, offset = { width: 0, height: 1 }, radius = 4) {
  if (Platform.OS === 'web') {
    const { width = 0, height = 0 } = offset;
    return { textShadow: `${width}px ${height}px ${radius}px ${color}` };
  }
  return {
    textShadowColor: color,
    textShadowOffset: offset,
    textShadowRadius: radius,
  };
}

/** Web: `boxShadow` string; native: RN shadow* props. */
export function boxShadowStyle(
  color,
  offset = { width: 0, height: 2 },
  opacity = 0.12,
  radius = 8,
  elevation
) {
  if (Platform.OS === 'web') {
    const { width = 0, height = 0 } = offset;
    const alpha =
      typeof color === 'string' && color.startsWith('rgba')
        ? color
        : `rgba(0,0,0,${opacity})`;
    return { boxShadow: `${width}px ${height}px ${radius}px ${alpha}` };
  }
  const style = {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
  if (elevation != null) style.elevation = elevation;
  return style;
}
