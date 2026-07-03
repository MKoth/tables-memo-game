/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TableExercise } from './components/TableExercise/TableExercise';
import { TableWordTransformationExercise } from './components/TableExercise/TableWordTransformationExercise';

/** Dev switch: 'table' | 'wordTransformation' */
const ACTIVE_EXERCISE: 'table' | 'wordTransformation' = 'table';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  return (
    <View style={styles.container}>
      {ACTIVE_EXERCISE === 'table' ? (
        <TableExercise />
      ) : (
        <TableWordTransformationExercise />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

export default App;
