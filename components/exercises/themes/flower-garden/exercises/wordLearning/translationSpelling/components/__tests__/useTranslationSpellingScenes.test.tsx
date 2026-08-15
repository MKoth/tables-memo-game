jest.mock('react-native-reanimated', () => {
  const { useRef } = require('react');
  return {
    useSharedValue: (initial: unknown) => {
      const ref = useRef(null);
      if (ref.current == null) {
        ref.current = { value: initial };
      }
      return ref.current;
    },
  };
});

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { LetterOrbModel } from '../../../../../../../wordTransformation/domain/coreTypes';
import type {
  WordTransformationSceneLetter,
  WordTransformationSceneState,
} from '../../../../../../../wordTransformation/scene/sceneStateTypes';
import type { LetterFlightState, PoolLetterState } from '../../../../../../../wordLearning/translationSpelling/hooks/useTranslationSpellingGame';
import {
  useTranslationSpellingScenes,
  type TranslationSpellingScenes,
} from '../useTranslationSpellingScenes';

const WORD_RECT = { x: 0, y: 0, w: 430, h: 233 };
const ORB_RECT = { x: 0, y: 233, w: 430, h: 233 };

function makeLetters(
  word: string,
  phase: 'enter' | 'exit',
  roundPos = 0,
): LetterOrbModel[] {
  return word.split('').map((char, position) => ({
    key: `word-${roundPos}:${position}`,
    char,
    position,
    popped: phase === 'exit',
    wrong: false,
    skipEnter: undefined,
    popDelayMs: phase === 'exit' ? position * 90 : undefined,
    enterDelayMs: phase === 'enter' ? position * 90 : undefined,
  }));
}

function makeSpanishLetters(word: string, filledCount: number, roundPos = 0): LetterOrbModel[] {
  return word.split('').map((char, position) => ({
    key: `spanish-${roundPos}:${position}`,
    char,
    position,
    popped: false,
    wrong: false,
    skipEnter: position >= filledCount,
  }));
}

function makePoolLetters(word: string): PoolLetterState[] {
  return word.split('').map((char, i) => ({
    id: `pool-0-${i}`,
    char,
    used: false,
    wrong: false,
    popping: false,
    popped: false,
  }));
}

type ProbeProps = {
  english: LetterOrbModel[];
  spanish: LetterOrbModel[];
  pool: PoolLetterState[];
  flight: LetterFlightState | null;
  scenesHolder: { current: TranslationSpellingScenes | null };
};

function Probe({ english, spanish, pool, flight, scenesHolder }: ProbeProps) {
  const scenes = useTranslationSpellingScenes({
    englishLetters: english,
    spanishLetters: spanish,
    poolLetters: pool,
    activeFlight: flight,
    wordRect: WORD_RECT,
    orbRect: ORB_RECT,
  });
  scenesHolder.current = scenes;
  return null;
}

function renderProbe(
  english: LetterOrbModel[],
  spanish: LetterOrbModel[],
  pool: PoolLetterState[] = [],
  flight: LetterFlightState | null = null,
) {
  const scenesHolder: ProbeProps['scenesHolder'] = { current: null };
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <Probe
        english={english}
        spanish={spanish}
        pool={pool}
        flight={flight}
        scenesHolder={scenesHolder}
      />,
    );
  });
  return { scenesHolder, renderer: renderer! };
}

function updateProbe(
  renderer: ReactTestRenderer.ReactTestRenderer,
  scenesHolder: ProbeProps['scenesHolder'],
  patch: Partial<ProbeProps>,
) {
  ReactTestRenderer.act(() => {
    renderer.update(
      <Probe
        english={patch.english ?? []}
        spanish={patch.spanish ?? []}
        pool={patch.pool ?? []}
        flight={patch.flight ?? null}
        scenesHolder={scenesHolder}
      />,
    );
  });
}

function letterAt(scene: WordTransformationSceneState, position: number): WordTransformationSceneLetter | undefined {
  return scene.letters.find(letter => letter.position === position);
}

