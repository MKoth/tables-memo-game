import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

export const DROP_DEFORM_SKSL = `
uniform float dropX;
uniform float dropY;
uniform float dropW;
uniform float dropH;
uniform float iTime;
uniform float dropOpacity;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform float wobbleLobes;
uniform float phase;
uniform shader dropTexture;

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord - vec2(dropX, dropY)) / vec2(dropW, dropH);
  vec2 c = uv - 0.5;
  float r = length(c);

  if (r > 0.5) {
    return half4(0.0);
  }

  float theta = atan(c.y, c.x);
  float rSrc = r;
  float thetaSrc = theta;

  float w1 = sin(theta * wobbleLobes + iTime * wobbleSpeed + phase);
  float w2 = sin(theta * (wobbleLobes + 1.0) - iTime * wobbleSpeed * 0.7 + phase * 1.7);
  float wobble = wobbleAmp * (w1 + 0.5 * w2) * smoothstep(0.0, 0.5, r);
  rSrc *= 1.0 + wobble;
  thetaSrc += wobbleAmp * 0.5 * sin(theta * wobbleLobes + iTime * wobbleSpeed * 0.9 + phase);

  vec2 srcUV = 0.5 + vec2(cos(thetaSrc), sin(thetaSrc)) * rSrc;

  if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
    return half4(0.0);
  }

  vec2 sampleCoord = vec2(dropX, dropY) + srcUV * vec2(dropW, dropH);
  half4 color = dropTexture.eval(sampleCoord);

  float alpha = color.a * dropOpacity;
  if (alpha < 0.004) {
    return half4(0.0);
  }

  return half4(color.rgb * alpha, alpha);
}
`;

function compileDropDeformEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(DROP_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile drop deform shader');
  }
  return effect;
}

export const dropDeformEffect = compileDropDeformEffect();

export const dropDeformDefaults = {
  wobbleAmp: 0.06,
  wobbleSpeed: 3.4,
  wobbleLobes: 1,
  phase: 0,
} as const;
