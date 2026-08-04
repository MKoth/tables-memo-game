export type AtlasItem = {
  width: number;
  height: number;
};

export type AtlasRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AtlasLayout = {
  atlasWidth: number;
  atlasHeight: number;
  regions: AtlasRegion[];
};

export const ATLAS_SHELF_WIDTH_PX = 2048;
export const ATLAS_PADDING_PX = 2;

export function packTextureAtlas(items: readonly AtlasItem[]): AtlasLayout {
  const regions: AtlasRegion[] = [];
  let cursorX = ATLAS_PADDING_PX;
  let cursorY = ATLAS_PADDING_PX;
  let shelfHeight = 0;

  for (const item of items) {
    const pitchW = item.width + ATLAS_PADDING_PX * 2;
    const pitchH = item.height + ATLAS_PADDING_PX * 2;

    if (cursorX > ATLAS_PADDING_PX && cursorX + pitchW > ATLAS_SHELF_WIDTH_PX) {
      cursorY += shelfHeight + ATLAS_PADDING_PX * 2;
      cursorX = ATLAS_PADDING_PX;
      shelfHeight = 0;
    }

    shelfHeight = Math.max(shelfHeight, pitchH);
    regions.push({
      x: cursorX,
      y: cursorY,
      width: item.width,
      height: item.height,
    });
    cursorX += pitchW;
  }

  return {
    atlasWidth: ATLAS_SHELF_WIDTH_PX,
    atlasHeight: cursorY + shelfHeight - ATLAS_PADDING_PX,
    regions,
  };
}
