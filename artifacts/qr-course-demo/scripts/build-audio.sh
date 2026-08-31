#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
AUDIO_DIR="public/audio"

SLOTS=(6 8 8 7 6)
HEAD_PAD=0.25
TAIL_PAD=0.25

STARTS=()
acc=0
for s in "${SLOTS[@]}"; do
  STARTS+=("$acc")
  acc=$((acc + s))
done
TOTAL="$acc"

inputs=(-f lavfi -i "anullsrc=r=44100:cl=stereo")
for i in 1 2 3 4 5; do
  inputs+=(-i "$AUDIO_DIR/remedial_admin_v3_s${i}.mp3")
done

filter="[0:a]volume=1.0[silence];"
mix="[silence]"
for idx in 0 1 2 3 4; do
  n=$((idx + 1))
  vo="$AUDIO_DIR/remedial_admin_v3_s${n}.mp3"
  dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$vo")
  slot="${SLOTS[$idx]}"
  start="${STARTS[$idx]}"
  avail=$(awk -v s="$slot" -v h="$HEAD_PAD" -v t="$TAIL_PAD" 'BEGIN{printf "%.4f", s-h-t}')
  tempo=$(awk -v d="$dur" -v a="$avail" 'BEGIN{r=d/a; if(r<1)r=1; printf "%.5f", r}')
  fitted=$(awk -v d="$dur" -v r="$tempo" 'BEGIN{printf "%.4f", d/r}')
  awk -v f="$fitted" -v s="$slot" -v t="$TAIL_PAD" 'BEGIN{ if (f > s - t + 0.001){ exit 1 } }' || { echo "ERROR: scene $n fitted=${fitted}s exceeds slot ${slot}s"; exit 1; }
  if [ "$(awk -v r="$tempo" 'BEGIN{print (r>2.0)?1:0}')" = "1" ]; then
    echo "ERROR: scene $n atempo=$tempo exceeds single-filter max 2.0"; exit 1
  fi
  delay_ms=$(awk -v s="$start" -v h="$HEAD_PAD" 'BEGIN{printf "%d", (s+h)*1000}')
  filter+="[$((idx+1)):a]atempo=${tempo},adelay=${delay_ms}|${delay_ms}[a${n}];"
  mix+="[a${n}]"
  printf "scene %d: raw=%ss tempo=%s fitted=%ss start=%ss slot=%ss\n" "$n" "$dur" "$tempo" "$fitted" "$start" "$slot"
done

filter+="${mix}amix=inputs=6:normalize=0:duration=first[mix]"

ffmpeg -y -loglevel error "${inputs[@]}" \
  -filter_complex "$filter" -map "[mix]" \
  -t "$TOTAL" -c:a libmp3lame -q:a 3 "$AUDIO_DIR/remedial_admin_narration_v3.mp3"

out_dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$AUDIO_DIR/remedial_admin_narration_v3.mp3")
echo "remedial_admin_narration_v3.mp3 rebuilt: ${out_dur}s (expected ${TOTAL}s)"
