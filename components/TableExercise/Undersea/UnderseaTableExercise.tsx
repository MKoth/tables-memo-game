import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaBackground } from './UnderseaBackground';
import { UnderseaClockProvider } from './UnderseaClockContext';
import { JellyfishTableLayer } from './JellyfishTableLayer';
import { spanishPresentTable2Singular } from '../../../data/tableData';

export function UnderseaTableExercise() {
  return (
    <UnderseaClockProvider>
      <View style={styles.container}>
        {/* Decorative background: seafloor, seaweed, stones, koi */}
        <UnderseaBackground />
        {/* Interactive jellyfish table — manages its own gesture capture */}
        <JellyfishTableLayer table={spanishPresentTable2Singular} />
      </View>
    </UnderseaClockProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
