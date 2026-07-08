import { MERGE_SHADER_MAX_LETTERS } from '../sentenceTransformation/merge/mergeLayout';

/**
 * Gooey metaball shader used during sentence transformation resolution.
 * Each letter center contributes an inverse-distance field that blends into
 * one unified blob while sampling the existing bubble texture.
 */
export const METABALL_MERGE_SKSL = `
uniform float mergeProgress;
uniform float boundsX;
uniform float boundsY;
uniform float boundsW;
uniform float boundsH;
uniform float letterCount;
uniform float3 letterCenters[${MERGE_SHADER_MAX_LETTERS}];
uniform shader bubbleTexture;

half4 main(float2 fragCoord) {
  float letterField = 0.0;
  float letterCountSafe = max(letterCount, 0.0);
  int letters = ${MERGE_SHADER_MAX_LETTERS};
  int clampedLetterCount = int(letterCountSafe);
  if (clampedLetterCount < letters) {
    letters = clampedLetterCount;
  }

  for (int i = 0; i < ${MERGE_SHADER_MAX_LETTERS}; i++) {
    if (i >= letters) {
      break;
    }
    vec2 center = letterCenters[i].xy;
    float radius = max(letterCenters[i].z, 4.0);
    float distanceToCenter = distance(fragCoord, center);
    float normalized = distanceToCenter / radius;
    letterField += exp(-normalized * normalized * 5.0);
  }

  float mergeGain = mix(0.08, 1.4, mergeProgress);
  float threshold = mix(1.4, 0.35, mergeProgress);
  float softness = mix(0.35, 0.06, mergeProgress);
  float exposure = smoothstep(0.05, 0.25, mergeProgress);
  float mask = smoothstep(threshold - softness, threshold + softness, letterField * mergeGain);
  mask *= exposure;

  float2 safeBounds = vec2(max(boundsW, 1.0), max(boundsH, 1.0));
  float2 normalizedCoord = clamp(
    (fragCoord - vec2(boundsX, boundsY)) / safeBounds,
    0.0,
    1.0,
  );
  float2 sampleCoord = vec2(boundsX, boundsY) + normalizedCoord * safeBounds;
  half4 bubbleColor = bubbleTexture.eval(sampleCoord);
  bubbleColor.rgb *= mask;
  bubbleColor.a *= mask;
  return bubbleColor;
}
`;
