import React from 'react';
import { Home, ChevronLeft } from 'lucide-react';

interface FloatingDockProps {
  onHome: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

const FloatingDock: React.FC<FloatingDockProps> = ({ onHome, onBack, showBack }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 pointer-events-none">
      {/* Navigation Capsule */}
      <div className="pointer-events-auto flex items-center p-1.5 rounded-full bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-colors duration-500">
        
        {showBack && onBack && (
          <button 
            onClick={onBack} 
            className="w-12 h-12 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all active:scale-95"
            title="Назад"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <button 
          onClick={onHome} 
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-95 ${!showBack ? 'mx-1' : ''} text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white`}
          title="На главную"
        >
          <Home size={22} />
        </button>

      </div>
    </div>
  );
};

export default FloatingDock;