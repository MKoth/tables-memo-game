import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { animalsWordList } from '../../../data/wordsData';
import { UnderseaThemeBackground } from './background';
import {
  UnderseaThemeClockProvider,
  UnderseaThemeRuntimeProvider,
  WORD_LEARNING_STORE_CONFIG,
  useUnderseaThemeAssetsContext,
  useUnderseaThemeClock,
  useUnderseaThemeExerciseStore,
  useUnderseaThemeLayout,
} from './core';
import type { UnderseaThemeSoundController } from './core/assets/useUnderseaThemeSounds';
import { DecorativeKoiLayer } from './koi/DecorativeKoiLayer/DecorativeKoiLayer';
import { UnderseaThemeExerciseShell } from './shared/UnderseaThemeExerciseShell';
import { UnderseaThemeCornerControls } from './ui';
import { LetterBubble } from './wordTransformation/components/LetterBubble';
import { useTranslationSpellingGame } from './wordLearning/translationSpelling/hooks/useTranslationSpellingGame';
import { computeLetterLayout, computePoolLetterLayout, TRANSFORMATION_WORD_ROW_Y_RATIO } from './core/layout/underseaExerciseLayout';

const DECORATIVE_KOI_Z = 2;
const ENGLISH_WORD_LAYER_Z = 5;
const SPANISH_WORD_LAYER_Z = 6;
const POOL_LAYER_Z = 10;
const FLIGHT_LAYER_Z = 11;

const SPANISH_ROW_Y_RATIO = 0.6;

type TranslationSpellingContentProps = {
  sounds: UnderseaThemeSoundController;
};

