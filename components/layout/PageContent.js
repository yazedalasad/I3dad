import { Platform, StyleSheet, View } from 'react-native';

import { webContent } from '../../src/theme/typography';

/**
 * Centers main content on web with a readable max width; full width on native.
 */
export default function PageContent({ children, style }) {
  return <View style={[styles.wrap, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flex: 1,
    alignSelf: 'center',
    maxWidth: Platform.OS === 'web' ? webContent.maxWidth : undefined,
    paddingHorizontal: webContent.paddingHorizontal,
  },
});
