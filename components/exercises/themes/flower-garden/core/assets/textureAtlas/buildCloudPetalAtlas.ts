import { FilterMode, MipmapMode, Skia, type SkImage } from '@shopify/react-native-skia';
import { packTextureAtlas, type AtlasRegion } from './packTextureAtlas';

export type CloudPetalAtlas = {
  image: SkImage;
  cloudRegions: AtlasRegion[];
  petalRegions: AtlasRegion[];
};

export function buildCloudPetalAtlas(
  cloudImages: readonly SkImage[],
  petalImages: readonly SkImage[],
): CloudPetalAtlas | null {
  const sources = [...cloudImages, ...petalImages];
  if (sources.length === 0) {
    return null;
  }

  const layout = packTextureAtlas(
    sources.map(image => ({ width: image.width(), height: image.height() })),
  );

  const surface = Skia.Surface.MakeOffscreen(layout.atlasWidth, layout.atlasHeight);
  if (surface == null) {
    if (__DEV__) {
      console.warn(
        `[buildCloudPetalAtlas] Failed to create offscreen surface ${layout.atlasWidth}x${layout.atlasHeight}`,
      );
    }
    return null;
  }

  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  for (let i = 0; i < sources.length; i++) {
    const image = sources[i]!;
    const region = layout.regions[i]!;
    const src = Skia.XYWHRect(0, 0, image.width(), image.height());
    const dest = Skia.XYWHRect(region.x, region.y, region.width, region.height);
    canvas.drawImageRectOptions(image, src, dest, FilterMode.Linear, MipmapMode.None, paint);
  }

  return {
    image: surface.makeImageSnapshot(),
    cloudRegions: layout.regions.slice(0, cloudImages.length),
    petalRegions: layout.regions.slice(cloudImages.length),
  };
}
