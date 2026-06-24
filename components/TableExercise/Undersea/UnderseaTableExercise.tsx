import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaBackground } from './UnderseaBackground';
import { JellyfishTableLayer } from './JellyfishTableLayer';
import { spanishPresentTable2 } from '../../../data/tableData';

export function UnderseaTableExercise() {
  return (
    <View style={styles.container}>
      {/* Decorative background: seafloor, seaweed, stones, koi */}
      <UnderseaBackground />
      {/* Interactive jellyfish table — manages its own gesture capture */}
      <JellyfishTableLayer table={spanishPresentTable2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
