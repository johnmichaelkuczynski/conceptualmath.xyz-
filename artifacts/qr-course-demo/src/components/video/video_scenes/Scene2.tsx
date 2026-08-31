import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene2({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110cqw', y: '50cqh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [setCursorPos]);

  const topics = [
    'Whole numbers', 'Fractions', 'Decimals', 'Percents',
    'Ratios', 'Equations', 'Graphing', 'Beginning algebra'
  ];

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden"
      initial={{ clipPath: 'circle(0% at center)' }}
      animate={{ clipPath: 'circle(150% at center)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.7, 0, 0.3, 1] }}
    >
      <motion.div
        className="absolute w-[150%] h-[150%]"
        initial={{ y: 0 }}
        animate={{ y: '-30%' }}
        transition={{ duration: 8, ease: 'linear' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}site-shots/curriculum.jpg`}
          className="w-full h-full object-cover opacity-25 mix-blend-screen"
          alt="Curriculum page"
        />
        <div className="absolute inset-0 bg-slate-900/70" />
      </motion.div>

      <div className="relative z-10 w-full h-full px-6 py-20 flex flex-col items-center justify-center space-y-10">

        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              className="text-center w-full"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-[9cqw] leading-tight font-sans font-bold text-sky-400 uppercase tracking-wide drop-shadow-md bg-slate-900/90 px-6 py-4 rounded-2xl inline-block border border-sky-900/50 shadow-2xl">
                WHAT THE COURSE COVERS.
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="w-full flex flex-wrap justify-center gap-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              {topics.map((topic, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, scale: 0.9, y: 10 },
                    visible: { opacity: 1, scale: 1, y: 0 }
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="bg-slate-800/95 border border-slate-600/50 px-5 py-3 rounded-xl shadow-xl text-[5.5cqw] text-slate-100 font-medium backdrop-blur-sm"
                >
                  {topic}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
