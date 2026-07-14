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
import { TableSentenceTransformationExercise } from './components/TableExercise/TableSentenceTransformationExercise';
import { TableVariantSelectionExercise } from './components/TableExercise/TableVariantSelectionExercise';
import { TableWordTransformationExercise } from './components/TableExercise/TableWordTransformationExercise';
import { TableWordLearningTranslationChoiceExercise } from './components/TableExercise/TableWordLearningTranslationChoiceExercise';
import { TableWordLearningTranslationSpellingExercise } from './components/TableExercise/TableWordLearningTranslationSpellingExercise';

/** Dev switch: 'table' | 'wordTransformation' | 'sentenceTransformation' | 'variantSelection' | 'translationChoice' | 'translationSpelling' */
const ACTIVE_EXERCISE: 'table' | 'wordTransformation' | 'sentenceTransformation' | 'variantSelection' | 'translationChoice' | 'translationSpelling' =
  'translationChoice';

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
