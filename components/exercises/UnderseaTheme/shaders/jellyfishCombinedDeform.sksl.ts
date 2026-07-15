/**
 * Combined bell + tentacle jellyfish shader — one draw pass per instance.
 * Composites tentacle (larger, behind) then bell (smaller, centered, in front).
 *
 * SkSL does not allow `shader` as a function parameter, so the per-layer body
 * is emitted twice via TypeScript string templating.
 */

function layerEvalBlock(
  outVar: string,
  layerX: string,
  layerY: string,
  layerW: string,
  layerH: string,
  swirlAmp: string,
  densityGamma: string,
  contractShrink: string,
  rimWidth: string,
  rimStrength: string,
  wobbleAmp: string,
  opacity: string,
  tiltCenterShift: string,
  tiltBodyShift: string,
  tiltLen: string,
  tiltEgg: string,
  layerTintMode: string,
  layerTintStrength: string,
  layerTintA: string,
  layerTintB: string,
  layerTintC: string,
  layerTintAnimated: string,
  layerTintWaveSpeed: string,
  textureSampler: string,
): string {
  // The tentacle layer passes densityGamma '1.0', which makes the gamma remap an
  // identity (pow(x, 1.0)). Emit the remap only when it actually changes pixels.
  const densityRemap =
    densityGamma === '1.0'
      ? ''
      : `
      float g = mix(1.0, ${densityGamma}, contract);
      rSrc = pow(rSrc / 0.5, g) * 0.5;`;

  return `
  half4 ${outVar} = half4(0.0);
  {
    vec2 uv = (fragCoord - vec2(${layerX}, ${layerY})) / vec2(${layerW}, ${layerH});

    vec2 tiltDir  = vec2(tiltDirX, tiltDirY);
    vec2 tiltPerp = vec2(-tiltDirY, tiltDirX);

    vec2 c = uv - 0.5;

    float axisSigned = dot(c, tiltDir);
    float backness   = smoothstep(0.0, 0.5, max(0.0, -axisSigned));
    float perpComp   = dot(c, tiltPerp) / (1.0 + ${tiltEgg} * backness);
    c = tiltDir * axisSigned + tiltPerp * perpComp;

    float centerHold = 1.0 - smoothstep(0.32, 0.5, length(c));
    c -= ${tiltCenterShift} * tiltDir * centerHold;

    float r = length(c);

    if (r <= 0.5) {
      float theta = atan(c.y, c.x);

      float TWO_PI = 6.2831853;
      float p = fract((iTime * pulseSpeed + phase) / TWO_PI);
      float contract = p < pushDur
        ? smoothstep(0.0, 1.0, p / pushDur)
        : 1.0 - smoothstep(0.0, 1.0, (p - pushDur) / (1.0 - pushDur));

      float k = mix(-relaxAmp, contractAmp, contract);

      float swirl = ${swirlAmp} * sin(r * swirlFreq - iTime * swirlSpeed + phase);
      float thetaSrc = theta + swirl;

      float rSrc = pivotR + (r - pivotR) * (1.0 + k);
      rSrc *= 1.0 + ${contractShrink} * contract;
      rSrc /= mix(scaleRelax, scaleContract, contract);
      rSrc = max(rSrc, 0.0);
${densityRemap}
      float w1 = sin(theta * wobbleLobes + iTime * wobbleSpeed + phase);
      float w2 = sin(theta * (wobbleLobes + 1.0) - iTime * wobbleSpeed * 0.7 + phase * 1.7);
      float wobble = ${wobbleAmp} * (w1 + 0.5 * w2) * smoothstep(0.0, 0.5, r);
      rSrc *= 1.0 + wobble;
      thetaSrc += ${wobbleAmp} * 0.5 * sin(theta * wobbleLobes + iTime * wobbleSpeed * 0.9 + phase);

      float lenAlign = (r > 0.0001) ? dot(c, tiltDir) / r : 0.0;
      rSrc *= 1.0 + ${tiltLen} * lenAlign * smoothstep(0.0, 0.5, r);

      vec2 srcUV = 0.5 + vec2(cos(thetaSrc), sin(thetaSrc)) * rSrc;
      srcUV -= ${tiltBodyShift} * tiltDir;

      if (srcUV.x >= 0.0 && srcUV.x <= 1.0 && srcUV.y >= 0.0 && srcUV.y <= 1.0) {
        vec2 sampleCoord = vec2(${layerX}, ${layerY}) + srcUV * vec2(${layerW}, ${layerH});
        half4 color = ${textureSampler}.eval(sampleCoord);

        float radialT = smoothstep(0.0, 0.5, r);
        const float TINT_WAVE_SOFT = 0.18;

        half3 tint = half3(${layerTintA});
        if (${layerTintAnimated} >= 0.5 && ${layerTintMode} >= 2.0) {
          float tp = fract(iTime * ${layerTintWaveSpeed} + phase);
          float seg = floor(tp * 3.0);
          float localP = fract(tp * 3.0);

          half3 incoming;
          half3 midCol;
          half3 outerCol;
          if (seg < 0.5) {
            incoming = half3(${layerTintB});
            midCol = half3(${layerTintC});
            outerCol = half3(${layerTintA});
          } else if (seg < 1.5) {
            incoming = half3(${layerTintC});
            midCol = half3(${layerTintA});
            outerCol = half3(${layerTintB});
          } else {
            incoming = half3(${layerTintA});
            midCol = half3(${layerTintB});
            outerCol = half3(${layerTintC});
          }

          float b1 = smoothstep(localP - TINT_WAVE_SOFT, localP + TINT_WAVE_SOFT, radialT);
          float midFront = min(localP + (1.0 - TINT_WAVE_SOFT), 1.0);
          float b2 = smoothstep(midFront - TINT_WAVE_SOFT, midFront + TINT_WAVE_SOFT, radialT);
          tint = mix(incoming, midCol, half(b1));
          tint = mix(tint, outerCol, half(b2));
        } else if (${layerTintAnimated} >= 0.5 && ${layerTintMode} >= 1.0) {
          float tp = fract(iTime * ${layerTintWaveSpeed} + phase);
          float localP = tp < 0.5 ? tp * 2.0 : (tp - 0.5) * 2.0;
          half3 centerColor = tp < 0.5 ? half3(${layerTintB}) : half3(${layerTintA});
          half3 edgeColor = tp < 0.5 ? half3(${layerTintA}) : half3(${layerTintB});
          float t = smoothstep(localP - TINT_WAVE_SOFT, localP + TINT_WAVE_SOFT, radialT);
          tint = mix(centerColor, edgeColor, half(t));
        } else if (${layerTintMode} >= 1.0) {
          half3 dualTint = mix(half3(${layerTintA}), half3(${layerTintB}), half(radialT));
          tint = dualTint;
          if (${layerTintMode} >= 2.0) {
            tint = radialT < 0.5
              ? mix(half3(${layerTintA}), half3(${layerTintB}), half(radialT * 2.0))
              : mix(half3(${layerTintB}), half3(${layerTintC}), half((radialT - 0.5) * 2.0));
          }
        }
        color.rgb *= mix(half3(1.0), tint, half(${layerTintStrength}));

        float rim = smoothstep(0.5 - ${rimWidth}, 0.5, r);
        float rimAlpha = 1.0 - rim * ${rimStrength} * (1.0 - contract);
        ${outVar} = color * (${opacity} * rimAlpha);
      }
    }
  }`;
}

