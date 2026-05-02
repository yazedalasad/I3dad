import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { desertTheme } from '../utils/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WordListChips({
  words = [],
  solvedMap = {},
  selectedWordId = null,
  onSelectWord,
  celebrationTick = 0,
}) {
  const colors = desertTheme.colors;
  const animationValuesRef = useRef({});

  useEffect(() => {
    words.forEach((word) => {
      if (!animationValuesRef.current[word.id]) {
        animationValuesRef.current[word.id] = {
          scale: new Animated.Value(1),
          translateY: new Animated.Value(0),
        };
      }
    });
  }, [words]);

  useEffect(() => {
    if (!celebrationTick) return undefined;

    const orderedWords = [...words].sort((firstWord, secondWord) => {
      const firstNumber = typeof firstWord.number === 'number' ? firstWord.number : 0;
      const secondNumber = typeof secondWord.number === 'number' ? secondWord.number : 0;
      return firstNumber - secondNumber;
    });

    const animations = orderedWords.map((word, index) => {
      const values = animationValuesRef.current[word.id];
      if (!values) return null;

      values.scale.setValue(1);
      values.translateY.setValue(0);

      return Animated.sequence([
        Animated.delay(index * 120),
        Animated.parallel([
          Animated.spring(values.scale, {
            toValue: 1.26,
            speed: 18,
            bounciness: 10,
            useNativeDriver: true,
          }),
          Animated.timing(values.translateY, {
            toValue: -12,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(values.scale, {
            toValue: 1,
            speed: 16,
            bounciness: 8,
            useNativeDriver: true,
          }),
          Animated.spring(values.translateY, {
            toValue: 0,
            speed: 16,
            bounciness: 7,
            useNativeDriver: true,
          }),
        ]),
      ]);
    }).filter(Boolean);

    Animated.parallel(animations).start();

    return () => {
      orderedWords.forEach((word) => {
        const values = animationValuesRef.current[word.id];
        values?.scale?.stopAnimation();
        values?.translateY?.stopAnimation();
      });
    };
  }, [celebrationTick, words]);

  return (
    <View style={styles.wrap}>
      {words.map((word) => {
        const solved = solvedMap[word.id];
        const selected = selectedWordId === word.id;
        if (!animationValuesRef.current[word.id]) {
          animationValuesRef.current[word.id] = {
            scale: new Animated.Value(1),
            translateY: new Animated.Value(0),
          };
        }
        const animationValues = animationValuesRef.current[word.id];

        return (
          <AnimatedPressable
            key={word.id}
            onPress={() => onSelectWord?.(word.id)}
            style={[
              styles.chip,
              {
                backgroundColor: solved ? colors.solved : selected ? colors.selected : colors.chipBg,
                borderColor: solved ? '#6E8F60' : selected ? colors.accentDark : colors.cardBorder,
                transform: [
                  { translateY: animationValues.translateY },
                  {
                    scale: animationValues.scale.interpolate({
                      inputRange: [1, 1.26],
                      outputRange: [selected ? 1.05 : 1, selected ? 1.32 : 1.26],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.chipText }]}>{word.number}</Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'center',
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
