import React from 'react';

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
  const barColor = isLight ? 'bg-zinc-600' : 'bg-white';
  return (
    <div className="flex items-center gap-[2px] h-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${barColor} animate-pulse`}
          style={{
            height: `${8 + Math.random() * 12}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};
