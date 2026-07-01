#!/usr/bin/env bash
# Optimizes stone, starfish, seashell + seaweed PNGs for the undersea background:
#   1. Downscales stones to ≤400px wide  (they display at ~100-160px on screen)
#   2. Downscales seaweed to ≤250px wide (they display at ~96px on screen)
#   3. Bakes a Gaussian blur (σ=2px) into each image, replacing the removed
#      runtime <Blur> groups from UnderseaBackground.
#      Pipeline: resize → add transparent padding → blur
#      The padding gives the blur room to fade to nothing at the edges instead
#      of clipping hard against transparent pixels.
#
# Requires: ImageMagick 7 (magick)
# The originals are irreversibly overwritten — restore from backup if needed.

set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/../assets" && pwd)"

if command -v magick &>/dev/null; then
  IM="magick"
elif command -v convert &>/dev/null; then
  IM="convert"
else
  echo "Error: ImageMagick not found. Install via: brew install imagemagick" >&2
  exit 1
fi

BLUR_SIGMA=2   # half as strong as the previous run (was 4)
PADDING=10     # transparent pixels added each side before blurring

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

echo "=== Stones  (resize ≤400px wide, +${PADDING}px padding, bake σ=${BLUR_SIGMA}px blur) ==="
for i in 1 2 3 4 5 6 7 8 9; do
  process "$ASSETS_DIR/stone${i}.png" 400
done

echo ""
echo "=== Starfish & seashells (resize ≤400px wide, +${PADDING}px padding, bake σ=${BLUR_SIGMA}px blur) ==="
for i in 1 2 3; do
  process "$ASSETS_DIR/starfish${i}.png" 400
done
for i in 1 2 3 4 5; do
  process "$ASSETS_DIR/seashell${i}.png" 400
done

echo ""
echo "=== Seaweed (resize ≤250px wide, +${PADDING}px padding, bake σ=${BLUR_SIGMA}px blur) ==="
for i in 1 2 3 4 5 6; do
  process "$ASSETS_DIR/seaweed${i}.png" 250
done

echo ""
echo "=== Seafloor (resize ≤512px, bake σ=${BLUR_SIGMA}px blur, no padding — seamless tile) ==="
# Seafloor is a tiling texture: skip padding, use -virtual-pixel tile so the
# blur samples across the wrap boundary and keeps the seam invisible.
for name in seafloor.png seafloor3.png; do
  f="$ASSETS_DIR/$name"
  [[ -f "$f" ]] || continue
  before=$(bytes "$f")
  $IM "$f" \
    -resize '512x>' \
    -virtual-pixel tile \
    -channel RGBA -blur "0x${BLUR_SIGMA}" \
    "$f"
  after=$(bytes "$f")
  printf "  %-20s %6dK → %6dK\n" "$name" $((before/1024)) $((after/1024))
done

echo ""
echo "All done. Clear Metro cache to pick up new assets:"
echo "  npx expo start --clear   (or: npx react-native start --reset-cache)"
