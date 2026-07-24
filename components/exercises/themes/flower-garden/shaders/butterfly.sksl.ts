import {
  ROAMER_BUTTERFLY_BODY_LENGTH,
  ROAMER_BUTTERFLY_BODY_THICKNESS,
  ROAMER_BUTTERFLY_BODY_SCALE,
  ROAMER_BUTTERFLY_WING_STRETCH_GAIN,
  ROAMER_BUTTERFLY_WING_THIN_GAIN,
  ROAMER_BUTTERFLY_WING_LENGTH,
  ROAMER_BUTTERFLY_WING_WIDTH,
} from '../roamer/butterfly/config/butterflySettings';

export const BUTTERFLY_SKSL = `
uniform float bodyW;
uniform float bodyH;
uniform float bodyCenterX;
uniform float bodyCenterY;
uniform float bodyAngle;
uniform float bodyScale;
uniform float bodyImageW;
uniform float bodyImageH;
uniform float wingLeftFlap;
uniform float wingRightFlap;
uniform float wingLeftImageW;
uniform float wingLeftImageH;
uniform float wingRightImageW;
uniform float wingRightImageH;
uniform float legVisibility;
uniform float renderMode;
uniform float3 bodyTint;
uniform float bodyTintStrength;
uniform shader bodyTexture;
uniform shader leftWingTexture;
uniform shader rightWingTexture;

const float WING_STRETCH_GAIN = ${ROAMER_BUTTERFLY_WING_STRETCH_GAIN};
const float WING_THIN_GAIN = ${ROAMER_BUTTERFLY_WING_THIN_GAIN};
const float WING_LENGTH = ${ROAMER_BUTTERFLY_WING_LENGTH};
const float WING_WIDTH = ${ROAMER_BUTTERFLY_WING_WIDTH};

const float LEG_REGION_COUNT = 6.0;

half4 sampleBody(vec2 localPos, float halfW, float halfH) {
  vec2 bodyUV = vec2(
    localPos.x / (halfW * 2.0) + 0.5,
    localPos.y / (halfH * 2.0) + 0.5
  );
  vec2 texCoord = bodyUV * vec2(bodyImageW, bodyImageH);
  return bodyTexture.eval(texCoord);
}

half4 sampleLeftWing(vec2 localPos, float halfW, float halfH, float flap) {
  float bodyEdge = halfW;
  float effLen = WING_LENGTH * (1.0 + flap * WING_STRETCH_GAIN);
  float effW = WING_WIDTH * (1.0 - flap * WING_THIN_GAIN);

  float leftEdge = -(bodyEdge + effLen);
  float rightEdge = -bodyEdge;
  float topEdge = -effW * halfH;
  float bottomEdge = effW * halfH;

  if (localPos.x < leftEdge || localPos.x > rightEdge ||
      localPos.y < topEdge || localPos.y > bottomEdge) {
    return half4(0.0);
  }

  float u = (localPos.x - leftEdge) / (rightEdge - leftEdge);
  float v = (localPos.y - topEdge) / (bottomEdge - topEdge);
  vec2 texCoord = vec2(u * wingLeftImageW, v * wingLeftImageH);
  return leftWingTexture.eval(texCoord);
}

half4 sampleRightWing(vec2 localPos, float halfW, float halfH, float flap) {
  float bodyEdge = halfW;
  float effLen = WING_LENGTH * (1.0 + flap * WING_STRETCH_GAIN);
  float effW = WING_WIDTH * (1.0 - flap * WING_THIN_GAIN);

  float leftEdge = bodyEdge;
  float rightEdge = bodyEdge + effLen;
  float topEdge = -effW * halfH;
  float bottomEdge = effW * halfH;

  if (localPos.x < leftEdge || localPos.x > rightEdge ||
      localPos.y < topEdge || localPos.y > bottomEdge) {
    return half4(0.0);
  }

  float u = (localPos.x - leftEdge) / (rightEdge - leftEdge);
  float v = (localPos.y - topEdge) / (bottomEdge - topEdge);
  vec2 texCoord = vec2(u * wingRightImageW, v * wingRightImageH);
  return rightWingTexture.eval(texCoord);
}

half4 main(float2 fragCoord) {
  vec2 rel = fragCoord - vec2(bodyCenterX, bodyCenterY);
  float ca = cos(-bodyAngle);
  float sa = sin(-bodyAngle);
  vec2 local = vec2(ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y);

  float halfW = bodyW * bodyScale * 0.5;
  float halfH = bodyH * bodyScale * 0.5;

  half4 color = half4(0.0);

  if (renderMode > 1.5) {
    return color;
  }

  half4 leftWingColor = sampleLeftWing(local, halfW, halfH, wingLeftFlap);
  if (leftWingColor.a > 0.01) {
    color = leftWingColor;
  }

  half4 rightWingColor = sampleRightWing(local, halfW, halfH, wingRightFlap);
  if (rightWingColor.a > 0.01) {
    float a = rightWingColor.a;
    color = rightWingColor * a + color * (1.0 - a);
  }

  if (abs(local.x) < halfW && abs(local.y) < halfH) {
    half4 bodyColor = sampleBody(local, halfW, halfH);
    if (bodyColor.a > 0.01) {
      float a = bodyColor.a;
      color = bodyColor * a + color * (1.0 - a);
    }
  }

  if (color.a < 0.01) {
    return half4(0.0);
  }

  float luma = dot(color.rgb, half3(0.299, 0.587, 0.114));
  half3 tinted = half3(bodyTint) * luma;
  color.rgb = mix(color.rgb, tinted, half(bodyTintStrength * color.a));

  return color;
}
`;

export const butterflyUniformDefaults = {
  bodyW: ROAMER_BUTTERFLY_BODY_LENGTH,
  bodyH: ROAMER_BUTTERFLY_BODY_THICKNESS,
  bodyCenterX: 0,
  bodyCenterY: 0,
  bodyAngle: 0,
  bodyScale: ROAMER_BUTTERFLY_BODY_SCALE,
  bodyImageW: 1,
  bodyImageH: 1,
  wingLeftFlap: 0,
  wingRightFlap: 0,
  wingLeftImageW: 1,
  wingLeftImageH: 1,
  wingRightImageW: 1,
  wingRightImageH: 1,
  legVisibility: 0,
  renderMode: 0,
  bodyTint: [1, 1, 1] as const,
  bodyTintStrength: 0,
} as const;
