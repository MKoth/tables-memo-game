import { Platform } from 'react-native';
import { matchFont, vec, type SkFont } from '@shopify/react-native-skia';

export const LABEL_STROKE_WIDTH = 2;
export const LABEL_FILL_COLOR = '#ffffff';
export const LABEL_STROKE_COLOR = '#0a2840';
export const LABEL_WRONG_COLOR = '#ff5a5a';
export const LABEL_REF_DIAMETER = 56;

type LabelGlyph = { id: number; pos: ReturnType<typeof vec> };

const labelFontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
const labelFontCache = new Map<number, SkFont>();
const labelGlyphCache = new Map<string, LabelGlyph[]>();

export function labelFontFor(charLength: number): SkFont {
  const fontSize =
    charLength === 1
      ? Math.max(16, LABEL_REF_DIAMETER * 0.5)
      : Math.max(14, (LABEL_REF_DIAMETER * 0.5) / Math.max(1, charLength * 0.52));
  let font = labelFontCache.get(fontSize);
  if (font == null) {
    font = matchFont({
      fontFamily: labelFontFamily,
      fontSize,
      fontWeight: '700',
    });
    labelFontCache.set(fontSize, font);
  }
  return font;
}

export function labelGlyphsFor(
  char: string,
  font: SkFont,
  letterSpacing = 0,
): LabelGlyph[] {
  const key = `${font.getSize()}-${char}-${letterSpacing}`;
  let glyphs = labelGlyphCache.get(key);
  if (glyphs == null) {
    const ids = font.getGlyphIDs(char);
    const textWidth = font.getTextWidth(char);
    const metrics = font.getMetrics();
    const offsetX = LABEL_REF_DIAMETER * 0.5 - textWidth * 0.5;
    const offsetY = LABEL_REF_DIAMETER * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    let curX = offsetX;
    glyphs = ids.map((id, i) => {
      const pos = vec(curX, offsetY);
      if (i < char.length) {
        curX += font.getTextWidth(char[i]) + letterSpacing;
      }
      return { id, pos };
    });
    labelGlyphCache.set(key, glyphs);
  }
  return glyphs;
}
