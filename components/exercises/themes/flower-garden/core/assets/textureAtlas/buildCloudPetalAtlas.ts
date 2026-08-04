import type { SkImage } from '@shopify/react-native-skia';
import type { AtlasRegion } from './packTextureAtlas';
import { CLOUD_REGIONS, PETAL_REGIONS } from './cloudPetalAtlasRegions';

export type CloudPetalAtlas = {
  cloudImage: SkImage;
  petalImage: SkImage;
  cloudRegions: AtlasRegion[];
  petalRegions: AtlasRegion[];
};

export function createCloudPetalAtlas(
  cloudAtlasImage: SkImage,
  petalAtlasImage: SkImage,
): CloudPetalAtlas {
  return {
    cloudImage: cloudAtlasImage,
    petalImage: petalAtlasImage,
    cloudRegions: [...CLOUD_REGIONS],
    petalRegions: [...PETAL_REGIONS],
  };
}
