---
name: Demo stop semantics
description: The synchronization contract for the public narrated demo's accessible playback control.
---

The narrated demo uses explicit stop semantics rather than pause-in-place. Stop must hold the displayed frame, audio, scene clock, progress, cursor, and scripted timers. Play restarts the current scene and narration together from that scene's beginning.

**Why:** Independent Framer Motion transitions cannot reliably resume at the same offset as the composite audio. Restarting the current scene after a stop prevents visual/narration drift while still providing the WCAG-required mechanism to stop long audio.

**How to apply:** New scene timers and repeating effects must use shared playback state. Do not relabel the control as Pause unless every live animation can preserve and resume its exact elapsed offset.