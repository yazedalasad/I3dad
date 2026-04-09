import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function GameHeader({
  title,
  subtitle,
  rightContent = null,
  bottomContent = null,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View style={styles.left}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightContent ? <View style={styles.right}>{rightContent}</View> : null}
      </View>

      {bottomContent ? <View style={styles.bottom}>{bottomContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
  },
  right: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  bottom: {
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});
