import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { MAX_PARTICLES } from './particleConfig';

export const PARTICLE_DUST_SKSL = `
uniform float2 iResolution;
uniform float uActiveCount;
uniform float4 uParticleData[${MAX_PARTICLES}];
uniform float4 uParticleColor[${MAX_PARTICLES}];

half4 main(float2 fragCoord) {
  half4 color = half4(0);
  for (int i = 0; i < ${MAX_PARTICLES}; i++) {
    if (float(i) >= uActiveCount) break;
    float4 d = uParticleData[i];
    float2 delta = fragCoord - d.xy;
    float r = d.w;
    if (abs(delta.x) > r || abs(delta.y) > r) continue;
    float dist = length(delta) / r;
    float strength = exp(-dist * dist * 2.0) * d.z;
    float4 pc = uParticleColor[i];
    color += half4(pc.rgb * strength, strength);
  }
  return color;
}
`;

function compileParticleDustEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(PARTICLE_DUST_SKSL);
  if (!effect) {
    throw new Error('Failed to compile particle dust shader');
  }
  return effect;
}

export const particleDustEffect = compileParticleDustEffect();
