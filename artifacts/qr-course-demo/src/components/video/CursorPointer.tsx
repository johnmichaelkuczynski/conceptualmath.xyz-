import React, { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { usePlaybackPlaying } from './PlaybackContext';

export function CursorPointer({ x, y, isClicking }: { x: string | number; y: string | number; isClicking: boolean }) {
  const playing = usePlaybackPlaying();
  const cursorControls = useAnimationControls();

  useEffect(() => {
    if (!playing) {
      cursorControls.stop();
      return;
    }
    cursorControls.start({
      x,
      y,
      transition: { type: 'spring', stiffness: 120, damping: 20 },
    });
  }, [cursorControls, playing, x, y]);

  return (
    <motion.div
      className="absolute top-0 left-0 z-50 pointer-events-none"
      animate={cursorControls}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_d)">
          <path d="M9.39 6.27L22.95 19.83H15.65L11.51 26.31V6.27H9.39Z" fill="black" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        </g>
        <defs>
          <filter id="filter0_d" x="0.39" y="0.27" width="31.56" height="36.04" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
            <feOffset dy="2"/>
            <feGaussianBlur stdDeviation="2"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
          </filter>
        </defs>
      </svg>
      {isClicking && <ClickPulse />}
    </motion.div>
  );
}

function ClickPulse() {
  const playing = usePlaybackPlaying();
  const pulseControls = useAnimationControls();

  useEffect(() => {
    if (!playing) {
      pulseControls.stop();
      return;
    }
    pulseControls.start({
      scale: 1.5,
      opacity: 0,
      transition: { duration: 0.3 },
    });
  }, [playing, pulseControls]);

  return (
    <motion.div
      className="absolute top-0 left-0 w-8 h-8 border-2 border-black rounded-full"
      initial={{ scale: 0.5, opacity: 1 }}
      animate={pulseControls}
    />
  );
}
