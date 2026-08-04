import { Group, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { AtlasRegion } from '../core/assets/textureAtlas/packTextureAtlas';
import { AtlasSprite } from './AtlasSprite';
import type { CloudPatchSlot } from './orbCloudTypes';

export function CloudPatch({
  index,
  pool,
  atlas,
  regions,
}: {
  index: number;
  pool: SharedValue<CloudPatchSlot[]>;
  atlas: SkImage | null;
  regions: ReadonlyArray<AtlasRegion>;
}) {
  const draw = useDerivedValue(() => {
    const slot = pool.value[index];
    if (slot == null || !slot.active) {
      return null;
    }
    const region =
      regions.length > 0 ? regions[Math.min(slot.imageIndex, regions.length - 1)] : null;
    const aspect = region != null && region.height > 0 ? region.width / region.height : 1;
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
  }, [pool, index, regions]);

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

  const region = useDerivedValue(() => {
    const slot = pool.value[index];
    if (slot == null || !slot.active || regions.length === 0) {
      return null;
    }
    return regions[Math.min(slot.imageIndex, regions.length - 1)] ?? null;
  }, [pool, index, regions]);

  return (
    <Group transform={transform} opacity={opacity}>
      <AtlasSprite atlas={atlas} region={region} width={width} height={height} />
    </Group>
  );
}
