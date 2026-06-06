#!/usr/bin/env bash
# Deterministically rebuild public/audio/composite_audio.mp3 from the six
# per-scene narration clips (vo_s1..vo_s6.mp3) and the background bed
# (bg_music.mp3).
#
# Contract: the composite timeline must match SCENE_DURATIONS in
# src/components/video/VideoTemplate.tsx. Each scene's narration is time-
# stretched (atempo, speed-up only) so it fits inside its scene slot with a
# fixed head/tail pad, then delayed to the scene's start offset and mixed over
# the background bed at low volume. The script asserts every VO fits its slot
# before writing the output.
set -euo pipefail

cd "$(dirname "$0")/.."
AUDIO_DIR="public/audio"

# Scene slot durations in seconds — MUST match SCENE_DURATIONS (ms) in
# src/components/video/VideoTemplate.tsx.
SLOTS=(8 8 12 10 14 10)
HEAD_PAD=0.25   # silence before narration starts within a scene
TAIL_PAD=0.25   # silence reserved at the end of a scene
BG_VOLUME=0.15

# Compute scene start offsets (cumulative slot sums).
STARTS=()
acc=0
for s in "${SLOTS[@]}"; do
  STARTS+=("$acc")
  acc=$((acc + s))
done
TOTAL="$acc"

inputs=(-i "$AUDIO_DIR/bg_music.mp3")
for i in 1 2 3 4 5 6; do
  inputs+=(-i "$AUDIO_DIR/vo_s${i}.mp3")
done

filter="[0:a]volume=${BG_VOLUME}[bg];"
mix="[bg]"
for idx in 0 1 2 3 4 5; do
  n=$((idx + 1))
  vo="$AUDIO_DIR/vo_s${n}.mp3"
  dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$vo")
  slot="${SLOTS[$idx]}"
  start="${STARTS[$idx]}"
  avail=$(awk -v s="$slot" -v h="$HEAD_PAD" -v t="$TAIL_PAD" 'BEGIN{printf "%.4f", s-h-t}')
  # Speed up only when needed; never slow narration below its natural pace.
  tempo=$(awk -v d="$dur" -v a="$avail" 'BEGIN{r=d/a; if(r<1)r=1; printf "%.5f", r}')
  fitted=$(awk -v d="$dur" -v r="$tempo" 'BEGIN{printf "%.4f", d/r}')
  # Assert the fitted clip stays within its slot (with tail pad).
  awk -v f="$fitted" -v s="$slot" -v t="$TAIL_PAD" 'BEGIN{ if (f > s - t + 0.001){ exit 1 } }' \
    || { echo "ERROR: scene $n fitted=${fitted}s exceeds slot ${slot}s"; exit 1; }
  if [ "$(awk -v r="$tempo" 'BEGIN{print (r>2.0)?1:0}')" = "1" ]; then
    echo "ERROR: scene $n atempo=$tempo exceeds single-filter max 2.0"; exit 1
  fi
  delay_ms=$(awk -v s="$start" -v h="$HEAD_PAD" 'BEGIN{printf "%d", (s+h)*1000}')
  filter+="[$((idx+1)):a]atempo=${tempo},adelay=${delay_ms}|${delay_ms}[a${n}];"
  mix+="[a${n}]"
  printf "scene %d: raw=%ss tempo=%s fitted=%ss start=%ss slot=%ss\n" \
    "$n" "$dur" "$tempo" "$fitted" "$start" "$slot"
done

filter+="${mix}amix=inputs=7:normalize=0:duration=first[mix]"

ffmpeg -y -loglevel error "${inputs[@]}" \
  -filter_complex "$filter" -map "[mix]" \
  -t "$TOTAL" -c:a libmp3lame -q:a 3 "$AUDIO_DIR/composite_audio.mp3"

out_dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$AUDIO_DIR/composite_audio.mp3")
echo "composite_audio.mp3 rebuilt: ${out_dur}s (expected ${TOTAL}s)"
