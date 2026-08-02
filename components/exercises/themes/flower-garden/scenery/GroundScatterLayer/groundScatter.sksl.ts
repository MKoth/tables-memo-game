export const GROUND_SCATTER_COVERING_SIZE = 200;

export const GROUND_SCATTER_SKSL = `
uniform float2 center;
uniform float2 size;
uniform float rotation;
uniform float variant;
uniform float opacity;
uniform float brightness;
uniform float3 tintA;
uniform float tintStrength;
uniform float shadowOffsetX;
uniform float shadowOffsetY;
uniform float shadowScale;
uniform float shadowOpacity;
uniform float3 shadowColor;
uniform shader texture0;
uniform shader texture1;
uniform shader texture2;
uniform shader texture3;
uniform shader texture4;
uniform shader texture5;

const float COVERING = ${GROUND_SCATTER_COVERING_SIZE}.0;

half4 sampleSprite(int v, float2 coord) {
  if (v == 0)      { return texture0.eval(coord); }
  else if (v == 1) { return texture1.eval(coord); }
  else if (v == 2) { return texture2.eval(coord); }
  else if (v == 3) { return texture3.eval(coord); }
  else if (v == 4) { return texture4.eval(coord); }
  else             { return texture5.eval(coord); }
}

half4 main(float2 fragCoord) {
  half4 shadow = half4(0.0);
  if (shadowOpacity > 0.001) {
    float2 sDelta = fragCoord - center - float2(shadowOffsetX, shadowOffsetY);
    float sc = cos(rotation);
    float ss = sin(rotation);
    float2 sRotated = float2(sc * sDelta.x - ss * sDelta.y, ss * sDelta.x + sc * sDelta.y);
    float2 sUV = sRotated / (size * shadowScale) + 0.5;
    if (sUV.x >= 0.0 && sUV.x <= 1.0 && sUV.y >= 0.0 && sUV.y <= 1.0) {
      half4 shadowSample = sampleSprite(int(variant), sUV * COVERING);
      half shadowA = shadowSample.a * shadowOpacity;
      shadow = half4(half3(shadowColor) * shadowA, shadowA);
    }
  }

  float2 delta = fragCoord - center;
  float c = cos(rotation);
  float s = sin(rotation);
  float2 rotated = float2(c * delta.x - s * delta.y, s * delta.x + c * delta.y);
  float2 uv = rotated / size + 0.5;
  half4 sprite = half4(0.0);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    half4 color = sampleSprite(int(variant), uv * COVERING);
    if (color.a >= 0.01) {
      color.rgb *= brightness;
      half lum = max(max(color.r, color.g), color.b);
      color.rgb = mix(color.rgb, half3(tintA) * lum, half(tintStrength));
      color.a *= opacity;
      sprite = color;
    }
  }

  return sprite * sprite.a + shadow * (1.0 - sprite.a);
}
`;
