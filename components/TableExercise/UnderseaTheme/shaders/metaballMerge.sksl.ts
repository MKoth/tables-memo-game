import { MERGE_SHADER_MAX_LETTERS } from '../sentenceTransformation/merge/mergeLayout';

/**
 * Gooey metaball shader used during sentence transformation resolution.
 * Each letter center contributes an inverse-distance field that blends into
 * one unified blob while sampling the existing bubble texture.
 */
export const METABALL_MERGE_SKSL = `
uniform float mergeProgress;
uniform float baseOpacity;
uniform float bgCutoff;
uniform float centerClear;
uniform float rimClear;
uniform float3 tintA;
uniform float tintStrength;
uniform float iTime;
uniform float phase;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform float wobbleLobes;
uniform float boundsX;
uniform float boundsY;
uniform float boundsW;
uniform float boundsH;
uniform float letterCount;
uniform float3 letterCenters[${MERGE_SHADER_MAX_LETTERS}];
uniform shader bubbleTexture;

half4 main(float2 fragCoord) {
  float letterCountSafe = max(letterCount, 0.0);
  int letters = ${MERGE_SHADER_MAX_LETTERS};
  int clampedLetterCount = int(letterCountSafe);
  if (clampedLetterCount < letters) {
    letters = clampedLetterCount;
  }

  float letterField = 0.0;
  half4 colorAccum = half4(0.0);
  float weightAccum = 0.0;
  float rAccum = 0.0;

  for (int i = 0; i < ${MERGE_SHADER_MAX_LETTERS}; i++) {
    if (i >= letters) {
      break;
    }
    vec2 center = letterCenters[i].xy;
    float radius = max(letterCenters[i].z, 4.0);
    float distanceToCenter = distance(fragCoord, center);
    float normalized = distanceToCenter / radius;
    float contribution = exp(-normalized * normalized * 2.0);
    letterField += contribution;

    // Local polar coordinates around this letter's center for wobble deformation.
    vec2 localUV = (fragCoord - center) / radius;
    float rLocal = length(localUV);
    float theta = atan(localUV.y, localUV.x);

    // Convert to the same 0..0.5 radial range used by bubbleDeform so
    // the wobble amplitude and falloff match visually.
    float rUnit = rLocal * 0.5;

    // Per-letter wobble (match bubbleDeform behavior).
    float w1 = sin(theta * wobbleLobes + iTime * wobbleSpeed + phase);
    float w2 = sin(theta * (wobbleLobes + 1.0) - iTime * wobbleSpeed * 0.7 + phase * 1.7);
    float wobble = wobbleAmp * (w1 + 0.5 * w2) * smoothstep(0.0, 0.5, rUnit);
    float rSrc = rUnit * (1.0 + wobble);
    float thetaSrc = theta + wobbleAmp * 0.5 * sin(theta * wobbleLobes + iTime * wobbleSpeed * 0.9 + phase);
    vec2 srcUV = 0.5 + vec2(cos(thetaSrc), sin(thetaSrc)) * rSrc;
    vec2 clampedUV = clamp(srcUV, 0.0, 1.0);
    vec2 texCoord = vec2(boundsX, boundsY) + clampedUV * vec2(boundsW, boundsH);
    half4 sampleColor = bubbleTexture.eval(texCoord);

    // Key out the PNG's solid black backdrop.
    float lum = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
    float bgMask = smoothstep(bgCutoff, bgCutoff + 0.14, lum);

    // Apply tint similar to bubbleDeform and modulate alpha by base opacity and background mask.
    half3 tint = half3(tintA);
    sampleColor.rgb = mix(sampleColor.rgb, tint, half(tintStrength * bgMask));
    sampleColor.a = sampleColor.a * bgMask * baseOpacity;

    // Accumulate radial average (use rUnit to match bubbleDeform's 0..0.5 mapping).
    rAccum += rUnit * contribution;

    colorAccum += sampleColor * contribution;
    weightAccum += contribution;
  }

  // Default: fully transparent. Only pixels touched by a blob's field
  // accumulate any color/weight at all.
  half4 bubbleColor = weightAccum > 0.0 ? colorAccum / weightAccum : half4(0.0);
  // Compute average radial position across contributing letters (0..~0.5).
  float rAvg = weightAccum > 0.0 ? rAccum / weightAccum : 0.0;

  float fieldAtEdge = 0.1353;
  float threshold = mix(fieldAtEdge, fieldAtEdge * 0.35, mergeProgress);
  float softness = mix(0.06, 0.18, mergeProgress); // wider = softer fade
  float lowerEdge = max(threshold - softness, 0.0);

  // mask == 0.0 at background (guaranteed transparent),
  // rises smoothly to 1.0 only near/inside blobs.
  float mask = smoothstep(lowerEdge, threshold + softness, letterField);

  // Apply center/rim fades similar to bubbleDeform using the radial average,
  // then mask the result. Finally, return a premultiplied RGBA like bubbleDeform.
  // Increase the central transparent radius slightly so the merged bubble
  // has a larger see-through core (matches single-bubble look).
  float cFadeFinal = mix(centerClear, 1.0, smoothstep(0.0, 0.60, rAvg));
  // Move the rim fade outward to accommodate the larger clear center.
  float rFadeFinal = mix(1.0, rimClear, smoothstep(0.50, 0.70, rAvg));
  bubbleColor.a *= cFadeFinal * rFadeFinal * mask;
  // Premultiply RGB by the final alpha so visuals match bubbleDeform's output.
  bubbleColor.rgb *= bubbleColor.a;
  return bubbleColor;
}
`;