function TranslationSpellingContent({ sounds }: TranslationSpellingContentProps) {
  const wordList = animalsWordList;
  const soundEnabled = useUnderseaThemeExerciseStore(state => state.soundEnabled);

  const { koiRect, jellyRect, orientation } = useUnderseaThemeLayout();

  useEffect(() => {
    sounds.startWaterflow();
    return () => {
      sounds.stopWaterflow();
    };
  }, [sounds]);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [sounds, soundEnabled]);

  const game = useTranslationSpellingGame({
    wordList,
    orientation,
    koiRect,
    jellyRect,
    playBubbleInflate: sounds.playBubbleInflate,
    playWrong: sounds.playWrongClick,
  });

  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const englishLayout = useMemo(() => {
    const count = game.englishLetters.length;
    if (count === 0) return { diameter: 0, rowY: 0, centers: [] };
    return computeLetterLayout(jellyRect, count, TRANSFORMATION_WORD_ROW_Y_RATIO, { gapRatio: 0.12, minDiameter: 26 });
  }, [jellyRect, game.englishLetters.length]);

  const spanishLayout = useMemo(() => {
    const count = game.spanishLetters.length;
    if (count === 0) return { diameter: 0, rowY: 0, centers: [] };
    return computeLetterLayout(jellyRect, count, SPANISH_ROW_Y_RATIO, { gapRatio: 0.12, minDiameter: 26 });
  }, [jellyRect, game.spanishLetters.length]);

  const poolLayout = useMemo(() => {
    const count = game.poolLetters.length;
    if (count === 0) return { diameter: 0, positions: [] };
    return computePoolLetterLayout(koiRect, count);
  }, [koiRect, game.poolLetters.length]);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const wordFont = useMemo(
    () => matchFont({ fontFamily, fontSize: Math.max(16, englishLayout.diameter * 0.5), fontWeight: '700' }),
    [englishLayout.diameter, fontFamily],
  );
  const poolFont = useMemo(
    () => matchFont({ fontFamily, fontSize: Math.max(16, poolLayout.diameter * 0.5), fontWeight: '700' }),
    [poolLayout.diameter, fontFamily],
  );

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <DecorativeKoiLayer zIndex={DECORATIVE_KOI_Z} />
      <View style={styles.englishWordLayer} pointerEvents="box-none">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {game.englishLetters.map(letter => {
            const centerX = englishLayout.centers[letter.position] ?? 0;
            return (
              <LetterBubble
                key={letter.key}
                char={letter.char}
                centerX={centerX}
                centerY={englishLayout.rowY}
                diameter={englishLayout.diameter}
                initialCenterX={letter.skipEnter ? centerX : undefined}
                initialCenterY={letter.skipEnter ? englishLayout.rowY : undefined}
                initialDiameter={letter.skipEnter ? englishLayout.diameter : undefined}
                skipEnter={letter.skipEnter}
                status={letter.popped ? 'popped' : 'idle'}
                popDelayMs={letter.popDelayMs}
                enterDelayMs={letter.enterDelayMs}
                image={images.bubble}
                font={wordFont}
                clock={clock}
                onPopSound={letter.popDelayMs != null ? sounds.playBubblePop : undefined}
                onEnterSound={letter.enterDelayMs != null ? sounds.playBubbleInflate : undefined}
              />
            );
          })}
        </Canvas>
      </View>
      <View style={styles.spanishWordLayer} pointerEvents="box-none">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {game.spanishLetters.filter(l => !l.skipEnter).map(letter => {
            const centerX = spanishLayout.centers[letter.position] ?? 0;
            return (
              <LetterBubble
                key={letter.key}
                char={letter.char}
                centerX={centerX}
                centerY={spanishLayout.rowY}
                diameter={spanishLayout.diameter}
                initialCenterX={letter.skipEnter ? centerX : undefined}
                initialCenterY={letter.skipEnter ? spanishLayout.rowY : undefined}
                initialDiameter={letter.skipEnter ? spanishLayout.diameter : undefined}
                skipEnter={letter.skipEnter}
                status={letter.popped ? 'popped' : 'idle'}
                popDelayMs={letter.popDelayMs}
                enterDelayMs={letter.enterDelayMs}
                image={images.bubble}
                font={wordFont}
                clock={clock}
                onPopSound={letter.popDelayMs != null ? sounds.playBubblePop : undefined}
                onEnterSound={letter.enterDelayMs != null ? sounds.playBubbleInflate : undefined}
              />
            );
          })}
        </Canvas>
      </View>
      <View style={styles.poolLayer} pointerEvents="box-none">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {game.poolLetters.map((letter, index) => {
            if (letter.used || letter.popped) return null;
            const pos = poolLayout.positions[index];
            if (pos == null) return null;
            return (
              <LetterBubble
                key={letter.id}
                char={letter.char}
                centerX={pos.centerX}
                centerY={pos.centerY}
                diameter={poolLayout.diameter}
                status={letter.wrong ? 'wrong' : letter.popping ? 'popped' : 'idle'}
                popDelayMs={letter.popping ? letter.popDelayMs : undefined}
                enterDelayMs={letter.enterDelayMs}
                image={images.bubble}
                font={poolFont}
                clock={clock}
                onPopSound={letter.popping ? sounds.playBubblePop : undefined}
                onEnterSound={letter.enterDelayMs != null ? sounds.playBubbleInflate : undefined}
              />
            );
          })}
        </Canvas>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {game.poolLetters.map((letter, index) => {
            if (letter.used || letter.popped || letter.popping) return null;
            const pos = poolLayout.positions[index];
            if (pos == null) return null;
            return (
              <Pressable
                key={letter.id}
                onPress={() => game.handleLetterTap(letter.id)}
                style={[
                  styles.hit,
                  {
                    left: pos.centerX - poolLayout.diameter * 0.5,
                    top: pos.centerY - poolLayout.diameter * 0.5,
                    width: poolLayout.diameter,
                    height: poolLayout.diameter,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
      {game.activeFlight != null && (
        <View style={styles.flightLayer} pointerEvents="none">
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <LetterBubble
              key={game.activeFlight.id}
              char={game.activeFlight.char}
              centerX={game.activeFlight.toCenterX}
              centerY={game.activeFlight.toCenterY}
              diameter={game.activeFlight.toDiameter}
              initialCenterX={game.activeFlight.fromCenterX}
              initialCenterY={game.activeFlight.fromCenterY}
              initialDiameter={game.activeFlight.fromDiameter}
              skipEnter
              moveDurationMs={game.activeFlight.flyDurationMs}
              status="idle"
              image={images.bubble}
              font={poolFont}
              clock={clock}
            />
          </Canvas>
        </View>
      )}
      <UnderseaThemeCornerControls helpVisible={false} />
    </View>
  );
}

function TranslationSpellingContentWithSounds() {
  const { sounds } = useUnderseaThemeAssetsContext();
  return (
    <UnderseaThemeRuntimeProvider>
      <UnderseaThemeClockProvider>
        <TranslationSpellingContent sounds={sounds} />
      </UnderseaThemeClockProvider>
    </UnderseaThemeRuntimeProvider>
  );
}

export function UnderseaThemeWordLearningTranslationSpellingExercise() {
  return (
    <UnderseaThemeExerciseShell storeConfig={WORD_LEARNING_STORE_CONFIG}>
      <TranslationSpellingContentWithSounds />
    </UnderseaThemeExerciseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  englishWordLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: ENGLISH_WORD_LAYER_Z,
  },
  spanishWordLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: SPANISH_WORD_LAYER_Z,
  },
  poolLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: POOL_LAYER_Z,
  },
  flightLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: FLIGHT_LAYER_Z,
  },
  hit: {
    position: 'absolute',
    borderRadius: 999,
  },
});
