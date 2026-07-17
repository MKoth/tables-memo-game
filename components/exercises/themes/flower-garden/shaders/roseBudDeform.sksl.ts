export const ROSE_BUD_SKSL = `
uniform shader texture;
uniform float roseX;
uniform float roseY;
uniform float roseW;
uniform float roseH;

half4 main(float2 xy) {
  float2 size = float2(roseW, roseH);
  float2 uv = (xy - float2(roseX, roseY)) / size;
  return texture.eval(xy);
}
`;
