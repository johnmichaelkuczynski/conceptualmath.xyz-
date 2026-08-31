---
name: Demo caption clock
description: Accessibility timing rule for the animated course demo when browsers block audible autoplay.
---

Drive captions from the same scene timeline that advances the animated visuals, not from audio playback state.

**Why:** Browsers may block audible autoplay while the visual scene timers continue. Audio-cue-driven captions then freeze or never appear even though the demo keeps playing.

**How to apply:** Keep timed caption media associated with the audio, but select and advance visible cues from visual scene changes so fresh loads, muted playback, jumps, repeats, and loops remain synchronized.