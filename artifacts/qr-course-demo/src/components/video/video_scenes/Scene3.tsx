import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene3({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110cqw', y: '50cqh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3500);
    const t4 = setTimeout(() => setPhase(4), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
    >
      <motion.div
        className="absolute w-[150%] h-[150%]"
        initial={{ scale: 1.2, x: '-5%' }}
        animate={{ scale: 1, x: 0 }}
        transition={{ duration: 8, ease: 'easeOut' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}site-shots/landing.jpg`}
          className="w-full h-full object-cover opacity-80"
          alt="Developmental Mathematics course website"
        />
        <div className="absolute inset-0 bg-slate-950/20" />
      </motion.div>

      <div className="relative z-10 w-full h-full px-8 py-20 flex flex-col items-center justify-center space-y-8">

        <AnimatePresence mode="popLayout">
          {phase >= 1 && (
            <motion.h2
              className="text-[11cqw] font-serif font-bold text-white uppercase text-center bg-sky-950/70 p-5 rounded-2xl w-full border border-sky-700/50 shadow-2xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              CLEAR LECTURES
            </motion.h2>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 2 && (
            <motion.h2
              className="text-[11cqw] font-serif font-bold text-white uppercase text-center bg-sky-900/70 p-5 rounded-2xl w-full border border-sky-600/50 shadow-2xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              UNLIMITED PRACTICE
            </motion.h2>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 3 && (
            <motion.h2
              className="text-[11cqw] leading-tight font-serif font-bold text-white uppercase text-center bg-sky-800/70 p-5 rounded-2xl w-full border border-sky-500/50 shadow-2xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              STEP-BY-STEP<br/>GUIDANCE.
            </motion.h2>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 4 && (
            <motion.div
              className="text-[6.5cqw] text-teal-200 font-sans font-medium text-center mt-6 bg-slate-950/75 p-5 rounded-2xl border border-slate-700 w-full shadow-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Keeps students moving in the right direction.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
