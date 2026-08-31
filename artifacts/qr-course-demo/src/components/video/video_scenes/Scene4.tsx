import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene4({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110vw', y: '50vh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3500);
    const t4 = setTimeout(() => setPhase(4), 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%' }}
      transition={{ duration: 1, ease: [0.7, 0, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-sky-50 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full h-full px-8 py-16 flex flex-col items-center justify-between">

        <div className="w-full flex flex-col items-center mt-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -30 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-[12cqw] leading-[1.1] font-serif text-slate-900 mb-4">
              Improve<br/>Outcomes
            </h2>
          </motion.div>
        </div>

        <div className="relative w-full flex-1 flex flex-col justify-center gap-6 mt-4">

          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm w-full"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="text-[4cqw] font-bold text-sky-600 uppercase tracking-wider mb-2">01. Practice</div>
                <div className="text-[6cqw] font-sans font-medium text-slate-800 leading-tight">
                  Unlimited algorithmic generation
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm w-full ml-4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="text-[4cqw] font-bold text-sky-600 uppercase tracking-wider mb-2">02. Guidance</div>
                <div className="text-[6cqw] font-sans font-medium text-slate-800 leading-tight">
                  Continuous step-by-step direction
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase >= 4 && (
              <motion.div
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg w-full mt-4"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="text-[4cqw] font-bold text-teal-400 uppercase tracking-wider mb-2">03. Analytics</div>
                <div className="text-[6cqw] font-sans font-medium text-white leading-tight">
                  Prescribe specialized training at point of weakness
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
}
