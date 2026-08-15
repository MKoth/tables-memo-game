import { useState } from 'react';
import {
  Pressable,
  ScrollView,
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
import { FlowerGardenTableExercise } from './components/exercises/FlowerGardenTableExercise';
import { FlowerGardenWordTransformationExercise } from './components/exercises/FlowerGardenWordTransformationExercise';
import { FlowerGardenSentenceTransformationExercise } from './components/exercises/FlowerGardenSentenceTransformationExercise';
import { FlowerGardenVariantSelectionExercise } from './components/exercises/FlowerGardenVariantSelectionExercise';
import { FlowerGardenTranslationChoiceExercise } from './components/exercises/FlowerGardenTranslationChoiceExercise';
import { FlowerGardenTranslationSpellingExercise } from './components/exercises/FlowerGardenTranslationSpellingExercise';
import { FlowerGardenTranslationMatchExercise } from './components/exercises/FlowerGardenTranslationMatchExercise';

type ThemeKey = 'undersea' | 'flowerGarden';

type ExerciseKey =
  | 'table'
  | 'wordTransformation'
  | 'sentenceTransformation'
  | 'variantSelection'
  | 'translationChoice'
  | 'translationSpelling'
  | 'translationMatch'
  | 'flowerGardenTable'
  | 'flowerGardenWordTransformation'
  | 'flowerGardenSentenceTransformation'
  | 'flowerGardenVariantSelection'
  | 'flowerGardenTranslationChoice'
  | 'flowerGardenTranslationSpelling'
  | 'flowerGardenTranslationMatch';

const THEMES: { key: ThemeKey; label: string }[] = [
  { key: 'undersea', label: 'Undersea' },
  { key: 'flowerGarden', label: 'Flower Garden' },
];

const EXERCISES: { key: ExerciseKey; theme: ThemeKey; label: string }[] = [
  { key: 'table', theme: 'undersea', label: 'Table (Conjugation)' },
  { key: 'wordTransformation', theme: 'undersea', label: 'Word Transformation' },
  { key: 'sentenceTransformation', theme: 'undersea', label: 'Sentence Transformation' },
  { key: 'variantSelection', theme: 'undersea', label: 'Variant Selection' },
  { key: 'translationChoice', theme: 'undersea', label: 'Translation Choice' },
  { key: 'translationSpelling', theme: 'undersea', label: 'Translation Spelling' },
  { key: 'translationMatch', theme: 'undersea', label: 'Translation Match' },
  { key: 'flowerGardenTable', theme: 'flowerGarden', label: 'Table (Conjugation)' },
  { key: 'flowerGardenWordTransformation', theme: 'flowerGarden', label: 'Word Transformation' },
  { key: 'flowerGardenSentenceTransformation', theme: 'flowerGarden', label: 'Sentence Transformation' },
  { key: 'flowerGardenVariantSelection', theme: 'flowerGarden', label: 'Variant Selection' },
  { key: 'flowerGardenTranslationChoice', theme: 'flowerGarden', label: 'Translation Choice' },
  { key: 'flowerGardenTranslationSpelling', theme: 'flowerGarden', label: 'Translation Spelling' },
  { key: 'flowerGardenTranslationMatch', theme: 'flowerGarden', label: 'Translation Match' },
];

const EXERCISE_COMPONENTS: Record<ExerciseKey, React.ComponentType> = {
  table: TableExercise,
  wordTransformation: TableWordTransformationExercise,
  sentenceTransformation: TableSentenceTransformationExercise,
  variantSelection: TableVariantSelectionExercise,
  translationChoice: TableWordLearningTranslationChoiceExercise,
  translationSpelling: TableWordLearningTranslationSpellingExercise,
  translationMatch: TableWordLearningTranslationMatchExercise,
  flowerGardenTable: FlowerGardenTableExercise,
  flowerGardenWordTransformation: FlowerGardenWordTransformationExercise,
  flowerGardenSentenceTransformation: FlowerGardenSentenceTransformationExercise,
  flowerGardenVariantSelection: FlowerGardenVariantSelectionExercise,
  flowerGardenTranslationChoice: FlowerGardenTranslationChoiceExercise,
  flowerGardenTranslationSpelling: FlowerGardenTranslationSpellingExercise,
  flowerGardenTranslationMatch: FlowerGardenTranslationMatchExercise,
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
  const insets = useSafeAreaInsets();
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('undersea');
  const themeExercises = EXERCISES.filter(ex => ex.theme === activeTheme);

  return (
    <View style={[styles.menu, { paddingTop: insets.top + 16 }]}>
      <View style={styles.tabs}>
        {THEMES.map(theme => {
          const isActive = theme.key === activeTheme;
          return (
            <Pressable
              key={theme.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTheme(theme.key)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {theme.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={[
          styles.menuContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        {themeExercises.map(ex => (
          <Pressable
            key={ex.key}
            style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
            onPress={() => onSelect(ex.key)}>
            <Text style={styles.menuButtonText}>{ex.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
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
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#e8e8f0',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1a1a2e',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  tabTextActive: {
    color: '#fff',
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
