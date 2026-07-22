export const GRASS_SHADOW_SKSL = `
uniform shader child;
uniform float shadowOpacity;
uniform float blurRadius;

half4 main(float2 fragCoord) {
  float step = blurRadius;
  float2 dx = float2(step, 0.0);
  float2 dy = float2(0.0, step);

  float accum =
      child.eval(fragCoord - dx - dy).a * 1.0 +
      child.eval(fragCoord      - dy).a * 2.0 +
      child.eval(fragCoord + dx - dy).a * 1.0 +
      child.eval(fragCoord - dx     ).a * 2.0 +
      child.eval(fragCoord         ).a * 4.0 +
      child.eval(fragCoord + dx     ).a * 2.0 +
      child.eval(fragCoord - dx + dy).a * 1.0 +
      child.eval(fragCoord      + dy).a * 2.0 +
      child.eval(fragCoord + dx + dy).a * 1.0;

  float alpha = accum / 16.0 * shadowOpacity;
  if (alpha < 0.004) {
    return half4(0.0);
  }
  return half4(0.0, 0.0, 0.0, alpha);
}
`;
