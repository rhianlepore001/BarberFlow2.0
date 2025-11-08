import React from 'react';
import { motion } from 'framer-motion';

interface WeekSelectorProps {
    weekOffset: number;
    setWeekOffset: (offset: number) => void;
    currentWeekLabel: string;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ weekOffset, setWeekOffset, currentWeekLabel }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-card-dark p-2 rounded-xl mb-4"
        >
            <button 
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-2 text-text-secondary-dark hover:text-white transition-colors"
                aria-label="Semana Anterior"
            >
                <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h3 className="text-sm font-bold text-white text-center">{currentWeekLabel}</h3>
            <button 
                onClick={() => setWeekOffset(weekOffset + 1)}
                className={`p-2 transition-colors ${weekOffset >= 0 ? 'text-text-secondary-dark hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                aria-label="Próxima Semana"
                disabled={weekOffset >= 0}
            >
                <span className="material-symbols-outlined">chevron_right</span>
            </button>
        </motion.div>
    );
};

export default WeekSelector;