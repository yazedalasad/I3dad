import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const GENERAL_PHYSICS_RULES = [
  'F = m a',
  'a = F / m',
  'W = m g',
  'F_net = F_applied - F_resist',
  'v = a t',
  'd = 1/2 a t^2',
];

const GENERAL_SYMBOLS =
  'F: force, m: mass, a: acceleration, W: weight, g: gravity, v: speed, t: time, d: distance';

export default function PhysicsRuleBook({ teaching, compact = false, collapsed = false }) {
  if (!teaching) return null;
  const generalRules = teaching.generalRules || GENERAL_PHYSICS_RULES;
  const generalSymbols = teaching.generalSymbols || GENERAL_SYMBOLS;

  return (
    <View style={[styles.card, compact && styles.cardCompact, collapsed && styles.cardCollapsed]}>
      <Text style={styles.kicker}>PHYSICS RULEBOOK</Text>
      <Text style={[styles.title, collapsed && styles.titleCollapsed]}>{teaching.title || 'How to win'}</Text>

      {!collapsed ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Win Condition</Text>
          <Text style={styles.body}>{teaching.winCondition}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Core Law</Text>
        <Text style={[styles.body, collapsed && styles.bodyCollapsed]}>{teaching.physicsRule}</Text>
      </View>

      {Array.isArray(teaching.formulas) && teaching.formulas.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Useful Formulas</Text>
          {teaching.formulas.map((formula) => (
            <Text key={formula} style={styles.formula}>
              {formula}
            </Text>
          ))}
        </View>
      ) : null}

      {!collapsed ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Physics Laws</Text>
        {generalRules.map((formula) => (
          <Text key={formula} style={styles.formulaMuted}>
            {formula}
          </Text>
        ))}
      </View>
      ) : null}

      {teaching.symbols ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symbols</Text>
          <Text style={styles.body}>{teaching.symbols}</Text>
        </View>
      ) : null}

      {!collapsed ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Symbols</Text>
        <Text style={styles.body}>{generalSymbols}</Text>
      </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Adjust</Text>
        <Text style={[styles.body, collapsed && styles.bodyCollapsed]}>{teaching.strategy}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#FBF2DE',
    borderWidth: 1.5,
    borderColor: '#C79A43',
    shadowColor: '#8A5A14',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cardCompact: {
    marginTop: 14,
  },
  cardCollapsed: {
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
  },
  kicker: {
    color: '#8A5A14',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    color: '#1F2937',
    fontSize: 22,
    fontWeight: '900',
  },
  titleCollapsed: {
    fontSize: 17,
  },
  section: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9D2A1',
  },
  sectionTitle: {
    color: '#7C3F00',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  body: {
    marginTop: 6,
    color: '#334155',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  bodyCollapsed: {
    fontSize: 17,
    lineHeight: 17,
  },
  formula: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: '#D8B56B',
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  formulaMuted: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F4E7C8',
    borderWidth: 1,
    borderColor: '#D8B56B',
    color: '#3A2B14',
    fontSize: 17,
    fontWeight: '900',
  },
});
