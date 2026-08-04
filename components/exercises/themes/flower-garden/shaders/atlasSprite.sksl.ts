import { FilterMode, MipmapMode } from '@shopify/react-native-skia';

export const ATLAS_SPRITE_SKSL = `
uniform shader atlas;
uniform float4 region;
uniform float2 destSize;
uniform float padding;

half4 main(float2 xy) {
  float scale = min(destSize.x / region.z, destSize.y / region.w);
  if (scale <= 0.0) {
    return half4(0.0);
  }
  float2 fitted = region.zw * scale;
  float2 offset = (destSize - fitted) * 0.5;
  float2 px = region.xy + (xy - offset) / scale;
  float2 pxMin = region.xy - float2(padding);
  float2 pxMax = region.xy + region.zw + float2(padding);
  return atlas.eval(clamp(px, pxMin, pxMax));
}
`;

export const ATLAS_SPRITE_SAMPLING = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.None,
} as const;
