import { motion } from 'framer-motion';
import { CheckCheck, Sparkles } from 'lucide-react';

export function SuccessSticker() {
  return (
    <div className="relative flex h-[280px] items-center justify-center">
      <motion.div
        className="absolute h-48 w-48 rounded-full bg-gradient-to-br from-[#FFEDD5] via-[#FDE68A] to-[#BFDBFE] blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.95, 0.7] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {[
        { top: '12%', left: '18%', delay: 0 },
        { top: '18%', right: '18%', delay: 0.3 },
        { bottom: '18%', left: '22%', delay: 0.45 },
        { bottom: '14%', right: '22%', delay: 0.2 },
      ].map((particle, index) => (
        <motion.div
          key={index}
          className="absolute text-[#FF7A00]"
          style={particle}
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0], opacity: [0.55, 1, 0.55] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        >
          <Sparkles className="h-6 w-6" />
        </motion.div>
      ))}

      <motion.div
        className="relative rounded-[2.25rem] border border-white/70 bg-white/88 px-8 py-8 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#16A34A] to-[#22C55E] text-white shadow-[0_18px_40px_rgba(34,197,94,0.32)]"
            animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CheckCheck className="h-10 w-10" />
          </motion.div>

          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
              Successful Order
            </p>
            <p className="text-2xl font-black tracking-tight text-slate-950">
              Order Confirmed
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
