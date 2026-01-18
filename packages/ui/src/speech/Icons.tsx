import React from 'react';
import { motion } from 'framer-motion';

export const ChromeIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#chrome-gradient)" />
    <path d="M24 14C18.477 14 14 18.477 14 24H24V14Z" fill="#EA4335" />
    <path d="M24 14L32.66 18.66L24 24V14Z" fill="#FBBC05" />
    <path d="M32.66 18.66L24 24L28.33 32.66L32.66 18.66Z" fill="#FBBC05" />
    <path d="M28.33 32.66L24 24H14L19.67 32.66H28.33Z" fill="#34A853" />
    <path d="M14 24L19.67 32.66L24 24H14Z" fill="#34A853" />
    <path d="M24 24L19.67 32.66L24 34L28.33 32.66L24 24Z" fill="#4285F4" />
    <circle cx="24" cy="24" r="8" fill="white" />
    <circle cx="24" cy="24" r="6" fill="url(#chrome-center)" />
    <defs>
      <radialGradient id="chrome-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 24) rotate(90) scale(20)">
        <stop stopColor="#fff" stopOpacity="0.2" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="chrome-center" x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4" />
        <stop offset="1" stopColor="#1a73e8" />
      </linearGradient>
    </defs>
  </svg>
);

interface WaveformIconProps {
  isLight?: boolean;
}

export const WaveformIcon: React.FC<WaveformIconProps> = ({ isLight = false }) => {
  const bars = [
    { height: 8, delay: 0 },
    { height: 16, delay: 0.1 },
    { height: 24, delay: 0.2 },
    { height: 20, delay: 0.15 },
    { height: 28, delay: 0.25 },
    { height: 20, delay: 0.15 },
    { height: 24, delay: 0.2 },
    { height: 16, delay: 0.1 },
    { height: 8, delay: 0 },
  ];

  return (
    <div className="flex items-center gap-[3px] h-full">
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${isLight ? 'bg-zinc-800' : 'bg-white'}`}
          animate={{
            height: [bar.height * 0.4, bar.height, bar.height * 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: bar.delay,
            ease: "easeInOut",
          }}
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  );
};
