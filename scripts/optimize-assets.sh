#!/usr/bin/env bash
# Optimizes stone + seaweed PNGs for the undersea background:
#   1. Downscales stones to ≤400px wide  (they display at ~100-160px on screen)
#   2. Downscales seaweed to ≤250px wide (they display at ~96px on screen)
#   3. Bakes a Gaussian blur (sigma=4px at final size) into each image,
#      replacing the runtime <Blur> groups that were removed from UnderseaBackground.
#
# Requires: ImageMagick (convert)
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

bytes() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1"; }

process() {
  local file="$1" max_width="$2" blur_sigma="$3"
  [[ -f "$file" ]] || { echo "  SKIP (not found): $file"; return; }
  local before; before=$(bytes "$file")
  # Resize only if wider than max_width, then bake blur into all channels.
  $IM "$file" -resize "${max_width}x>" -channel RGBA -blur "0x${blur_sigma}" "$file"
  local after; after=$(bytes "$file")
  local name; name=$(basename "$file")
  printf "  %-20s %6dK → %6dK\n" "$name" $((before/1024)) $((after/1024))
}

echo "=== Stones  (resize ≤400px wide, bake σ=4px blur) ==="
for i in 1 2 3 4 5 6 7 8 9; do
  process "$ASSETS_DIR/stone${i}.png" 400 4
done

echo ""
echo "=== Seaweed (resize ≤250px wide, bake σ=4px blur) ==="
for i in 1 2 3; do
  process "$ASSETS_DIR/seaweed${i}.png" 250 4
done

echo ""
echo "All done. Clear Metro cache to pick up new assets:"
echo "  npx expo start --clear   (or: npx react-native start --reset-cache)"
