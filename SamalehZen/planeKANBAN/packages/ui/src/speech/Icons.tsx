import React from 'react';

interface IconProps {
  className?: string;
}

export const ChromeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-blue-500"/>
    <circle cx="12" cy="12" r="4" fill="currentColor" className="text-blue-500"/>
    <path d="M12 2C6.48 2 2 6.48 2 12h10" stroke="currentColor" strokeWidth="1.5" className="text-green-500"/>
    <path d="M22 12c0-5.52-4.48-10-10-10" stroke="currentColor" strokeWidth="1.5" className="text-red-500"/>
    <path d="M12 22c5.52 0 10-4.48 10-10" stroke="currentColor" strokeWidth="1.5" className="text-yellow-500"/>
  </svg>
);

interface WaveformIconProps {
  isLight?: boolean;
}

export const WaveformIcon: React.FC<WaveformIconProps> = ({ isLight = false }) => {
  const barColor = isLight ? 'bg-zinc-600' : 'bg-white';
  
  return (
    <div className="flex items-center gap-[3px] h-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${barColor}`}
          style={{
            height: `${12 + Math.random() * 16}px`,
            animation: `waveform 0.5s ease-in-out ${i * 0.1}s infinite alternate`
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
