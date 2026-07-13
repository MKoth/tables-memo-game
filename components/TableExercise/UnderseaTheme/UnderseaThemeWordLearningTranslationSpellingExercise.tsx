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
import { TransformationWordBubbles } from './wordTransformation/components/TransformationWordBubbles';
import { LetterBubble } from './wordTransformation/components/LetterBubble';
import { useTranslationSpellingGame } from './wordLearning/translationSpelling/hooks/useTranslationSpellingGame';
import { computeLetterLayout, TRANSFORMATION_WORD_ROW_Y_RATIO } from './core/layout/underseaExerciseLayout';

const DECORATIVE_KOI_Z = 2;
const ENGLISH_WORD_LAYER_Z = 5;
const SPANISH_WORD_LAYER_Z = 6;
const POOL_LAYER_Z = 10;
const FLIGHT_LAYER_Z = 11;

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
    playSuccess: sounds.playSuccessClick,
    playWrong: sounds.playWrongClick,
  });

  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const poolLayout = useMemo(() => {
    if (game.poolLetters.length === 0) {
      return { diameter: 0, rowY: 0, centers: [] };
    }
    return computeLetterLayout(jellyRect, game.poolLetters.length, TRANSFORMATION_WORD_ROW_Y_RATIO);
  }, [jellyRect, game.poolLetters.length]);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const poolFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(16, poolLayout.diameter * 0.5),
        fontWeight: '700',
      }),
    [poolLayout.diameter, fontFamily],
  );

  return (
    <View style={styles.container}>
      <UnderseaThemeBackground />
      <DecorativeKoiLayer zIndex={DECORATIVE_KOI_Z} />
      <View style={styles.englishWordLayer} pointerEvents="box-none">
        <TransformationWordBubbles
          letters={game.englishLetters}
          interactive={false}
          onLetterPress={() => {}}
          playInflate={sounds.playBubbleInflate}
          playPop={sounds.playBubblePop}
        />
      </View>
      <View style={styles.spanishWordLayer} pointerEvents="box-none">
        <TransformationWordBubbles
          letters={game.spanishLetters}
          interactive={false}
          onLetterPress={() => {}}
          playInflate={sounds.playBubbleInflate}
          playPop={sounds.playBubblePop}
        />
      </View>
      <View style={styles.poolLayer} pointerEvents="box-none">
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {game.poolLetters.map((letter, index) => {
            if (letter.used || letter.popped) return null;
            const centerX = poolLayout.centers[index] ?? 0;
            return (
              <LetterBubble
                key={letter.id}
                char={letter.char}
                centerX={centerX}
                centerY={poolLayout.rowY}
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
            const cx = poolLayout.centers[index] ?? 0;
            return (
              <Pressable
                key={letter.id}
                onPress={() => game.handleLetterTap(letter.id)}
                style={[
                  styles.hit,
                  {
                    left: cx - poolLayout.diameter * 0.5,
                    top: poolLayout.rowY - poolLayout.diameter * 0.5,
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
              centerX={game.activeFlight.landed ? game.activeFlight.toCenterX : game.activeFlight.fromCenterX}
              centerY={game.activeFlight.landed ? game.activeFlight.toCenterY : game.activeFlight.fromCenterY}
              diameter={game.activeFlight.landed ? game.activeFlight.toDiameter : game.activeFlight.fromDiameter}
              initialCenterX={game.activeFlight.landed ? game.activeFlight.toCenterX : game.activeFlight.fromCenterX}
              initialCenterY={game.activeFlight.landed ? game.activeFlight.toCenterY : game.activeFlight.fromCenterY}
              initialDiameter={game.activeFlight.landed ? game.activeFlight.toDiameter : game.activeFlight.fromDiameter}
              skipEnter
              moveDurationMs={game.activeFlight.landed ? 0 : game.activeFlight.flyDurationMs}
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
