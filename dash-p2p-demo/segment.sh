#!/usr/bin/env bash
set -e

# Usage: ./segment.sh /path/to/video.mp4
INPUT="$1"
OUT="public/dash"

# clean up
rm -rf "$OUT"
mkdir -p "$OUT"

echo "› Generating DASH at 4 video bitrates (4 s segments, single AdaptationSet)…"
ffmpeg -y -i "$INPUT" \
  -map 0:v -b:v:0 5000k -s:v:0 1920x1080 \
  -map 0:v -b:v:1 3000k -s:v:1 1280x720 \
  -map 0:v -b:v:2 1000k -s:v:2 854x480 \
  -map 0:v -b:v:3 500k  -s:v:3 640x360 \
  -c:v libx264 -an \
  -bf 1 -keyint_min 120 -g 120 -sc_threshold 0 \
  -f dash \
    -use_template 1 \
    -use_timeline 1 \
    -adaptation_sets "id=0,streams=0,1,2,3" \
    -seg_duration 4 \
    -init_seg_name  'init_$RepresentationID$.mp4' \
    -media_seg_name 'chunk_$RepresentationID$_$Number$.m4s' \
  "$OUT/dash.mpd"

echo "✔ Dash manifest + chunks written to $OUT:"
ls -1 "$OUT" | head -n 8
echo "…"
