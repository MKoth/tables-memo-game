import { Group, Image, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { CloudPatchSlot } from './orbCloudTypes';

export function CloudPatch({
  index,
  pool,
  images,
  aspects,
}: {
  index: number;
  pool: SharedValue<CloudPatchSlot[]>;
  images: ReadonlyArray<SkImage>;
  aspects: ReadonlyArray<number>;
}) {
  const draw = useDerivedValue(() => {
    const slot = pool.value[index];
    if (slot == null || !slot.active) {
      return null;
    }
    const aspect = aspects[slot.imageIndex] ?? 1;
    const width = slot.size;
    const height = width / aspect;
    return {
      x: slot.x,
      y: slot.y,
      halfW: width * 0.5,
      halfH: height * 0.5,
      width,
      height,
      rotation: slot.rotation,
      opacity: slot.opacity,
      imageIndex: slot.imageIndex,
    };
  }, [pool, index, aspects, images]);

  const transform = useDerivedValue(() => {
    const d = draw.value;
    if (d == null) {
      return [{ translateX: 0 }, { translateY: 0 }];
    }
    return [
      { translateX: d.x },
      { translateY: d.y },
      { rotate: d.rotation },
      { translateX: -d.halfW },
      { translateY: -d.halfH },
    ];
  }, [draw]);

  const opacity = useDerivedValue(() => draw.value?.opacity ?? 0, [draw]);
  const width = useDerivedValue(() => draw.value?.width ?? 0, [draw]);
  const height = useDerivedValue(() => draw.value?.height ?? 0, [draw]);
  const image = useDerivedValue(() => {
    const d = draw.value;
    if (d == null || images.length === 0) {
      return images[0] ?? null;
    }
    return images[Math.min(d.imageIndex, images.length - 1)] ?? images[0] ?? null;
  }, [draw, images]);

  return (
    <Group transform={transform} opacity={opacity}>
      <Image
        image={image}
        x={0}
        y={0}
        width={width}
        height={height}
        fit="contain"
      />
    </Group>
  );
}
