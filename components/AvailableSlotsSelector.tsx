import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

interface AvailableSlotsSelectorProps {
    barberId: number;
    requiredDuration: number; // Duração total dos serviços selecionados
    onSelectSlot: (date: string, time: string) => void;
    selectedDate: string;
    selectedTime: string;
}

// Define a URL da nova Edge Function
const SLOTS_FUNCTION_URL = 'https://avodqajneytxiarbjrcp.supabase.co/functions/v1/get-available-slots';

// Helper para obter o início da semana (Segunda)
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const AvailableSlotsSelector: React.FC<AvailableSlotsSelectorProps> = ({ barberId, requiredDuration, onSelectSlot, selectedDate, selectedTime }) => {
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
    const [fetchError, setFetchError] = useState<string | null>(null);
    const theme = useTheme(null); 

    const dayLabels = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

    // 1. Fetch Slots from Edge Function
    useEffect(() => {
        if (requiredDuration <= 0) {
            setAvailableSlots([]);
            setLoading(false);
            return;
        }
        
        const fetchSlots = async () => {
            setLoading(true);
            setFetchError(null);
            setAvailableSlots([]);
            
            const dateISO = currentDate.toISOString().split('T')[0];

            try {
                const response = await fetch(SLOTS_FUNCTION_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        barberId,
                        requiredDuration,
                        date: dateISO,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    setFetchError(result.error || 'Falha ao buscar horários disponíveis.');
                    setAvailableSlots([]);
                } else {
                    setAvailableSlots(result.slots || []);
                }
            } catch (err) {
                console.error('Network error fetching slots:', err);
                setFetchError('Erro de conexão ao buscar horários.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchSlots();
    }, [barberId, requiredDuration, currentDate.toDateString()]); // Recarrega ao mudar o dia ou duração

    // 2. Date Selector Logic
    const daysInWeek = useMemo(() => {
        const startOfWeek = getStartOfWeek(currentDate);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            days.push(date);
        }
        return days;
    }, [currentDate]);
    
    const handleDateChange = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return;
        
        setCurrentDate(date);
        onSelectSlot(date.toISOString().split('T')[0], ''); // Limpa o horário selecionado
    };
    
    const handleSlotClick = (time: string) => {
        onSelectSlot(currentDate.toISOString().split('T')[0], time);
    };
    
    const handleWeekChange = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + offset * 7);
        setCurrentDate(newDate);
        onSelectSlot(newDate.toISOString().split('T')[0], '');
    };

    const currentMonthYear = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    const isPrevWeekDisabled = getStartOfWeek(currentDate).getTime() <= getStartOfWeek(new Date()).getTime();

    return (
        <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between px-2">
                <button 
                    type="button"
                    onClick={() => handleWeekChange(-1)}
                    disabled={isPrevWeekDisabled}
                    className={`p-2 transition-colors ${isPrevWeekDisabled ? 'text-gray-600 cursor-not-allowed' : 'text-text-secondary-dark hover:text-white'}`}
                    aria-label="Semana Anterior"
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-lg font-bold text-white capitalize">{currentMonthYear}</h3>
                <button 
                    type="button"
                    onClick={() => handleWeekChange(1)}
                    className="p-2 text-text-secondary-dark hover:text-white transition-colors"
                    aria-label="Próxima Semana"
                >
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
            
            {/* Day Selector */}
            <div className="flex justify-between items-center bg-card-dark p-1 rounded-xl">
                {daysInWeek.map((date, index) => {
                    const dayLabel = dayLabels[date.getDay()].toUpperCase();
                    const dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit' });
                    const isSelected = date.toDateString() === currentDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    const isPastDay = date < new Date(new Date().setHours(0, 0, 0, 0));
                    // Não podemos verificar openDays aqui, pois settings é carregado de forma assíncrona.
                    // A Edge Function fará a validação final.

                    return (
                        <button 
                            type="button"
                            key={index}
                            onClick={() => handleDateChange(date)}
                            disabled={isPastDay}
                            className={`relative w-full flex flex-col items-center text-sm font-bold py-2 rounded-lg transition-colors 
                                ${isPastDay ? 'text-gray-600 cursor-not-allowed' : isSelected ? 'text-background-dark' : 'text-text-secondary-dark hover:bg-gray-700/50'}`}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="day-selector-active-public"
                                    className={`absolute inset-0 ${theme.bgPrimary} rounded-lg z-0`}
                                />
                            )}
                            <span className={`relative z-10 text-xs ${isToday && !isSelected ? theme.primary : ''}`}>{dayLabel}</span>
                            <span className="relative z-10 text-sm font-extrabold">{dateLabel}</span>
                        </button>
                    );
                })}
            </div>
            
            {/* Slots Grid */}
            <div className="pt-4">
                <h4 className="text-lg font-bold text-white mb-3">Horários Disponíveis ({requiredDuration} min)</h4>
                
                {fetchError && <p className="text-red-400 text-sm text-center p-2">{fetchError}</p>}
                
                {loading ? (
                    <div className="text-center text-text-secondary-dark">Calculando horários...</div>
                ) : availableSlots.length === 0 ? (
                    <div className="text-center text-text-secondary-dark p-4 bg-card-dark rounded-xl">
                        Nenhum horário disponível para esta duração. Tente outro dia.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                        {availableSlots.map(slot => (
                            <button
                                type="button"
                                key={slot}
                                onClick={() => handleSlotClick(slot)}
                                className={`py-2 rounded-lg font-semibold transition-colors text-sm 
                                    ${slot === selectedTime ? `${theme.bgPrimary} text-background-dark` : 'bg-card-dark text-white hover:bg-gray-700'}
                                `}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailableSlotsSelector;