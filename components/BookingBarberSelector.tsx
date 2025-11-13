import React from 'react';
import { motion } from 'framer-motion';
import type { TeamMember } from '../types';
import { useTheme } from '../hooks/useTheme';

interface BookingBarberSelectorProps {
    teamMembers: TeamMember[];
    onSelectBarber: (barber: TeamMember) => void;
    theme: ReturnType<typeof useTheme>;
}

const BookingBarberSelector: React.FC<BookingBarberSelectorProps> = ({ teamMembers, onSelectBarber, theme }) => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold text-white">1. Escolha o Profissional</h2>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {teamMembers.length === 0 ? (
                    <p className="text-center text-text-secondary-dark py-4">Nenhum profissional disponível para agendamento.</p>
                ) : (
                    teamMembers.map(member => (
                        <button 
                            key={member.id} 
                            onClick={() => onSelectBarber(member)}
                            className={`flex items-center w-full p-3 rounded-xl cursor-pointer transition-colors border-2 border-card-dark bg-background-dark/50 hover:bg-background-dark`}
                        >
                            <img src={member.image_url} alt={member.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                            <div>
                                <p className="font-semibold text-white text-left">{member.name}</p>
                                <p className="text-xs text-text-secondary-dark text-left">{member.role}</p>
                            </div>
                            <span className={`material-symbols-outlined ml-auto ${theme.primary}`}>chevron_right</span>
                        </button>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default BookingBarberSelector;