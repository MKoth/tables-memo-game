import {
  BUMBLEBEE_BODY_LENGTH,
  BUMBLEBEE_BODY_THICKNESS,
  BUMBLEBEE_BODY_SCALE,
  BUMBLEBEE_WING_LENGTH,
  BUMBLEBEE_WING_THICKNESS,
} from '../roamer/bumblebee/config/bumblebeeSettings';

export const BUMBLEBEE_SKSL = `
uniform float bodyW;
uniform float bodyH;
uniform float bodyCenterX;
uniform float bodyCenterY;
uniform float bodyAngle;
uniform float bodyScale;
uniform float bodyImageW;
uniform float bodyImageH;
uniform float wingLeftAngle;
uniform float wingRightAngle;
uniform float wingLength;
uniform float wingThickness;
uniform float wingTransparency;
uniform float wingOverlap;
uniform float wingPivotY;
uniform float wingLeftImageW;
uniform float wingLeftImageH;
uniform float wingRightImageW;
uniform float wingRightImageH;
uniform float legVisibility;
uniform float legPhasesAdvanced[6];
uniform float renderMode;
uniform float3 bodyTint;
uniform float bodyTintStrength;
uniform float shadowOffsetX;
uniform float shadowOffsetY;
uniform float shadowSize;
uniform float shadowOpacity;
uniform shader bodyTexture;
uniform shader leftWingTexture;
uniform shader rightWingTexture;

const float LEG_BEND_AMOUNT = 0.7;
const int LEG_COUNT = 6;

half4 sampleBody(vec2 localPos, float halfW, float halfH) {
  vec2 bodyUV = vec2(
    localPos.x / (halfW * 2.0) + 0.5,
    localPos.y / (halfH * 2.0) + 0.5
  );
  vec2 texCoord = bodyUV * vec2(bodyImageW, bodyImageH);
  return bodyTexture.eval(texCoord);
}

half4 sampleLeftWing(vec2 localPos, float halfW, float halfH, float angle) {
  vec2 attach = vec2(-halfW + wingOverlap * bodyScale, wingPivotY * bodyScale);
  vec2 dir = vec2(-cos(angle), -sin(angle));
  vec2 perp = vec2(-sin(angle), cos(angle));

  vec2 rel = localPos - attach;
  float along = dot(rel, dir);
  float across = dot(rel, perp);
  if (along < 0.0 || along > wingLength || across < -wingThickness || across > 0.0) {
    return half4(0.0);
  }

  float u = 1.0 - (along / wingLength);
  float v = across / wingThickness + 1.0;

  vec2 texCoord = vec2(u * wingLeftImageW, v * wingLeftImageH);
  half4 color = leftWingTexture.eval(texCoord);
  color.a *= wingTransparency;
  return color;
}

half4 sampleRightWing(vec2 localPos, float halfW, float halfH, float angle) {
  vec2 attach = vec2(halfW - wingOverlap * bodyScale, wingPivotY * bodyScale);
  vec2 dir = vec2(cos(angle), -sin(angle));
  vec2 perp = vec2(sin(angle), cos(angle));

  vec2 rel = localPos - attach;
  float along = dot(rel, dir);
  float across = dot(rel, perp);
  if (along < 0.0 || along > wingLength || across < -wingThickness || across > 0.0) {
    return half4(0.0);
  }

  float u = along / wingLength;
  float v = across / wingThickness + 1.0;

  vec2 texCoord = vec2(u * wingRightImageW, v * wingRightImageH);
  half4 color = rightWingTexture.eval(texCoord);
  color.a *= wingTransparency;
  return color;
}

void setLegRects(inout vec4 lrs[LEG_COUNT]) {
  lrs[0] = vec4(0.125, 0.086, 0.205, 0.185);
  lrs[1] = vec4(0.663, 0.079, 0.195, 0.190);
  lrs[2] = vec4(0.000, 0.339, 0.280, 0.145);
  lrs[3] = vec4(0.720, 0.345, 0.280, 0.130);
  lrs[4] = vec4(0.014, 0.513, 0.265, 0.480);
  lrs[5] = vec4(0.717, 0.502, 0.220, 0.500);
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

  vec2 shadowRel = fragCoord - vec2(bodyCenterX + shadowOffsetX, bodyCenterY + shadowOffsetY);
  vec2 shadowLocal = vec2(ca * shadowRel.x - sa * shadowRel.y, sa * shadowRel.x + ca * shadowRel.y);
  float shadowScale = 1.0 / max(shadowSize, 0.001);
  vec2 scaledShadowLocal = shadowLocal * shadowScale;

  half4 shadowComposite = half4(0.0);

  vec2 shadowUV = vec2(
    scaledShadowLocal.x / (halfW * 2.0) + 0.5,
    scaledShadowLocal.y / (halfH * 2.0) + 0.5
  );
  if (!isInsideAnyLeg(shadowUV, legRects)) {
    half4 bodyShadow = sampleBody(scaledShadowLocal, halfW, halfH);
    if (bodyShadow.a > 0.01) {
      float a = bodyShadow.a;
      shadowComposite = bodyShadow * a + shadowComposite * (1.0 - a);
    }
  }

  half4 leftWingShadow = sampleLeftWing(scaledShadowLocal, halfW, halfH, wingLeftAngle);
  if (leftWingShadow.a > 0.01) {
    float a = leftWingShadow.a;
    shadowComposite = leftWingShadow * a + shadowComposite * (1.0 - a);
  }

  half4 rightWingShadow = sampleRightWing(scaledShadowLocal, halfW, halfH, wingRightAngle);
  if (rightWingShadow.a > 0.01) {
    float a = rightWingShadow.a;
    shadowComposite = rightWingShadow * a + shadowComposite * (1.0 - a);
  }

  if (shadowComposite.a > 0.01) {
    half4 s = half4(0.0, 0.0, 0.0, shadowComposite.a * shadowOpacity);
    color = s + color * (1.0 - s.a);
  }

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

  half4 leftWingColor = sampleLeftWing(local, halfW, halfH, wingLeftAngle);
  if (leftWingColor.a > 0.01) {
    float a = leftWingColor.a;
    color = leftWingColor * a + color * (1.0 - a);
  }

  half4 rightWingColor = sampleRightWing(local, halfW, halfH, wingRightAngle);
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

export const bumblebeeUniformDefaults = {
  bodyW: BUMBLEBEE_BODY_LENGTH,
  bodyH: BUMBLEBEE_BODY_THICKNESS,
  bodyCenterX: 0,
  bodyCenterY: 0,
  bodyAngle: 0,
  bodyScale: BUMBLEBEE_BODY_SCALE,
  bodyImageW: 1,
  bodyImageH: 1,
  wingLeftAngle: 0,
  wingRightAngle: 0,
  wingLength: BUMBLEBEE_WING_LENGTH,
  wingThickness: BUMBLEBEE_WING_THICKNESS,
  wingTransparency: 1,
  wingOverlap: 0,
  wingPivotY: 0,
  wingLeftImageW: 1,
  wingLeftImageH: 1,
  wingRightImageW: 1,
  wingRightImageH: 1,
  legVisibility: 0,
  renderMode: 0,
  bodyTint: [1, 1, 1] as const,
  bodyTintStrength: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowSize: 1,
  shadowOpacity: 0,
} as const;
