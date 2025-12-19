import React, { useRef, useEffect } from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  toggleState: () => void;
  onPhotosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  visionEnabled: boolean;
  toggleVision: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ 
  treeState, 
  toggleState, 
  onPhotosUpload,
  visionEnabled,
  toggleVision
}) => {
  const isTree = treeState === TreeState.TREE_SHAPE;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMemoriesClick = () => {
    fileInputRef.current?.click();
  };

  // Sync DOM visibility with prop
  useEffect(() => {
    const container = document.getElementById('webcam-container');
    if (container) {
      if (visionEnabled) {
        container.classList.add('visible');
      } else {
        container.classList.remove('visible');
      }
    }
  }, [visionEnabled]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0 z-10 text-[#E5E4E2]">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={onPhotosUpload}
      />

      {/* Header - Top Left - Branding Updated */}
      <header className="absolute top-[30px] left-[40px] animate-fade-in-down pointer-events-auto select-none">
        <div className="flex flex-col items-start">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E6D2B5] via-[#FFD700] to-[#E6D2B5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wide leading-tight">
            Merry Christmas 2025
          </h1>
          <h2 className="text-xs md:text-sm font-sans tracking-[0.3em] uppercase text-[#E6D2B5] opacity-80 mt-1 pl-1">
            ShenXingHui Paintings
          </h2>
        </div>
      </header>

      {/* Main Interaction - Bottom Right */}
      <div className="absolute bottom-[40px] right-[40px] flex flex-col items-end gap-6 pointer-events-auto upload-wrapper">
        
        {/* Vision Toggle Button */}
        <button
          onClick={toggleVision}
          className={`
            mb-[-10px] px-4 py-2 
            border 
            ${visionEnabled ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' : 'border-[#E6D2B5]/30 text-[#E6D2B5]/50 hover:text-[#E6D2B5]'}
            backdrop-blur-sm transition-all duration-300
            font-sans text-xs tracking-widest uppercase
            rounded-full
          `}
        >
          {visionEnabled ? '👁️ VISION ON' : '👁️ VISION OFF'}
        </button>

        <p className="font-sans text-xs tracking-widest opacity-50 uppercase text-[#C5A3CD] mb-[-10px]">
          {isTree ? 'Interactive Mode: Formed' : 'Interactive Mode: Ethereal'}
        </p>
        
        <button
          onClick={toggleState}
          className={`
            group relative px-12 py-4 
            border border-[#E6D2B5]/50 
            bg-black/30 backdrop-blur-sm
            transition-all duration-700 ease-out
            hover:bg-[#E6D2B5]/10 hover:border-[#E6D2B5]
            overflow-hidden
          `}
        >
          {/* Animated Background Fill */}
          <div className={`
            absolute inset-0 bg-[#E6D2B5] origin-left transition-transform duration-700 ease-out
            ${isTree ? 'scale-x-100 opacity-10' : 'scale-x-0'}
          `} />
          
          <span className="relative z-10 font-serif text-lg md:text-xl tracking-widest text-[#E6D2B5] group-hover:text-white transition-colors duration-300">
            {isTree ? 'SCATTER MAGIC' : 'ASSEMBLE TREE'}
          </span>
        </button>

        {/* Add Memories Button */}
        <button
          onClick={handleAddMemoriesClick}
          className="text-[#E6D2B5] hover:text-white font-sans text-xs tracking-[0.2em] border-b border-[#E6D2B5]/30 hover:border-white transition-all pb-1"
        >
          + ADD MEMORIES
        </button>
      </div>

      {/* Footer / Copyright - Bottom Left */}
      <div className="absolute bottom-[40px] left-[40px] text-xs font-sans text-white/30 tracking-wider">
        <p>EST. 2025</p>
        <p>LIMITED EDITION</p>
      </div>
    </div>
  );
};