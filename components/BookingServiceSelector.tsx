import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Service, User } from '../types'; // Importa User
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils'; // Importa formatCurrency

interface BookingServiceSelectorProps {
    services: Service[];
    onNext: (services: Service[]) => void;
    theme: ReturnType<typeof useTheme>;
    user: User; // Adiciona user
}

const BookingServiceSelector: React.FC<BookingServiceSelectorProps> = ({ services, onNext, theme, user }) => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    
    const handleToggle = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };
    
    const selectedServices = useMemo(() => {
        return services.filter(s => selectedIds.includes(s.id));
    }, [selectedIds, services]);
    
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    const isNextDisabled = selectedIds.length === 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-bold text-white">1. Escolha o Serviço</h2>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {services.map(service => (
                    <div 
                        key={service.id} 
                        onClick={() => handleToggle(service.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border-2 ${
                            selectedIds.includes(service.id) 
                                ? `${theme.borderPrimary} bg-background-dark` 
                                : 'border-card-dark bg-background-dark/50 hover:bg-background-dark'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined ${selectedIds.includes(service.id) ? theme.primary : 'text-text-secondary-dark'}`}>
                                {selectedIds.includes(service.id) ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <div>
                                <p className="font-semibold text-white">{service.name}</p>
                                <p className="text-xs text-text-secondary-dark">{service.duration_minutes} min</p>
                            </div>
                        </div>
                        <p className={`font-bold ${theme.primary}`}>{formatCurrency(service.price, user.currency)}</p> {/* Usa user.currency */}
                    </div>
                ))}
            </div>
            
            <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between text-sm font-medium text-text-secondary-dark mb-2">
                    <span>Duração Total:</span>
                    <span className="font-bold text-white">{totalDuration} min</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className={theme.primary}>{formatCurrency(totalPrice, user.currency)}</span> {/* Usa user.currency */}
                </div>
            </div>

            <button 
                onClick={() => onNext(selectedServices)}
                disabled={isNextDisabled}
                className={`w-full ${theme.bgPrimary} text-background-dark font-bold py-3 rounded-full transition-colors disabled:opacity-50`}
            >
                Próximo (Data e Hora)
            </button>
        </motion.div>
    );
};

export default BookingServiceSelector;