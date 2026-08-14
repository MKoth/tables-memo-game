#!/usr/bin/env bash
# Re-encodes WAV/OGG sources as AAC .m4a for the flower-garden and undersea
# themes plus the core sound set. The originals are irreversibly replaced —
# restore from git if needed.
#
#   Flower garden
#     - ambience.m4a     AAC 96kbps  (19MB stereo 44.1kHz WAV, 107s loop)
#     - bee.m4a          AAC 64kbps  (2MB mono 48kHz WAV, 20.6s loop)
#     - bumblebee.m4a    AAC 64kbps  (OGG/Vorbis — not playable on iOS)
#     - orb_open/close + primary_click at 128kbps (one-shots, 0.5-2.5s)
#   Undersea
#     - primary_click.m4a (0.77s one-shot)
#   Core (shared by both themes)
#     - wrong_click.m4a (2.4s one-shot)
#
# Requires: afconvert (bundled with macOS). OGG sources need an explicit
# output sample rate — the default pipeline cannot decode Vorbis.

set -euo pipefail

SOUNDS_DIR="$(cd "$(dirname "$0")/../assets/sounds" && pwd)"

bytes() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1"; }

encode() {
  local source="$1" dest="$2" bitrate="$3" sample_rate="${4:-}"
  [[ -f "$source" ]] || { echo "  SKIP (not found): $source"; return; }
  local before; before=$(bytes "$source")
  local format="-d aac -b ${bitrate}"
  [[ -n "$sample_rate" ]] && format="-d aac@${sample_rate} -b ${bitrate}"
  afconvert -f m4af -c 1 $format "$source" "$dest"
  local after; after=$(bytes "$dest")
  local name; name=$(basename "$source")
  printf "  %-24s %6dK → %6dK\n" "$name" $((before/1024)) $((after/1024))
  rm "$source"
}

echo "=== Core (shared by both themes) ==="
encode "$SOUNDS_DIR/undersea_theme/wrong_click.wav" "$SOUNDS_DIR/core/wrong_click.m4a" 128000

echo ""
echo "=== Flower garden ==="
GARDEN="$SOUNDS_DIR/flower_garden_theme"
encode "$GARDEN/ambience.wav" "$GARDEN/ambience.m4a" 96000
encode "$GARDEN/bee.wav" "$GARDEN/bee.m4a" 64000
encode "$GARDEN/bumblebee.ogg" "$GARDEN/bumblebee.m4a" 64000 44100
encode "$GARDEN/orb_open.wav" "$GARDEN/orb_open.m4a" 128000
encode "$GARDEN/orb_close.wav" "$GARDEN/orb_close.m4a" 128000
encode "$GARDEN/primary_click.wav" "$GARDEN/primary_click.m4a" 128000

echo ""
echo "=== Undersea ==="
UNDERSEA="$SOUNDS_DIR/undersea_theme"
encode "$UNDERSEA/primary_click.wav" "$UNDERSEA/primary_click.m4a" 128000

echo ""
echo "All done. Clear Metro cache to pick up new assets:"
echo "  npm start -- --reset-cache"