export const JELLYFISH_COMBINED_DEFORM_SKSL = `
uniform float tentacleX;
uniform float tentacleY;
uniform float tentacleW;
uniform float tentacleH;
uniform float bellX;
uniform float bellY;
uniform float bellW;
uniform float bellH;
uniform float iTime;
uniform float phase;
uniform float pulseSpeed;
uniform float pivotR;
uniform float relaxAmp;
uniform float contractAmp;
uniform float pushDur;
uniform float swirlFreq;
uniform float swirlSpeed;
uniform float scaleRelax;
uniform float scaleContract;
uniform float wobbleSpeed;
uniform float wobbleLobes;
uniform float tiltDirX;
uniform float tiltDirY;
uniform float tentacleSwirlAmp;
uniform float tentacleContractShrink;
uniform float tentacleWobbleAmp;
uniform float tentacleOpacity;
uniform float tentacleTiltBodyShift;
uniform float tentacleTiltLen;
uniform float bellDensityGamma;
uniform float bellRimWidth;
uniform float bellRimStrength;
uniform float bellWobbleAmp;
uniform float bellOpacity;
uniform float bellTiltCenterShift;
uniform float bellTiltEgg;
uniform float tintMode;
uniform float tintStrength;
uniform float3 tintA;
uniform float3 tintB;
uniform float3 tintC;
uniform float tintAnimated;
uniform float tintWaveSpeed;
uniform shader tentacleTexture;
uniform shader bellTexture;

half4 main(float2 fragCoord) {
${layerEvalBlock(
  'tentacle',
  'tentacleX', 'tentacleY', 'tentacleW', 'tentacleH',
  'tentacleSwirlAmp',
  '1.0',
  'tentacleContractShrink',
  '0.0',
  '0.0',
  'tentacleWobbleAmp',
  'tentacleOpacity',
  '0.0',
  'tentacleTiltBodyShift',
  'tentacleTiltLen',
  '0.0',
  '0.0',
  '0.0',
  'float3(1.0)',
  'float3(1.0)',
  'float3(1.0)',
  '0.0',
  '0.0',
  'tentacleTexture',
)}
${layerEvalBlock(
  'bell',
  'bellX', 'bellY', 'bellW', 'bellH',
  '0.0',
  'bellDensityGamma',
  '0.0',
  'bellRimWidth',
  'bellRimStrength',
  'bellWobbleAmp',
  'bellOpacity',
  'bellTiltCenterShift',
  '0.0',
  '0.0',
  'bellTiltEgg',
  'tintMode',
  'tintStrength',
  'tintA',
  'tintB',
  'tintC',
  'tintAnimated',
  'tintWaveSpeed',
  'bellTexture',
)}
  return bell + tentacle * (1.0 - bell.a);
}
`;
