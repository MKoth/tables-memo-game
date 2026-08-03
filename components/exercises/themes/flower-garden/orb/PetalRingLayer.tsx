import React from 'react';
import { ColorMatrix, Group, Image, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { ORB_PETAL_BASE_SIZE_PX } from './orbAnimPresets';
import type { OrbAnimState } from './orbAnimTypes';

type PetalProps = {
  spawnIndex: number;
  sizeFactor: number;
  image: SkImage | null;
  anim: SharedValue<OrbAnimState>;
};

function Petal({ spawnIndex, sizeFactor, image, anim }: PetalProps) {
  const transform = useDerivedValue(() => {
    const petal = anim.value.petals[spawnIndex];
    if (petal == null) {
      return [{ translateX: 0 }, { translateY: 0 }];
    }
    const size = ORB_PETAL_BASE_SIZE_PX * sizeFactor;
    const halfW = (size * petal.scaleX) * 0.5;
    const halfH = size * 0.5;
    return [
      { translateX: petal.x },
      { translateY: petal.y },
      { rotate: petal.angle + Math.PI * 0.5 },
      { translateX: -halfW },
      { translateY: -halfH },
      { scaleX: petal.scaleX },
    ];
  });

  const opacity = useDerivedValue(() => {
    const petal = anim.value.petals[spawnIndex];
    return petal == null ? 0 : petal.opacity;
  });

  // Blend each channel toward the wrong-tint color by the petal's tint strength
  // (identity matrix when the strength is zero).
  const tintMatrix = useDerivedValue(() => {
    const petal = anim.value.petals[spawnIndex];
    const s = petal?.tintStrength ?? 0;
    const { tintR, tintG, tintB } = anim.value;
    return [
      1 - s, 0, 0, 0, tintR * s,
      0, 1 - s, 0, 0, tintG * s,
      0, 0, 1 - s, 0, tintB * s,
      0, 0, 0, 1, 0,
    ];
  });

  if (image == null) {
    return null;
  }

  const size = ORB_PETAL_BASE_SIZE_PX * sizeFactor;

  return (
    <Group transform={transform} opacity={opacity}>
      <ColorMatrix matrix={tintMatrix} />
      <Image
        image={image}
        x={0}
        y={0}
        width={size}
        height={size}
        fit="contain"
      />
    </Group>
  );
}

export type PetalSlot = {
  spawnIndex: number;
  imageIndex: number;
};

export type PetalRingLayerProps = {
  sizeFactor: number;
  slots: ReadonlyArray<PetalSlot>;
  anim: SharedValue<OrbAnimState>;
  images: ReadonlyArray<SkImage>;
};

export function PetalRingLayer({ sizeFactor, slots, anim, images }: PetalRingLayerProps) {
  if (images.length === 0) {
    return null;
  }
  return (
    <Group>
      {slots.map(slot => {
        const image = images[Math.min(slot.imageIndex, images.length - 1)] ?? null;
        return (
          <Petal
            key={slot.spawnIndex}
            spawnIndex={slot.spawnIndex}
            sizeFactor={sizeFactor}
            image={image}
            anim={anim}
          />
        );
      })}
    </Group>
  );
}
