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
    // Calibrate field power for smoother blending
    letterField += exp(-normalized * normalized * 2.0);
  }

  // At progress 0, we want the edge (normalized=1.0) at exp(-2.0) ≈ 0.1353
  // At progress 1, letterField at the edge is letterCount * 0.1353
  float fieldAtEdge = 0.1353;
  float threshold = mix(fieldAtEdge, max(letterCount, 1.0) * fieldAtEdge, mergeProgress);
  
  // Keep edges relatively sharp but allow a bit of goo as they merge
  float softness = mix(0.04, 0.12, mergeProgress);
  float mask = smoothstep(threshold - softness, threshold + softness, letterField);
  
  float2 safeBounds = vec2(max(boundsW, 1.0), max(boundsH, 1.0));
  float2 normalizedCoord = clamp((fragCoord - vec2(boundsX, boundsY)) / safeBounds, 0.0, 1.0);
  float2 sampleCoord = vec2(boundsX, boundsY) + normalizedCoord * safeBounds;
  half4 bubbleColor = bubbleTexture.eval(sampleCoord);
  bubbleColor.rgb *= mask;
  bubbleColor.a *= mask;
  return bubbleColor;
}
`;