describe('useTranslationSpellingScenes', () => {
  it('maps english letters into a non-interactive scene', () => {
    const { scenesHolder } = renderProbe(makeLetters('gato', 'enter'), []);
    const scene = scenesHolder.current!.english.value;
    expect(scene.lettersInteractive).toBe(false);
    expect(scene.wordOrbsVisible).toBe(true);
    expect(scene.letters).toHaveLength(4);
    expect(scene.letters.map(letter => letter.char).join('')).toBe('gato');
    for (const letter of scene.letters) {
      expect(letter.skipEnter).toBe(false);
      expect(letter.centerX).toBeGreaterThan(0);
      expect(letter.centerX).toBeLessThan(WORD_RECT.w);
      expect(letter.centerY).toBe(WORD_RECT.y + WORD_RECT.h * 0.4);
      expect(letter.diameter).toBeGreaterThan(0);
    }
  });

  it('keeps the spanish scene empty until letters are filled', () => {
    const { scenesHolder } = renderProbe(
      makeLetters('gato', 'enter'),
      makeSpanishLetters('gato', 0),
    );
    const scene = scenesHolder.current!.spanish.value;
    expect(scene.letters).toHaveLength(0);
  });

  it('adds spanish letters to the scene as they fill', () => {
    const { scenesHolder, renderer } = renderProbe(
      makeLetters('gato', 'enter'),
      makeSpanishLetters('gato', 1),
    );
    let scene = scenesHolder.current!.spanish.value;
    expect(scene.letters).toHaveLength(1);
    expect(scene.letters[0]!.position).toBe(0);
    expect(scene.letters[0]!.char).toBe('g');
    expect(scene.letters[0]!.skipEnter).toBe(false);

    updateProbe(renderer, scenesHolder, {
      english: makeLetters('gato', 'enter'),
      spanish: makeSpanishLetters('gato', 2),
    });

    scene = scenesHolder.current!.spanish.value;
    expect(scene.letters).toHaveLength(2);
    expect(scene.letters.map(letter => letter.char).join('')).toBe('ga');
  });

  it('does not rewrite the english scene for identical letters', () => {
    const { scenesHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    const firstScene = scenesHolder.current!.english.value;

    updateProbe(renderer, scenesHolder, {
      english: makeLetters('gato', 'enter'),
    });

    expect(scenesHolder.current!.english.value).toBe(firstScene);
  });

  it('rewrites the english scene when the cascade flips to exit', () => {
    const { scenesHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    const firstScene = scenesHolder.current!.english.value;

    updateProbe(renderer, scenesHolder, {
      english: makeLetters('gato', 'exit'),
    });

    const nextScene = scenesHolder.current!.english.value;
    expect(nextScene).not.toBe(firstScene);
    for (const letter of nextScene.letters) {
      expect(letter.popped).toBe(true);
      expect(letter.popDelayMs).not.toBeNull();
    }
  });

  it('maps the pool into an interactive scene with enter cascade delays', () => {
    const pool = makePoolLetters('gato');
    pool.forEach((letter, index) => {
      letter.enterDelayMs = index * 300;
    });
    const { scenesHolder } = renderProbe([], [], pool);
    const scene = scenesHolder.current!.pool.value;
    expect(scene.lettersInteractive).toBe(true);
    expect(scene.wordOrbsVisible).toBe(true);
    expect(scene.letters).toHaveLength(4);
    for (const letter of scene.letters) {
      expect(letter.popped).toBe(false);
      expect(letter.wrong).toBe(false);
      expect(letter.centerX).toBeGreaterThan(0);
      expect(letter.centerY).toBeGreaterThan(ORB_RECT.y);
      expect(letter.diameter).toBeGreaterThan(0);
    }
    expect(scene.letters[0]!.enterDelayMs).toBe(0);
    expect(scene.letters[3]!.enterDelayMs).toBe(900);
  });

  it('hides pool letters that are used (no burst)', () => {
    const { scenesHolder, renderer } = renderProbe([], [], makePoolLetters('gato'));
    const pool = makePoolLetters('gato');
    pool[1]!.used = true;
    updateProbe(renderer, scenesHolder, {
      pool,
    });

    const scene = scenesHolder.current!.pool.value;
    const letter = letterAt(scene, 1)!;
    expect(letter.hidden).toBe(true);
    expect(letter.popped).toBe(false);
    expect(letter.popDelayMs).toBeNull();
    expect(letterAt(scene, 0)!.hidden).toBe(false);
  });

  it('flags wrong pool letters for tint feedback', () => {
    const { scenesHolder, renderer } = renderProbe([], [], makePoolLetters('gato'));
    const pool = makePoolLetters('gato');
    pool[2]!.wrong = true;
    updateProbe(renderer, scenesHolder, {
      pool,
    });

    const scene = scenesHolder.current!.pool.value;
    expect(letterAt(scene, 2)!.wrong).toBe(true);
  });

  it('maps the active flight into the pool scene insert animation', () => {
    const flight: LetterFlightState = {
      id: 'pool-0-2',
      char: 't',
      fromCenterX: 100,
      fromCenterY: 300,
      fromDiameter: 50,
      toCenterX: 200,
      toCenterY: 100,
      toDiameter: 40,
      flyDurationMs: 480,
      landed: false,
    };
    const { scenesHolder, renderer } = renderProbe([], [], makePoolLetters('gato'));
    expect(scenesHolder.current!.pool.value.insertAnimation).toBeNull();

    updateProbe(renderer, scenesHolder, {
      pool: makePoolLetters('gato'),
      flight,
    });

    const animation = scenesHolder.current!.pool.value.insertAnimation;
    expect(animation).not.toBeNull();
    expect(animation!.phase).toBe('fly');
    expect(animation!.char).toBe('t');
    expect(animation!.fromCenterX).toBe(100);
    expect(animation!.fromCenterY).toBe(300);
    expect(animation!.toCenterX).toBe(200);
    expect(animation!.toCenterY).toBe(100);
    expect(animation!.flyDurationMs).toBe(480);

    updateProbe(renderer, scenesHolder, {
      pool: makePoolLetters('gato'),
      flight: null,
    });

    expect(scenesHolder.current!.pool.value.insertAnimation).toBeNull();
  });

  it('clears all scenes when the letters are gone', () => {
    const { scenesHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    expect(scenesHolder.current!.english.value.letters).toHaveLength(4);

    updateProbe(renderer, scenesHolder, {
      english: [],
    });

    const scene = scenesHolder.current!.english.value;
    expect(scene.letters).toHaveLength(0);
    expect(scene.wordOrbsVisible).toBe(false);
  });
});
