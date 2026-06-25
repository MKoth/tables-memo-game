import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaBackground } from './UnderseaBackground';
import { UnderseaClockProvider } from './UnderseaClockContext';
import { JellyfishTableLayer } from './JellyfishTableLayer';
import { KoiSwimZone } from './KoiSwimZone';
import { getTableBodyWords, spanishPresentTable2Singular } from '../../../data/tableData';

export function UnderseaTableExercise() {
  const table = spanishPresentTable2Singular;
  const words = useMemo(() => getTableBodyWords(table), [table]);

  return (
    <UnderseaClockProvider>
      <View style={styles.container}>
        <UnderseaBackground />
        <KoiSwimZone words={words} />
        <JellyfishTableLayer table={table} />
      </View>
    </UnderseaClockProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
