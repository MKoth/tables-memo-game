/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TableExercise } from './components/exercises/TableExercise';
import { TableSentenceTransformationExercise } from './components/exercises/TableSentenceTransformationExercise';
import { TableVariantSelectionExercise } from './components/exercises/TableVariantSelectionExercise';
import { TableWordTransformationExercise } from './components/exercises/TableWordTransformationExercise';
import { TableWordLearningTranslationChoiceExercise } from './components/exercises/TableWordLearningTranslationChoiceExercise';
import { TableWordLearningTranslationSpellingExercise } from './components/exercises/TableWordLearningTranslationSpellingExercise';
import { TableWordLearningTranslationMatchExercise } from './components/exercises/TableWordLearningTranslationMatchExercise';

/** Dev switch: 'table' | 'wordTransformation' | 'sentenceTransformation' | 'variantSelection' | 'translationChoice' | 'translationSpelling' | 'translationMatch' */
const ACTIVE_EXERCISE: 'table' | 'wordTransformation' | 'sentenceTransformation' | 'variantSelection' | 'translationChoice' | 'translationSpelling' | 'translationMatch' =
  'translationMatch';

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
      ) : ACTIVE_EXERCISE === 'wordTransformation' ? (
        <TableWordTransformationExercise />
      ) : ACTIVE_EXERCISE === 'variantSelection' ? (
        <TableVariantSelectionExercise />
      ) : ACTIVE_EXERCISE === 'translationChoice' ? (
        <TableWordLearningTranslationChoiceExercise />
      ) : ACTIVE_EXERCISE === 'translationSpelling' ? (
        <TableWordLearningTranslationSpellingExercise />
      ) : ACTIVE_EXERCISE === 'translationMatch' ? (
        <TableWordLearningTranslationMatchExercise />
      ) : (
        <TableSentenceTransformationExercise />
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
