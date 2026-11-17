import React from 'react';
import { X, Lock, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Message } from '../../types';

interface ViewOnceMediaModalProps {
  message: Message | null;
  onClose: () => void;
}

export const ViewOnceMediaModal: React.FC<ViewOnceMediaModalProps> = ({
  message,
  onClose
}) => {
  const { openViewOnce } = useApp();

  if (!message || !message.mediaUrl) return null;

  const handleClose = () => {
    // Mark as viewed once
    openViewOnce(message.conversationId, message.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="px-4 py-3 bg-black/80 flex items-center justify-between border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
            ①
          </div>
          <div>
            <p className="text-xs font-bold text-white">Foto de visualización única</p>
            <p className="text-[10px] text-slate-400">Esta foto desaparecerá al salir</p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 text-white cursor-pointer transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative select-none">
        <img
          src={message.mediaUrl}
          alt="Visualización única"
          className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl"
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      {/* Footer warning */}
      <div className="p-4 bg-black/90 flex items-center justify-center gap-2 text-xs text-amber-300/90 border-t border-white/10">
        <Lock className="w-4 h-4" />
        <span>Para mayor privacidad, esta foto no se guarda en la galería y solo se puede ver una vez.</span>
      </div>
    </div>
  );
};
