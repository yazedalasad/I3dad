import React from 'react';
import { View } from 'react-native';
import { ChoiceButton } from '../shared';

export default function DiagnosticOptionsList({ choices = [], t, onChoose, disabled = false }) {
  return (
    <View>
      {choices.map((choice) => (
        <ChoiceButton
          key={choice.id}
          title={t(choice.title)}
          description={t(choice.description)}
          onPress={() => onChoose(choice)}
          disabled={disabled}
          variant={choice.isOptimal ? 'secondary' : 'primary'}
        />
      ))}
    </View>
  );
}
