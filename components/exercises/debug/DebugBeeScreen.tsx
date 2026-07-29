import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Canvas, Image, ImageShader, Rect, Shader, Skia, type SkImage } from '@shopify/react-native-skia';
import { ThemeProvider } from '../themeContract';
import { flowerGardenTheme } from '../themes/flower-garden';
import { ExerciseShell } from '../shared';
import { TABLE_EXERCISE_STORE_CONFIG } from '../core/store/createExerciseStore';
import { useFlowerGardenAssetsContext } from '../themes/flower-garden/core/providers/FlowerGardenAssetsProvider';
import { BEE_SKSL } from '../themes/flower-garden/shaders/bee.sksl';
import { BUMBLEBEE_SKSL } from '../themes/flower-garden/shaders/bumblebee.sksl';
import {
  BEE_BODY_LENGTH, BEE_BODY_THICKNESS, BEE_WING_LENGTH, BEE_WING_THICKNESS,
  BEE_WING_PHASE1_ANGLE, BEE_WING_PHASE2_ANGLE, BEE_WING_OVERLAP, BEE_WING_PIVOT_Y, BEE_WING_TRANSPARENCY,
  BEE_SHADOW_OFFSET_SITTING_X, BEE_SHADOW_OFFSET_SITTING_Y, BEE_SHADOW_SIZE_SITTING, BEE_SHADOW_OPACITY_SITTING,
  BEE_SHADOW_OFFSET_FLYING_X, BEE_SHADOW_OFFSET_FLYING_Y, BEE_SHADOW_SIZE_FLYING, BEE_SHADOW_OPACITY_FLYING,
} from '../themes/flower-garden/roamer/bee/config/beeSettings';
import {
  BUMBLEBEE_BODY_LENGTH, BUMBLEBEE_BODY_THICKNESS, BUMBLEBEE_WING_LENGTH, BUMBLEBEE_WING_THICKNESS,
  BUMBLEBEE_WING_PHASE1_ANGLE, BUMBLEBEE_WING_PHASE2_ANGLE, BUMBLEBEE_WING_OVERLAP, BUMBLEBEE_WING_PIVOT_Y, BUMBLEBEE_WING_TRANSPARENCY,
  BUMBLEBEE_SHADOW_OFFSET_SITTING_X, BUMBLEBEE_SHADOW_OFFSET_SITTING_Y, BUMBLEBEE_SHADOW_SIZE_SITTING, BUMBLEBEE_SHADOW_OPACITY_SITTING,
  BUMBLEBEE_SHADOW_OFFSET_FLYING_X, BUMBLEBEE_SHADOW_OFFSET_FLYING_Y, BUMBLEBEE_SHADOW_SIZE_FLYING, BUMBLEBEE_SHADOW_OPACITY_FLYING,
} from '../themes/flower-garden/roamer/bumblebee/config/bumblebeeSettings';

type LegRect = { x: number; y: number; w: number; h: number };
type LegState = 'hidden' | 'idle' | 'moving';
type ViewMode = 'body' | 'shader';

const LEG_LABELS = ['LT', 'RT', 'LM', 'RM', 'LB', 'RB'];

const LEG_COLORS: Record<string, string> = {
  LT: '#ff6b6b', LM: '#51cf66', LB: '#339af0',
  RT: '#f06595', RM: '#ffd43b', RB: '#20c997',
};

const TRIPOD_OFFSETS = [0, Math.PI, Math.PI, 0, 0, Math.PI];

const INITIAL_LEG_RECTS: Record<string, LegRect[]> = {
  bee: [
    { x: 0.111, y: 0.172, w: 0.210, h: 0.200 },
    { x: 0.682, y: 0.153, w: 0.210, h: 0.200 },
    { x: 0.000, y: 0.445, w: 0.340, h: 0.090 },
    { x: 0.685, y: 0.443, w: 0.315, h: 0.095 },
    { x: 0.013, y: 0.567, w: 0.325, h: 0.385 },
    { x: 0.682, y: 0.564, w: 0.305, h: 0.375 },
  ],
  bumblebee: [
    { x: 0.125, y: 0.086, w: 0.205, h: 0.185 },
    { x: 0.663, y: 0.079, w: 0.195, h: 0.190 },
    { x: 0.000, y: 0.339, w: 0.280, h: 0.145 },
    { x: 0.720, y: 0.345, w: 0.280, h: 0.130 },
    { x: 0.014, y: 0.513, w: 0.265, h: 0.480 },
    { x: 0.717, y: 0.502, w: 0.220, h: 0.500 },
  ],
};

