import {
  ORB_RING_BURST_SCALE,
  ORB_RING_ENTER_SCALE,
} from './orbAnimPresets';

/**
 * One shader draws the whole simplified orb from two pre-rendered sprites:
 * the petal ring (all petals baked into one image, sampled rotated around
 * the orb center) and the clover bed (sampled unrotated below the ring).
 *
 * The only per-orb parameters are the ring and bed diameters and the ring
 * rotation speed. On enter the ring fades in at a bigger radius and shrinks
 * down to its target while the bed just fades in; on burst the ring grows
 * while fading out and the bed just fades out.
 *
 * Skia runtime-effect child shaders evaluate in the child's LOCAL space, so
 * the ImageShader children use pixel coordinates and the sampler maps
 * normalized [-0.5, 0.5] sprite space back to pixel coordinates with the
 * per-variant image size uniforms.
 */
export const ORB_FLOWER_SKSL = `
uniform float centerX;
uniform float centerY;
uniform float ringDiameter;
uniform float bedDiameter;
uniform float ringSizePx;
uniform float bedSizePx;
uniform float rotationSpeed;
uniform float rotationTimeSec;
uniform float enterT;
uniform float burstT;
uniform float overallOpacity;
uniform float tintR;
uniform float tintG;
uniform float tintB;
uniform float tintStrength;
uniform shader ringImage;
uniform shader bedImage;

float4 drawBed(float2 v) {
  float2 p = v / max(bedDiameter, 0.0001) + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
    return float4(0.0);
  }
  half4 c = bedImage.eval(p * bedSizePx);
  float a = c.a * overallOpacity;
  if (a <= 0.002) { return float4(0.0); }
  return float4(c.rgb, 1.0) * a;
}

float4 drawRing(float2 v, float scale, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float2 rv = float2(v.x * c - v.y * s, v.x * s + v.y * c);
  float2 p = rv / max(ringDiameter * scale, 0.0001) + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
    return float4(0.0);
  }
  half4 c2 = ringImage.eval(p * ringSizePx);
  float a = c2.a * overallOpacity;
  if (a <= 0.002) { return float4(0.0); }
  float3 rgb = mix(float3(c2.rgb), float3(tintR, tintG, tintB), tintStrength);
  return float4(rgb, 1.0) * a;
}

half4 main(float2 frag) {
  float2 v = frag - float2(centerX, centerY);
  float ringScale = burstT > 0.0
    ? mix(1.0, ${ORB_RING_BURST_SCALE}, burstT)
    : mix(${ORB_RING_ENTER_SCALE}, 1.0, enterT);
  float angle = rotationSpeed * rotationTimeSec;
  float4 bed = drawBed(v);
  float4 ring = drawRing(v, ringScale, angle);
  return half4(ring + bed * (1.0 - ring.a));
}
`;
