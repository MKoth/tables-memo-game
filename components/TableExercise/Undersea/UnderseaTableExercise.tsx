import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaBackground } from './UnderseaBackground';
import { JellyfishTableLayer } from './JellyfishTableLayer';
import { sampleSpanishTable } from '../../../data/tableData';

export function UnderseaTableExercise() {
  return (
    <View style={styles.container}>
      {/* Decorative background: seafloor, seaweed, stones, koi */}
      <UnderseaBackground />
      {/* Interactive jellyfish table — manages its own gesture capture */}
      <JellyfishTableLayer table={sampleSpanishTable} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
