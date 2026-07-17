/** Reference body bell size used for wordSprite label font scaling. */
export const REFERENCE_BODY_BELL_SIZE = 55;

export function computeWordSpriteFontScale(bellSize: number): number {
  return bellSize / REFERENCE_BODY_BELL_SIZE;
}
