import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface IconProps {
  className?: string;
}

export const ChromeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" fill="currentColor"/>
  </svg>
);

interface WaveformIconProps {
  isLight?: boolean;
}

export const WaveformIcon: React.FC<WaveformIconProps> = ({ isLight = false }) => {
  const [heights, setHeights] = useState<number[]>([12, 18, 14, 20, 16, 22, 15]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => 8 + Math.random() * 16));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-[3px] h-6">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: h }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 15,
            mass: 0.5
          }}
          className={`w-[3px] rounded-full ${
            isLight 
              ? 'bg-gradient-to-t from-zinc-700 via-zinc-500 to-zinc-400' 
              : 'bg-gradient-to-t from-white/60 via-white to-white/60'
          }`}
          style={{
            boxShadow: isLight 
              ? '0 0 4px rgba(0,0,0,0.1)' 
              : '0 0 6px rgba(255,255,255,0.3)'
          }}
        />
      ))}
    </div>
  );
};
