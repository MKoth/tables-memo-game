import {
  ROAMER_BUTTERFLY_BODY_LENGTH,
  ROAMER_BUTTERFLY_BODY_THICKNESS,
  ROAMER_BUTTERFLY_BODY_SCALE,
  ROAMER_BUTTERFLY_WING_STRETCH_GAIN,
  ROAMER_BUTTERFLY_WING_LENGTH_RATIO,
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
uniform float wingLeftAspect;
uniform float wingRightAspect;
uniform float legVisibility;
uniform float legPhasesAdvanced[6];
uniform float renderMode;
uniform float3 bodyTint;
uniform float bodyTintStrength;
uniform shader bodyTexture;
uniform shader leftWingTexture;
uniform shader rightWingTexture;

const float WING_STRETCH_GAIN = ${ROAMER_BUTTERFLY_WING_STRETCH_GAIN};
const float WING_LENGTH_RATIO = ${ROAMER_BUTTERFLY_WING_LENGTH_RATIO};
const float WING_LENGTH_SCALE = 0.25;
const float WING_HEIGHT_RATIO = 1.2;
const float WING_OVERLAP = 21.0;

const float LEG_BEND_AMOUNT = 1.0;
const int LEG_COUNT = 6;

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
  float contract = 1.0 - abs(flap) * WING_STRETCH_GAIN;
  float effLen = halfW * WING_LENGTH_RATIO * WING_LENGTH_SCALE * contract;
  float effHalfH = halfH * WING_HEIGHT_RATIO;

  float leftEdge = -(bodyEdge + effLen);
  float rightEdge = -bodyEdge + WING_OVERLAP * bodyScale;
  float rectWidth = rightEdge - leftEdge;

  if (localPos.x < leftEdge || localPos.x > rightEdge) {
    return half4(0.0);
  }

  float u = (localPos.x - leftEdge) / rectWidth;
  float v = localPos.y / (effHalfH * 2.0) + 0.5;

  if (v < 0.0 || v > 1.0) {
    return half4(0.0);
  }

  vec2 texCoord = vec2(u * wingLeftImageW, v * wingLeftImageH);
  return leftWingTexture.eval(texCoord);
}

half4 sampleRightWing(vec2 localPos, float halfW, float halfH, float flap) {
  float bodyEdge = halfW;
  float contract = 1.0 - abs(flap) * WING_STRETCH_GAIN;
  float effLen = halfW * WING_LENGTH_RATIO * WING_LENGTH_SCALE * contract;
  float effHalfH = halfH * WING_HEIGHT_RATIO;

  float leftEdge = bodyEdge - WING_OVERLAP * bodyScale;
  float tipX = bodyEdge + effLen;
  float rectWidth = tipX - leftEdge;

  if (localPos.x < leftEdge || localPos.x > tipX) {
    return half4(0.0);
  }

  float u = (localPos.x - leftEdge) / rectWidth;
  float v = localPos.y / (effHalfH * 2.0) + 0.5;

  if (v < 0.0 || v > 1.0) {
    return half4(0.0);
  }

  vec2 texCoord = vec2(u * wingRightImageW, v * wingRightImageH);
  return rightWingTexture.eval(texCoord);
}

void setLegRects(inout vec4 lrs[LEG_COUNT]) {
  lrs[0] = vec4(0.274, 0.297, 0.140, 0.150);
  lrs[1] = vec4(0.574, 0.297, 0.154, 0.150);
  lrs[2] = vec4(0.224, 0.477, 0.170, 0.127);
  lrs[3] = vec4(0.594, 0.457, 0.180, 0.137);
  lrs[4] = vec4(0.281, 0.580, 0.142, 0.203);
  lrs[5] = vec4(0.561, 0.580, 0.142, 0.203);
}

bool isInsideAnyLeg(vec2 uv, vec4 lrs[LEG_COUNT]) {
  for (int i = 0; i < LEG_COUNT; i++) {
    vec4 lr = lrs[i];
    if (uv.x >= lr.x && uv.x <= lr.x + lr.z && uv.y >= lr.y && uv.y <= lr.y + lr.w) {
      return true;
    }
  }
  return false;
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

  vec4 legRects[LEG_COUNT];
  setLegRects(legRects);
  bool sittingPass = renderMode > 0.5 && renderMode < 1.5;

  if (abs(local.x) < halfW && abs(local.y) < halfH) {
    vec2 bodyUV = vec2(
      local.x / (halfW * 2.0) + 0.5,
      local.y / (halfH * 2.0) + 0.5
    );
    if (!isInsideAnyLeg(bodyUV, legRects)) {
      half4 bodyColor = sampleBody(local, halfW, halfH);
      if (bodyColor.a > 0.01) {
        color = bodyColor;
      }
    }
  }

  if (sittingPass && legVisibility > 0.001) {
    vec2 bodyUV = vec2(
      local.x / (halfW * 2.0) + 0.5,
      local.y / (halfH * 2.0) + 0.5
    );
    for (int i = 0; i < LEG_COUNT; i++) {
      vec4 lr = legRects[i];
      float attachU;
      float legMinU;
      float legMaxU;
      if (i == 0 || i == 2 || i == 4) {
        attachU = lr.x + lr.z;
        legMinU = attachU - lr.z * legVisibility;
        legMaxU = attachU;
      } else {
        attachU = lr.x;
        legMinU = attachU;
        legMaxU = attachU + lr.z * legVisibility;
      }
      float vMin = lr.y;
      float vMax = lr.y + lr.w;
      if (bodyUV.y >= vMin && bodyUV.y <= vMax && bodyUV.x >= legMinU && bodyUV.x <= legMaxU) {
        float weight;
        if (i == 0 || i == 2 || i == 4) {
          weight = (lr.x + lr.z - bodyUV.x) / lr.z;
        } else {
          weight = (bodyUV.x - lr.x) / lr.z;
        }
        float bend = clamp(weight, 0.0, 1.0) * legPhasesAdvanced[i] * LEG_BEND_AMOUNT * lr.w;
        float displacedV = clamp(bodyUV.y + bend, vMin, vMax);
        vec2 texCoord = vec2(bodyUV.x, displacedV) * vec2(bodyImageW, bodyImageH);
        half4 legColor = bodyTexture.eval(texCoord);
        if (legColor.a > 0.01) {
          float a = legColor.a;
          color = legColor * a + color * (1.0 - a);
        }
      }
    }
  }

  half4 leftWingColor = sampleLeftWing(local, halfW, halfH, wingLeftFlap);
  if (leftWingColor.a > 0.01) {
    float a = leftWingColor.a;
    color = leftWingColor * a + color * (1.0 - a);
  }

  half4 rightWingColor = sampleRightWing(local, halfW, halfH, wingRightFlap);
  if (rightWingColor.a > 0.01) {
    float a = rightWingColor.a;
    color = rightWingColor * a + color * (1.0 - a);
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
  wingLeftAspect: 1,
  wingRightAspect: 1,
  legVisibility: 0,
  renderMode: 0,
  bodyTint: [1, 1, 1] as const,
  bodyTintStrength: 0,
} as const;
