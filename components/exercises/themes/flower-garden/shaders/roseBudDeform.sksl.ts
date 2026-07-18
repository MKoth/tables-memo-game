export const ROSE_BUD_SKSL = `
uniform float roseX;
uniform float roseY;
uniform float roseW;
uniform float roseH;
uniform float petalsCount;
uniform float ringRadius;
uniform float ringBorder;
uniform float petalWidth;
uniform shader budTexture;
uniform shader petalTexture1;
uniform shader petalTexture2;
uniform shader petalTexture3;
uniform shader petalTexture4;
uniform shader petalTexture5;
uniform shader petalTexture6;

half4 samplePetal(int variant, float2 coord) {
  if (variant == 0)      { return petalTexture1.eval(coord); }
  else if (variant == 1) { return petalTexture2.eval(coord); }
  else if (variant == 2) { return petalTexture3.eval(coord); }
  else if (variant == 3) { return petalTexture4.eval(coord); }
  else if (variant == 4) { return petalTexture5.eval(coord); }
  else                   { return petalTexture6.eval(coord); }
}

half4 main(float2 fragCoord) {
  half4 color = budTexture.eval(fragCoord);

  float2 center = float2(roseX, roseY) + float2(roseW, roseH) * 0.5;
  float halfSize = min(roseW, roseH) * 0.5;
  if (halfSize < 1.0) return color;

  float2 delta = fragCoord - center;
  float r = length(delta) / halfSize;

  float ringInner = ringRadius - ringBorder;
  float ringOuter = ringRadius + ringBorder;
  if (r < ringInner || r > ringOuter) return color;

  float theta = atan(delta.y, delta.x);

  int count = int(petalsCount);
  float slotAngle = 6.2831853 / float(count);
  float halfSpan  = petalWidth * 3.14159265;

  int petalIndex = int(floor(theta / slotAngle + 0.5));
  if (petalIndex < 0)        { petalIndex += count; }
  if (petalIndex >= count)   { petalIndex -= count; }

  int variant = petalIndex;
  if (variant >= 6) { variant -= 6; }

  float petalCenterAngle = float(petalIndex) * slotAngle;
  float angularDist = theta - petalCenterAngle;
  if (angularDist >  3.14159265) angularDist -= 6.2831853;
  if (angularDist < -3.14159265) angularDist += 6.2831853;

  if (abs(angularDist) > halfSpan) return color;

  float u = 0.5 + angularDist / (2.0 * halfSpan);
  float v = 1.0 - (r - ringInner) / (2.0 * ringBorder);

  float2 texCoord = float2(roseX + u * roseW, roseY + v * roseH);
  half4 petalColor = samplePetal(variant, texCoord);

  if (petalColor.a < 0.01) return color;

  return petalColor * petalColor.a + color * (1.0 - petalColor.a);
}
`;

export const roseBudUniformDefaults = {
  petalsCount: 9,
  ringRadius: 0.44,
  ringBorder: 0.14,
  petalWidth: 0.2,
} as const;
