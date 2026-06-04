import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UnderseaBackground } from './UnderseaBackground';

export function UnderseaTableExercise() {
  return (
    <View style={styles.container}>
      <UnderseaBackground />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
