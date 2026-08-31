import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene2({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110vw', y: '50vh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-50 flex items-center justify-center overflow-hidden"
      initial={{ clipPath: 'circle(0% at center)' }}
      animate={{ clipPath: 'circle(150% at center)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.7, 0, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 pointer-events-none" />

      <div className="relative z-10 w-full h-full px-8 py-20 flex flex-col items-center justify-center">

        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              className="text-center w-full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-[25cqw] font-serif font-bold text-slate-900 leading-none tracking-tighter">
                80<span className="text-sky-600">%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="text-center mt-6 w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-[9cqw] leading-tight font-sans font-bold text-slate-800 uppercase tracking-wide">
                Drop or Fail
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              className="mt-12 w-full max-w-[80cqw]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <motion.div
                  className="h-full bg-slate-800"
                  initial={{ width: "0%" }}
                  animate={{ width: "80%" }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              </div>
              <p className="text-[5cqw] text-slate-500 font-sans mt-6 text-center">
                The current institutional model is structurally broken.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
