import React from 'react';

interface NakeicLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  showSubtitle?: boolean;
}

export const NakeicLogo: React.FC<NakeicLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  showSubtitle = true
}) => {
  // Substantially larger, commanding sizes (as requested: "el logo quiero que sea mas grande")
  const sizeMap = {
    xs: 'w-14 h-14', // 56px
    sm: 'w-16 h-16', // 64px
    md: 'w-24 h-24', // 96px
    lg: 'w-36 h-36', // 144px
    xl: 'w-48 h-48'  // 192px
  };

  const imageSrc = '/nakeic_logo.jpg';

  if (variant === 'icon') {
    return (
      <div className={`relative shrink-0 ${sizeMap[size]} ${className} group`}>
        {/* Ambient neon backglow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/40 via-blue-600/30 to-purple-600/40 blur-md opacity-80 group-hover:opacity-100 transition-opacity" />
        
        <img
          src={imageSrc}
          alt="NAKEIC Logo - Conecta Sin Límites"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/pwa-192x192.png';
          }}
          className="relative w-full h-full object-cover rounded-2xl shadow-xl ring-2 ring-cyan-400/50"
        />
      </div>
    );
  }

  // Full presentation badge with large untouched logo and rich visual styling
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className={`relative ${sizeMap[size]} transition-transform duration-300 hover:scale-105 group`}>
        {/* Multi-layered neon glow behind the logo */}
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-blue-600/40 via-cyan-400/30 to-purple-600/40 blur-xl opacity-90 group-hover:opacity-100 transition-opacity" />
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 opacity-30 blur-sm" />
        
        <img
          src={imageSrc}
          alt="NAKEIC - Conecta Sin Límites"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/pwa-512x512.png';
          }}
          className="relative w-full h-full object-contain rounded-3xl shadow-2xl ring-2 ring-cyan-400/40 bg-slate-900/60 p-1"
        />
      </div>
    </div>
  );
};
