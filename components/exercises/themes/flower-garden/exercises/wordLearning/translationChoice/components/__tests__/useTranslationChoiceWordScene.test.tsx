jest.mock('react-native-reanimated', () => {
  const sharedValues = new Map<unknown, { value: unknown }>();
  return {
    useSharedValue: (initial: unknown) => {
      const existing = sharedValues.get(initial);
      if (existing != null) {
        return existing;
      }
      const created = { value: initial };
      sharedValues.set(initial, created);
      return created;
    },
  };
});

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { LetterOrbModel } from '../../../../../../../wordTransformation/domain/coreTypes';
import type { WordTransformationSceneState } from '../../../../../../../wordTransformation/scene/sceneStateTypes';
import { useTranslationChoiceWordScene } from '../useTranslationChoiceWordScene';

const ZONE = { x: 0, y: 0, w: 430, h: 466 };

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

type ProbeProps = {
  english: LetterOrbModel[];
  spanish: LetterOrbModel[];
  sceneHolder: { current: { value: WordTransformationSceneState } | null };
};

function Probe({ english, spanish, sceneHolder }: ProbeProps) {
  const sceneStateSv = useTranslationChoiceWordScene({
    englishLetters: english,
    spanishLetters: spanish,
    zoneRect: ZONE,
  });
  sceneHolder.current = sceneStateSv;
  return null;
}

function renderProbe(english: LetterOrbModel[], spanish: LetterOrbModel[]) {
  const sceneHolder: ProbeProps['sceneHolder'] = { current: null };
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <Probe english={english} spanish={spanish} sceneHolder={sceneHolder} />,
    );
  });
  return { sceneHolder, renderer: renderer! };
}

describe('useTranslationChoiceWordScene', () => {
  it('normalizes skipEnter to a boolean', () => {
    const { sceneHolder } = renderProbe(makeLetters('gato', 'enter'), []);
    const letters = sceneHolder.current!.value.letters;
    expect(letters).toHaveLength(4);
    for (const letter of letters) {
      expect(letter.skipEnter).toBe(false);
    }
  });

  it('does not rewrite the scene for identical letters (no double enter)', () => {
    const first = makeLetters('gato', 'enter');
    const { sceneHolder, renderer } = renderProbe(first, []);
    const firstScene = sceneHolder.current!.value;

    const sameContent = makeLetters('gato', 'enter');
    ReactTestRenderer.act(() => {
      renderer.update(<Probe english={sameContent} spanish={[]} sceneHolder={sceneHolder} />);
    });

    expect(sceneHolder.current!.value).toBe(firstScene);
  });

  it('rewrites the scene when the word changes', () => {
    const { sceneHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    const firstScene = sceneHolder.current!.value;

    ReactTestRenderer.act(() => {
      renderer.update(
        <Probe english={makeLetters('perro', 'enter')} spanish={[]} sceneHolder={sceneHolder} />,
      );
    });

    const nextScene = sceneHolder.current!.value;
    expect(nextScene).not.toBe(firstScene);
    expect(nextScene.letters.map(letter => letter.char).join('')).toBe('perro');
  });

  it('rewrites the scene when the cascade phase flips to exit', () => {
    const { sceneHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    const firstScene = sceneHolder.current!.value;

    ReactTestRenderer.act(() => {
      renderer.update(
        <Probe english={makeLetters('gato', 'exit')} spanish={[]} sceneHolder={sceneHolder} />,
      );
    });

    const nextScene = sceneHolder.current!.value;
    expect(nextScene).not.toBe(firstScene);
    for (const letter of nextScene.letters) {
      expect(letter.popped).toBe(true);
    }
  });

  it('switches from english to spanish letters', () => {
    const { sceneHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    const firstScene = sceneHolder.current!.value;

    ReactTestRenderer.act(() => {
      renderer.update(
        <Probe
          english={[]}
          spanish={makeLetters('perro', 'enter', 1)}
          sceneHolder={sceneHolder}
        />,
      );
    });

    const nextScene = sceneHolder.current!.value;
    expect(nextScene).not.toBe(firstScene);
    expect(nextScene.letters.map(letter => letter.char).join('')).toBe('perro');
  });

  it('clears the scene when all letters are gone', () => {
    const { sceneHolder, renderer } = renderProbe(makeLetters('gato', 'enter'), []);
    expect(sceneHolder.current!.value.letters.length).toBe(4);

    ReactTestRenderer.act(() => {
      renderer.update(<Probe english={[]} spanish={[]} sceneHolder={sceneHolder} />);
    });

    expect(sceneHolder.current!.value.letters).toHaveLength(0);
    expect(sceneHolder.current!.value.wordOrbsVisible).toBe(false);
  });
});
