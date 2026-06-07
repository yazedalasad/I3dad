import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { webContent } from '../../src/theme/typography';
import { FLOATING_NAV_BOTTOM_INSET } from '../../navigation/floatingNavConfig';

/**
 * Centers main content on web with a readable max width; full width on native.
 */
export default function PageContent({ children, style, withFloatingNavInset = false }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const paddingHorizontal = isMobile ? 14 : isTablet ? 20 : webContent.paddingHorizontal;
  const maxWidth = Platform.OS === 'web' ? (isMobile ? undefined : Math.min(webContent.maxWidth, 1280)) : undefined;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal,
          maxWidth,
          paddingBottom: withFloatingNavInset ? FLOATING_NAV_BOTTOM_INSET : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flex: 1,
    alignSelf: 'center',
  },
});
