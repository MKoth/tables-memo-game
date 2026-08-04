import {
  ATLAS_PADDING_PX,
  ATLAS_SHELF_WIDTH_PX,
  packTextureAtlas,
  type AtlasItem,
} from '../packTextureAtlas';

function item(width: number, height: number): AtlasItem {
  return { width, height };
}

describe('packTextureAtlas', () => {
  it('places a single item at the padding inset and sizes the atlas to one shelf', () => {
    const layout = packTextureAtlas([item(100, 50)]);

    expect(layout.atlasWidth).toBe(ATLAS_SHELF_WIDTH_PX);
    expect(layout.atlasHeight).toBe(50 + ATLAS_PADDING_PX * 2);
    expect(layout.regions).toEqual([
      { x: ATLAS_PADDING_PX, y: ATLAS_PADDING_PX, width: 100, height: 50 },
    ]);
  });

  it('places subsequent items to the right with a padding gutter, preserving input order', () => {
    const layout = packTextureAtlas([item(100, 50), item(80, 40)]);

    expect(layout.regions).toEqual([
      { x: ATLAS_PADDING_PX, y: ATLAS_PADDING_PX, width: 100, height: 50 },
      {
        x: ATLAS_PADDING_PX + 100 + ATLAS_PADDING_PX * 2,
        y: ATLAS_PADDING_PX,
        width: 80,
        height: 40,
      },
    ]);
  });

  it('sizes each shelf to its tallest item', () => {
    const layout = packTextureAtlas([item(100, 50), item(80, 90)]);

    expect(layout.atlasHeight).toBe(90 + ATLAS_PADDING_PX * 2);
    expect(layout.regions[1]!.y).toBe(ATLAS_PADDING_PX);
  });

  it('wraps to a new shelf below when an item does not fit the remaining shelf width', () => {
    const wide = item(ATLAS_SHELF_WIDTH_PX - ATLAS_PADDING_PX * 2, 100);
    const layout = packTextureAtlas([wide, item(30, 30)]);

    expect(layout.regions[0]).toEqual({
      x: ATLAS_PADDING_PX,
      y: ATLAS_PADDING_PX,
      width: wide.width,
      height: wide.height,
    });
    expect(layout.regions[1]).toEqual({
      x: ATLAS_PADDING_PX,
      y: 110,
      width: 30,
      height: 30,
    });
    expect(layout.atlasHeight).toBe(142);
  });

  it('keeps every region inside the atlas and non-overlapping for a cloud-and-petal sized input', () => {
    const cloudHeights = [
      180, 172, 164, 188, 181, 177, 116, 177, 156, 246, 229, 130, 228, 197, 178, 221, 131, 135,
      156, 183, 228,
    ];
    const clouds = cloudHeights.map(h => item(256, h));
    const petals = Array.from({ length: 21 }, () => item(24, 30));
    const layout = packTextureAtlas([...clouds, ...petals]);

    expect(layout.regions).toHaveLength(42);
    for (let i = 0; i < layout.regions.length; i++) {
      const region = layout.regions[i]!;
      const source = i < clouds.length ? clouds[i]! : petals[i - clouds.length]!;
      expect(region.width).toBe(source.width);
      expect(region.height).toBe(source.height);
      expect(region.x).toBeGreaterThanOrEqual(0);
      expect(region.y).toBeGreaterThanOrEqual(0);
      expect(region.x + region.width).toBeLessThanOrEqual(layout.atlasWidth);
      expect(region.y + region.height).toBeLessThanOrEqual(layout.atlasHeight);
      for (let j = 0; j < i; j++) {
        const other = layout.regions[j]!;
        const separated =
          region.x + region.width <= other.x ||
          other.x + other.width <= region.x ||
          region.y + region.height <= other.y ||
          other.y + other.height <= region.y;
        expect(separated).toBe(true);
      }
    }
  });

  it('is deterministic: identical inputs produce identical packing', () => {
    const items = [item(256, 180), item(256, 246), item(24, 30)];
    expect(packTextureAtlas(items)).toEqual(packTextureAtlas(items));
  });

  it('returns an empty region list for no items', () => {
    const layout = packTextureAtlas([]);

    expect(layout.regions).toEqual([]);
    expect(layout.atlasHeight).toBe(0);
  });
});
