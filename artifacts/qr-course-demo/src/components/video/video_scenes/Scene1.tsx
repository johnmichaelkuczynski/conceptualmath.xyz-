import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene1({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110cqw', y: '50cqh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
        className="absolute w-[150%] h-[150%]"
        initial={{ scale: 1.2, y: '5%' }}
        animate={{ scale: 1.0, y: 0 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}site-shots/landing.jpg`}
          className="w-full h-full object-cover opacity-30 mix-blend-screen"
          alt="Landing page"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-8 text-center space-y-8">

        <AnimatePresence mode="popLayout">
          {phase >= 1 && (
            <motion.h1
              key="title1"
              className="text-[12cqw] leading-[1.1] font-serif font-bold text-slate-50 uppercase tracking-tight shadow-black drop-shadow-2xl"
              initial={{ opacity: 0, y: 30, clipPath: 'inset(100% 0 0 0)' }}
              animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }}
              exit={{ opacity: 0, filter: 'blur(5px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              REMEDIAL MATH IS COSTING COLLEGES MILLIONS.
            </motion.h1>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 2 && (
            <motion.div
              key="title2"
              className="text-[6.5cqw] leading-[1.3] font-sans font-bold text-sky-400 mt-8 px-6 py-4 bg-slate-900/80 rounded-xl backdrop-blur-sm border border-slate-700 w-full shadow-2xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, filter: 'blur(5px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              Most students still drop or fail.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
