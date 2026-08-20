import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

const MAX_UNIFORM_DROPS = 32;

export const DROP_SHEET_SKSL = `
uniform float2 iResolution;
uniform float uActiveCount;
uniform float4 uDropData[${MAX_UNIFORM_DROPS}];
uniform float uDropOpacity[${MAX_UNIFORM_DROPS}];
uniform float2 uTextureSize;
uniform shader dropTexture;

half4 main(float2 fragCoord) {
  half4 color = half4(0);
  for (int i = 0; i < ${MAX_UNIFORM_DROPS}; i++) {
    if (float(i) >= uActiveCount) break;
    float4 d = uDropData[i];
    if (d.z <= 0.0 || d.w <= 0.0) continue;
    float2 local = fragCoord - d.xy;
    if (local.x < 0.0 || local.x > d.z || local.y < 0.0 || local.y > d.w) continue;

    float2 uv = local / d.zw;
    float2 c = uv - 0.5;
    if (dot(c, c) > 0.25) continue;

    float2 sampleCoord = uv * uTextureSize;
    half4 tex = dropTexture.eval(sampleCoord);
    float a = tex.a * uDropOpacity[i];
    if (a < 0.004) continue;

    half4 src = half4(tex.rgb * a, a);
    color = src + color * (1.0 - src.a);
  }
  return color;
}
`;

function compileDropSheetEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(DROP_SHEET_SKSL);
  if (!effect) {
    throw new Error('Failed to compile drop sheet shader');
  }
  return effect;
}

export const dropSheetEffect = compileDropSheetEffect();
