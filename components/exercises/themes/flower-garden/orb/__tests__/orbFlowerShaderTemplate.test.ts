import { ORB_FLOWER_SKSL } from '../orbFlowerShader.sksl';

describe('ORB_FLOWER_SKSL template', () => {
  it('resolves every template hole and stays syntactically balanced', () => {
    const s = ORB_FLOWER_SKSL;
    expect(s.includes('${')).toBe(false);
    expect(/float phase =/.test(s)).toBe(false);
    let depth = 0;
    let minDepth = 0;
    for (const ch of s) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      minDepth = Math.min(minDepth, depth);
    }
    expect(depth).toBe(0);
    expect(minDepth).toBe(0);
    const parens = (s.match(/\(/g) || []).length;
    const closes = (s.match(/\)/g) || []).length;
    expect(parens).toBe(closes);
  });
});
