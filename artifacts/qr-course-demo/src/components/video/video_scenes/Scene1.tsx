import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene1({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110vw', y: '50vh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute w-[150%] h-[150%] bg-sky-900/10 rounded-full blur-[120px]"
        initial={{ y: '20%', scale: 0.8 }}
        animate={{ y: '-10%', scale: 1.1 }}
        transition={{ duration: 6, ease: 'linear' }}
      />

      <div className="relative z-10 flex flex-col items-center w-full px-8 text-center">

        <AnimatePresence mode="popLayout">
          {phase >= 1 && (
            <motion.div
              key="subtitle"
              className="text-[5cqw] font-sans font-bold tracking-widest text-sky-500 uppercase mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              The Crisis
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 2 && (
            <motion.h1
              key="title1"
              className="text-[14cqw] leading-[1.1] font-serif text-slate-50 font-normal tracking-tight"
              initial={{ opacity: 0, y: 30, clipPath: 'inset(100% 0 0 0)' }}
              animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }}
              exit={{ opacity: 0, filter: 'blur(5px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              Remedial<br/>Mathematics
            </motion.h1>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 3 && (
            <motion.div
              key="title2"
              className="text-[6.5cqw] leading-[1.3] font-sans text-slate-300 font-light mt-8 px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, filter: 'blur(5px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              Colleges are spending <strong className="text-white font-semibold">millions</strong> on programs that don't work.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative institutional grid lines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4cqw_4cqw] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] opacity-50" />
    </motion.div>
  );
}
