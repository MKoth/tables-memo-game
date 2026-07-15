import { useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TableExercise } from './components/exercises/TableExercise';
import { TableSentenceTransformationExercise } from './components/exercises/TableSentenceTransformationExercise';
import { TableVariantSelectionExercise } from './components/exercises/TableVariantSelectionExercise';
import { TableWordTransformationExercise } from './components/exercises/TableWordTransformationExercise';
import { TableWordLearningTranslationChoiceExercise } from './components/exercises/TableWordLearningTranslationChoiceExercise';
import { TableWordLearningTranslationSpellingExercise } from './components/exercises/TableWordLearningTranslationSpellingExercise';
import { TableWordLearningTranslationMatchExercise } from './components/exercises/TableWordLearningTranslationMatchExercise';

type ExerciseKey =
  | 'table'
  | 'wordTransformation'
  | 'sentenceTransformation'
  | 'variantSelection'
  | 'translationChoice'
  | 'translationSpelling'
  | 'translationMatch';

const EXERCISES: { key: ExerciseKey; label: string }[] = [
  { key: 'table', label: 'Table (Conjugation)' },
  { key: 'wordTransformation', label: 'Word Transformation' },
  { key: 'sentenceTransformation', label: 'Sentence Transformation' },
  { key: 'variantSelection', label: 'Variant Selection' },
  { key: 'translationChoice', label: 'Translation Choice' },
  { key: 'translationSpelling', label: 'Translation Spelling' },
  { key: 'translationMatch', label: 'Translation Match' },
];

const EXERCISE_COMPONENTS: Record<ExerciseKey, React.ComponentType> = {
  table: TableExercise,
  wordTransformation: TableWordTransformationExercise,
  sentenceTransformation: TableSentenceTransformationExercise,
  variantSelection: TableVariantSelectionExercise,
  translationChoice: TableWordLearningTranslationChoiceExercise,
  translationSpelling: TableWordLearningTranslationSpellingExercise,
  translationMatch: TableWordLearningTranslationMatchExercise,
};

function ExerciseScreen({
  exerciseKey,
  onBack,
}: {
  exerciseKey: ExerciseKey;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const Exercise = EXERCISE_COMPONENTS[exerciseKey];

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onBack}
        style={[
          styles.backButton,
          { top: insets.top + 8, left: insets.left + 8 },
        ]}>
        <Text style={styles.backArrow}>←</Text>
      </Pressable>
      <Exercise />
    </View>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeExercise, setActiveExercise] = useState<ExerciseKey | null>(null);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {activeExercise ? (
          <ExerciseScreen
            exerciseKey={activeExercise}
            onBack={() => setActiveExercise(null)}
          />
        ) : (
          <MenuScreen onSelect={setActiveExercise} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MenuScreen({ onSelect }: { onSelect: (key: ExerciseKey) => void }) {
  return (
    <View style={styles.menu}>
      {EXERCISES.map(ex => (
        <Pressable
          key={ex.key}
          style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
          onPress={() => onSelect(ex.key)}>
          <Text style={styles.menuButtonText}>{ex.label}</Text>
        </Pressable>
      ))}
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
  menu: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  menuButton: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    alignItems: 'center',
  },
  menuButtonPressed: {
    opacity: 0.7,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    zIndex: 100,
    backgroundColor: 'rgba(46, 204, 113, 0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
});

export default App;