const beeEffect = Skia.RuntimeEffect.Make(BEE_SKSL)!;
const bumblebeeEffect = Skia.RuntimeEffect.Make(BUMBLEBEE_SKSL)!;

function DebugBeeContent() {
  const { images } = useFlowerGardenAssetsContext();
  const [showBee, setShowBee] = useState(true);
  const [legMode, setLegMode] = useState(false);
  const [legRects, setLegRects] = useState<LegRect[]>(INITIAL_LEG_RECTS.bee);
  const [selectedLeg, setSelectedLeg] = useState<number | null>(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [area, setArea] = useState({ w: 1, h: 1 });
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [legState, setLegState] = useState<LegState>('hidden');
  const [legPhase, setLegPhase] = useState(0);

  const isBee = showBee;
  const bodyImage: SkImage | null = isBee ? images.beeBodyImage : images.bumblebeeBodyImage;
  const leftWingImage: SkImage | null = isBee ? images.beeLeftWingImage : images.bumblebeeLeftWingImage;
  const rightWingImage: SkImage | null = isBee ? images.beeRightWingImage : images.bumblebeeRightWingImage;

  useEffect(() => {
    if (legState !== 'moving') return;
    const id = setInterval(() => setLegPhase(p => p + 0.15), 33);
    return () => clearInterval(id);
  }, [legState]);

  if (bodyImage == null || leftWingImage == null || rightWingImage == null) {
    return <Text style={styles.loading}>Loading...</Text>;
  }

  const imgW = bodyImage.width();
  const imgH = bodyImage.height();
  const scale = Math.min(area.w / imgW, area.h / imgH);
  const dispW = imgW * scale;
  const dispH = imgH * scale;
  const offX = (area.w - dispW) / 2;
  const offY = (area.h - dispH) / 2;

  const selected = selectedLeg != null ? legRects[selectedLeg] : null;

  const bodyLength = isBee ? BEE_BODY_LENGTH : BUMBLEBEE_BODY_LENGTH;
  const bodyThickness = isBee ? BEE_BODY_THICKNESS : BUMBLEBEE_BODY_THICKNESS;
  const wingLen = isBee ? BEE_WING_LENGTH : BUMBLEBEE_WING_LENGTH;
  const wingThick = isBee ? BEE_WING_THICKNESS : BUMBLEBEE_WING_THICKNESS;
  const p1a = isBee ? BEE_WING_PHASE1_ANGLE : BUMBLEBEE_WING_PHASE1_ANGLE;
  const p2a = isBee ? BEE_WING_PHASE2_ANGLE : BUMBLEBEE_WING_PHASE2_ANGLE;
  const wOverlap = isBee ? BEE_WING_OVERLAP : BUMBLEBEE_WING_OVERLAP;
  const wPivotY = isBee ? BEE_WING_PIVOT_Y : BUMBLEBEE_WING_PIVOT_Y;
  const wTransparency = isBee ? BEE_WING_TRANSPARENCY : BUMBLEBEE_WING_TRANSPARENCY;
  const sox = isBee ? BEE_SHADOW_OFFSET_SITTING_X : BUMBLEBEE_SHADOW_OFFSET_SITTING_X;
  const soy = isBee ? BEE_SHADOW_OFFSET_SITTING_Y : BUMBLEBEE_SHADOW_OFFSET_SITTING_Y;
  const ssz = isBee ? BEE_SHADOW_SIZE_SITTING : BUMBLEBEE_SHADOW_SIZE_SITTING;
  const sop = isBee ? BEE_SHADOW_OPACITY_SITTING : BUMBLEBEE_SHADOW_OPACITY_SITTING;
  const fox = isBee ? BEE_SHADOW_OFFSET_FLYING_X : BUMBLEBEE_SHADOW_OFFSET_FLYING_X;
  const foy = isBee ? BEE_SHADOW_OFFSET_FLYING_Y : BUMBLEBEE_SHADOW_OFFSET_FLYING_Y;
  const fsz = isBee ? BEE_SHADOW_SIZE_FLYING : BUMBLEBEE_SHADOW_SIZE_FLYING;
  const fop = isBee ? BEE_SHADOW_OPACITY_FLYING : BUMBLEBEE_SHADOW_OPACITY_FLYING;

  const renderMode = legState === 'hidden' ? 0 : 1;
  const showLegs = legState !== 'hidden';
  const legVisibilityVal = showLegs ? 1 : 0;
  const legPhasesAdvanced = showLegs
    ? TRIPOD_OFFSETS.map(o => Math.sin(legPhase + o))
    : [0, 0, 0, 0, 0, 0];

  const effect = isBee ? beeEffect : bumblebeeEffect;
  const bodyTint: number[] = [1, 1, 1];
  const cx = area.w / 2;
  const cy = area.h / 2;
  const bodyScaleVal = Math.min(area.w / bodyLength, area.h / bodyThickness) * 0.7;

  return (
    <View style={styles.container}>
      <View style={styles.imageArea} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {viewMode === 'body' ? (
          <Canvas
            style={{ flex: 1 }}
            onStartShouldSetResponder={() => legMode}
            onMoveShouldSetResponder={() => legMode}
            onResponderGrant={(e) => {
              if (!legMode) return;
              const { locationX, locationY } = e.nativeEvent;
              const ux = (locationX - offX) / dispW;
              const uy = (locationY - offY) / dispH;
              if (ux < 0 || ux > 1 || uy < 0 || uy > 1) { setSelectedLeg(null); return; }
              for (let i = legRects.length - 1; i >= 0; i--) {
                const r = legRects[i]!;
                if (ux >= r.x && ux <= r.x + r.w && uy >= r.y && uy <= r.y + r.h) {
                  setSelectedLeg(i);
                  setDragOff({ x: ux - r.x, y: uy - r.y });
                  return;
                }
              }
              setSelectedLeg(null);
            }}
            onResponderMove={(e) => {
              if (selectedLeg == null || !legMode) return;
              const { locationX, locationY } = e.nativeEvent;
              setLegRects(prev => prev.map((r, i) => {
                if (i !== selectedLeg) return r;
                return {
                  ...r,
                  x: Math.max(0, Math.min(1 - r.w, (locationX - offX) / dispW - dragOff.x)),
                  y: Math.max(0, Math.min(1 - r.h, (locationY - offY) / dispH - dragOff.y)),
                };
              }));
            }}
          >
            <Image image={bodyImage} x={0} y={0} width={area.w} height={area.h} fit="contain" />
            {legMode && legRects.map((rect, i) => (
              <Rect key={i} x={offX + rect.x * dispW} y={offY + rect.y * dispH} width={rect.w * dispW} height={rect.h * dispH} color={(LEG_COLORS[LEG_LABELS[i]!] ?? '#888') + '60'} />
            ))}
            {legMode && legRects.map((rect, i) => (
              <Rect key={'b' + i} x={offX + rect.x * dispW} y={offY + rect.y * dispH} width={rect.w * dispW} height={rect.h * dispH} style="stroke" strokeWidth={2} color={i === selectedLeg ? '#fff' : (LEG_COLORS[LEG_LABELS[i]!] ?? '#888')} />
            ))}
          </Canvas>
        ) : (
          <Canvas style={{ flex: 1 }}>
            <Rect x={0} y={0} width={area.w} height={area.h}>
              <Shader
                source={effect}
                uniforms={{
                  bodyW: bodyLength,
                  bodyH: bodyThickness,
                  bodyCenterX: cx,
                  bodyCenterY: cy,
                  bodyAngle: 0,
                  bodyScale: bodyScaleVal,
                  bodyImageW: imgW,
                  bodyImageH: imgH,
                  wingLeftAngle: p1a,
                  wingRightAngle: p1a,
                  wingLength: wingLen,
                  wingThickness: wingThick,
                  wingTransparency: wTransparency,
                  wingOverlap: wOverlap,
                  wingPivotY: wPivotY,
                  wingLeftImageW: leftWingImage.width(),
                  wingLeftImageH: leftWingImage.height(),
                  wingRightImageW: rightWingImage.width(),
                  wingRightImageH: rightWingImage.height(),
                  legVisibility: legVisibilityVal,
                  legPhasesAdvanced,
                  renderMode,
                  bodyTint,
                  bodyTintStrength: 0,
                  shadowOffsetX: renderMode > 0.5 ? sox : fox,
                  shadowOffsetY: renderMode > 0.5 ? soy : foy,
                  shadowSize: renderMode > 0.5 ? ssz : fsz,
                  shadowOpacity: renderMode > 0.5 ? sop : fop,
                }}
              >
                <ImageShader image={bodyImage} x={0} y={0} width={imgW} height={imgH} fit="fill" tx="clamp" ty="clamp" />
                <ImageShader image={leftWingImage} x={0} y={0} width={leftWingImage.width()} height={leftWingImage.height()} fit="fill" tx="clamp" ty="clamp" />
                <ImageShader image={rightWingImage} x={0} y={0} width={rightWingImage.width()} height={rightWingImage.height()} fit="fill" tx="clamp" ty="clamp" />
              </Shader>
            </Rect>
          </Canvas>
        )}
      </View>

      <ScrollView style={styles.panel} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Debug Bee</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Species:</Text>
          <Pressable style={[styles.btn, showBee && styles.active]} onPress={() => { setShowBee(true); setLegRects(INITIAL_LEG_RECTS.bee); setSelectedLeg(null); }}>
            <Text style={styles.btnText}>Bee</Text>
          </Pressable>
          <Pressable style={[styles.btn, !showBee && styles.active]} onPress={() => { setShowBee(false); setLegRects(INITIAL_LEG_RECTS.bumblebee); setSelectedLeg(null); }}>
            <Text style={styles.btnText}>Bumblebee</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>View:</Text>
          <Pressable style={[styles.btn, viewMode === 'body' && styles.active]} onPress={() => setViewMode('body')}>
            <Text style={styles.btnText}>Body</Text>
          </Pressable>
          <Pressable style={[styles.btn, viewMode === 'shader' && styles.active]} onPress={() => setViewMode('shader')}>
            <Text style={styles.btnText}>Shader</Text>
          </Pressable>
          {viewMode === 'body' && (
            <Pressable style={[styles.btn, legMode && styles.active]} onPress={() => { setLegMode(!legMode); setSelectedLeg(null); }}>
              <Text style={styles.btnText}>{legMode ? 'Done' : 'Legs'}</Text>
            </Pressable>
          )}
        </View>

        {viewMode === 'shader' && (
          <View style={styles.row}>
            <Text style={styles.label}>Legs:</Text>
            {(['hidden', 'idle', 'moving'] as LegState[]).map(s => (
              <Pressable key={s} style={[styles.btn, legState === s && styles.active]} onPress={() => { setLegState(s); if (s !== 'moving') setLegPhase(0); }}>
                <Text style={styles.btnText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {legMode && selected != null && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{LEG_LABELS[selectedLeg!]}:</Text>
              <Text style={styles.val}>x{selected.x.toFixed(3)} y{selected.y.toFixed(3)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Width:</Text>
              <Pressable style={styles.sbtn} onPress={() => setLegRects(prev => prev.map((r, i) => i === selectedLeg ? { ...r, w: Math.max(0.01, r.w - 0.005) } : r))}>
                <Text style={styles.btnText}>-</Text>
              </Pressable>
              <Text style={styles.val}>{selected.w.toFixed(3)}</Text>
              <Pressable style={styles.sbtn} onPress={() => setLegRects(prev => prev.map((r, i) => i === selectedLeg ? { ...r, w: Math.min(1, r.w + 0.005) } : r))}>
                <Text style={styles.btnText}>+</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Height:</Text>
              <Pressable style={styles.sbtn} onPress={() => setLegRects(prev => prev.map((r, i) => i === selectedLeg ? { ...r, h: Math.max(0.01, r.h - 0.005) } : r))}>
                <Text style={styles.btnText}>-</Text>
              </Pressable>
              <Text style={styles.val}>{selected.h.toFixed(3)}</Text>
              <Pressable style={styles.sbtn} onPress={() => setLegRects(prev => prev.map((r, i) => i === selectedLeg ? { ...r, h: Math.min(1, r.h + 0.005) } : r))}>
                <Text style={styles.btnText}>+</Text>
              </Pressable>
            </View>
            <Pressable style={[styles.btn, { marginTop: 4 }]} onPress={() => {
              const species = showBee ? 'bee' : 'bumblebee';
              const lines = legRects.map((r, i) =>
                `lrs[${i}] = vec4(${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.w.toFixed(3)}, ${r.h.toFixed(3)});`
              ).join('\n');
              Clipboard.setString(`// ${species}\n${lines}`);
              Alert.alert('Copied', `${species} leg rects copied to clipboard`);
            }}>
              <Text style={styles.btnText}>Copy</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function DebugBeeScreen() {
  return (
    <ThemeProvider theme={flowerGardenTheme}>
      <ExerciseShell storeConfig={TABLE_EXERCISE_STORE_CONFIG}>
        <DebugBeeContent />
      </ExerciseShell>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222' },
  imageArea: { flex: 1 },
  loading: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },
  panel: { maxHeight: 320, backgroundColor: 'rgba(0,0,0,0.9)', padding: 10 },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  label: { color: '#aaa', fontSize: 12, width: 60 },
  val: { color: '#fff', fontSize: 12, minWidth: 40, textAlign: 'center' },
  btn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 5, backgroundColor: '#444' },
  active: { backgroundColor: '#2ecc71' },
  sbtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, backgroundColor: '#555' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
