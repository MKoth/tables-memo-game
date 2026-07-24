#!/usr/bin/env bash
# Optimizes stone, starfish, seashell + seaweed PNGs for the undersea background,
# and rose PNGs (bud, center, calyx, petals, leaves, stem) for the flower-garden theme:
#   Undersea
#     1. Downscales stones to ≤400px wide  (they display at ~100-160px on screen)
#     2. Downscales seaweed to ≤250px wide (they display at ~96px on screen)
#     3. Bakes a Gaussian blur (σ=2px) into each image, replacing the removed
#        runtime <Blur> groups from UnderseaBackground.
#        Pipeline: resize → add transparent padding → blur
#        The padding gives the blur room to fade to nothing at the edges instead
#        of clipping hard against transparent pixels.
#   Flower garden (roses)
#     The rose-bud shader samples bud/center/petals at 15-85 px on screen
#     (config.bellSize * scale); the calyx shader at bellSize * 1.2 (~100 px);
#     leaves at ~30-50 px (DEFAULT_LEAF_SIZE * (1.2 + t)); the stem texture
#     along a 3-18 px wide bezier.  So 200 px square is plenty for the rose
#     head parts, 96x160 for leaves, and 64x768 for the stem.  Each image is
#     then palette-quantized (PaletteAlpha, max 64 colours) which keeps
#     transparency and is well within the on-screen detail budget.
#
# Requires: ImageMagick 7 (magick)
# The originals are irreversibly overwritten — restore from git if needed.

set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/../assets" && pwd)"
THEME_IMAGES_DIR="$ASSETS_DIR/images/undersea_theme"
ROSES_DIR="$ASSETS_DIR/images/flower_garden_theme/roses"
SOIL_DIR="$ASSETS_DIR/images/flower_garden_theme/soil"
LYCAENIDAE_DIR="$ASSETS_DIR/images/flower_garden_theme/lycaenidae"

if command -v magick &>/dev/null; then
  IM="magick"
elif command -v convert &>/dev/null; then
  IM="convert"
else
  echo "Error: ImageMagick not found. Install via: brew install imagemagick" >&2
  exit 1
fi

BLUR_SIGMA=2   # half as strong as the previous run (was 4)
SEAFLOOR3_BLUR_SIGMA=1.5  # slightly softer than other seafloor tiles
PADDING=10     # transparent pixels added each side before blurring
ROSE_PALETTE_COLORS=64

bytes() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1"; }

process() {
  local file="$1" max_width="$2"
  [[ -f "$file" ]] || { echo "  SKIP (not found): $file"; return; }
  local before; before=$(bytes "$file")
  # 1. Resize (only if wider than max_width)
  # 2. Add transparent border so blur fades naturally at edges
  # 3. Blur all channels (RGBA) at the softer sigma
  $IM "$file" \
    -resize "${max_width}x>" \
    -bordercolor transparent -border "${PADDING}" \
    -channel RGBA -blur "0x${BLUR_SIGMA}" \
    "$file"
  local after; after=$(bytes "$file")
  local name; name=$(basename "$file")
  printf "  %-20s %6dK → %6dK\n" "$name" $((before/1024)) $((after/1024))
}

process_rose() {
  local file="$1" max_geometry="$2"
  [[ -f "$file" ]] || { echo "  SKIP (not found): $file"; return; }
  local before; before=$(bytes "$file")
  $IM "$file" \
    -resize "${max_geometry}" \
    -strip \
    -define png:compression-level=9 \
    -define png:compression-strategy=0 \
    -colors "${ROSE_PALETTE_COLORS}" \
    "$file"
  local after; after=$(bytes "$file")
  local name; name=$(basename "$file")
  printf "  %-20s %6dK → %6dK\n" "$name" $((before/1024)) $((after/1024))
}

echo "=== Stones  (resize ≤400px wide, +${PADDING}px padding, bake σ=${BLUR_SIGMA}px blur) ==="
for i in 1 2 3 4 5 6 7 8 9; do
  process "$THEME_IMAGES_DIR/stones/stone${i}.png" 400
done

echo ""
echo "=== Starfish & seashells (resize ≤400px wide, +${PADDING}px padding, bake σ=${BLUR_SIGMA}px blur) ==="
for i in 1 2 3; do
  process "$THEME_IMAGES_DIR/stones/starfish${i}.png" 400
done
for i in 1 2 3 4 5; do
  process "$THEME_IMAGES_DIR/stones/seashell${i}.png" 400
done

echo ""
echo "=== Seaweed (resize ≤250px wide, +${PADDING}px padding, bake σ=${BLUR_SIGMA}px blur) ==="
for i in 1 2 3 4 5 6; do
  process "$THEME_IMAGES_DIR/seaweed/seaweed${i}.png" 250
done

echo ""
echo "=== Seafloor (resize ≤512px, bake σ=${BLUR_SIGMA}px blur, no padding — seamless tile) ==="
# Seafloor is a tiling texture: skip padding, use -virtual-pixel tile so the
# blur samples across the wrap boundary and keeps the seam invisible.
for name in seafloor.png seafloor2.png seafloor3.png; do
  f="$THEME_IMAGES_DIR/seafloor/$name"
  [[ -f "$f" ]] || continue
  sigma=$BLUR_SIGMA
  [[ "$name" == "seafloor3.png" ]] && sigma=$SEAFLOOR3_BLUR_SIGMA
  before=$(bytes "$f")
  $IM "$f" \
    -resize '512x>' \
    -virtual-pixel tile \
    -channel RGBA -blur "0x${sigma}" \
    "$f"
  after=$(bytes "$f")
  printf "  %-20s %6dK → %6dK  (σ=%s)\n" "$name" $((before/1024)) $((after/1024)) "$sigma"
done

echo ""
echo ""
echo "=== Roses (resize to on-screen geometry + 64-colour palette, preserves alpha) ==="
echo "--- Rose head (200x200, was ~900x1000) ---"
for name in rose_bud.png rose_center.png rose_base.png; do
  process_rose "$ROSES_DIR/$name" "200x200"
done
echo "--- Petals (200x200, was ~350x380) ---"
for i in 1 2 3 4 5 6; do
  process_rose "$ROSES_DIR/pettel${i}.png" "200x200"
done
echo "--- Leaves (96x160, was ~270x440) ---"
for i in 1 2 3 4; do
  process_rose "$ROSES_DIR/leaf${i}.png" "96x160"
done
echo "--- Stem (64x768, was 110x1434) ---"
process_rose "$ROSES_DIR/stem.png" "64x768"

echo ""
echo "=== Soil (grass-tilable: 300x300 palette-optimised tile, was 1254x1254) ==="
process_rose "$SOIL_DIR/grass-tilable.png" "300x300"

echo ""
echo "=== Lycaenidae butterflies (resize 128x128 body, 64x96 wings, 64-colour palette) ==="
LY_BODY="$LYCAENIDAE_DIR/lycaenidae_body.png"
if [[ -f "$LY_BODY" ]]; then
  process_rose "$LY_BODY" "128x128"
fi
for f in "$LYCAENIDAE_DIR"/lycaenidae_left_wing*.png "$LYCAENIDAE_DIR"/lycaenidae_right_wing*.png; do
  process_rose "$f" "64x96"
done

echo ""
echo "All done. Clear Metro cache to pick up new assets:"
echo "  npx expo start --clear   (or: npx react-native start --reset-cache)"
