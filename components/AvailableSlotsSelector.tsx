import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Appointment } from '../types';
import { useTheme } from '../hooks/useTheme';

interface AvailableSlotsSelectorProps {
    barberId: number;
    requiredDuration: number; // Duração total dos serviços selecionados
    onSelectSlot: (date: string, time: string) => void;
    selectedDate: string;
    selectedTime: string;
}

const TIME_STEP = 30; // Intervalo de 30 minutos

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
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [settings, setSettings] = useState<{ start_time: string, end_time: string, open_days: string[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
    const theme = useTheme(null); // Tema estático

    // Fallbacks
    const DEFAULT_START_HOUR = 9;
    const DEFAULT_END_HOUR = 18;
    const DEFAULT_OPEN_DAYS = ["seg", "ter", "qua", "qui", "sex", "sab"]; // Seg a Sáb

    const startHour = settings?.start_time ? parseInt(settings.start_time.split(':')[0]) : DEFAULT_START_HOUR;
    const endHour = settings?.end_time ? parseInt(settings.end_time.split(':')[0]) : DEFAULT_END_HOUR;
    const openDays = settings?.open_days && settings.open_days.length > 0 ? settings.open_days : DEFAULT_OPEN_DAYS;
    
    const dayLabels = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

    // 1. Fetch Settings and Appointments for the selected date
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            // 1. Fetch Shop ID
            const { data: memberData } = await supabase.from('team_members').select('shop_id').eq('id', barberId).single();
            const shopId = memberData?.shop_id;
            
            if (!shopId) {
                setLoading(false);
                return;
            }

            // 2. Fetch Shop Settings (only once)
            if (!settings) {
                const { data: settingsData } = await supabase
                    .from('shop_settings')
                    .select('start_time, end_time, open_days')
                    .eq('shop_id', shopId)
                    .limit(1)
                    .single();
                
                if (settingsData) {
                    setSettings(settingsData);
                }
            }

            // 3. Fetch Appointments for the selected day
            const dayStartISO = currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
            const dayEndISO = currentDate.toISOString().split('T')[0] + 'T23:59:59.999Z';

            const { data: appointmentsData } = await supabase
                .from('appointments')
                .select('start_time, duration_minutes')
                .eq('barber_id', barberId)
                .gte('start_time', dayStartISO)
                .lte('start_time', dayEndISO);

            if (appointmentsData) {
                setAppointments(appointmentsData as unknown as Appointment[]);
            }
            
            setLoading(false);
        };
        fetchData();
    }, [barberId, currentDate.toDateString()]); // Recarrega ao mudar o dia

    // 2. Calculate Available Slots
    const availableSlots = useMemo(() => {
        if (loading) return [];

        const slots: { time: string; isAvailable: boolean; isPast: boolean }[] = [];
        const selectedDayIndex = currentDate.getDay(); // 0=Sun, 6=Sat
        const selectedDayLabel = dayLabels[selectedDayIndex];
        
        // Verifica se a barbearia está aberta neste dia
        if (!openDays.includes(selectedDayLabel)) {
            return [];
        }

        const today = new Date();
        const isCurrentDay = currentDate.toDateString() === today.toDateString();
        
        // Mapeia agendamentos existentes para intervalos de tempo (em milissegundos)
        const occupiedIntervals = appointments.map(appt => {
            const apptStart = new Date(appt.startTime).getTime();
            const apptEnd = apptStart + appt.duration_minutes * 60000;
            return { start: apptStart, end: apptEnd };
        });

        // Gera todos os slots possíveis (a cada 30 minutos)
        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += TIME_STEP) {
                const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                
                const slotStart = new Date(currentDate);
                slotStart.setHours(h, m, 0, 0);
                const slotStartMs = slotStart.getTime();
                
                const slotEndMs = slotStartMs + requiredDuration * 60000;
                
                // Verifica se o slot já passou
                const isPast = isCurrentDay && slotStartMs < today.getTime();
                
                // Verifica se o slot de término ultrapassa o horário de fechamento
                const endHourLimit = new Date(currentDate);
                endHourLimit.setHours(endHour, 0, 0, 0);
                if (slotEndMs > endHourLimit.getTime()) continue;

                let isConflict = false;
                
                // Verifica conflito com agendamentos existentes
                for (const interval of occupiedIntervals) {
                    // Conflito se: (Novo.start < Existente.end) AND (Novo.end > Existente.start)
                    if (
                        (slotStartMs < interval.end) &&
                        (slotEndMs > interval.start)
                    ) {
                        isConflict = true;
                        break;
                    }
                }

                slots.push({
                    time: slotTime,
                    isAvailable: !isConflict && !isPast,
                    isPast: isPast
                });
            }
        }
        
        return slots;
    }, [currentDate, appointments, requiredDuration, startHour, endHour, openDays, loading]);
    
    // 3. Date Selector Logic
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
        // Garante que não podemos selecionar datas passadas
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
    
    // Verifica se a semana anterior é passada
    const isPrevWeekDisabled = getStartOfWeek(currentDate).getTime() <= getStartOfWeek(new Date()).getTime();

    return (
        <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between px-2">
                <button 
                    onClick={() => handleWeekChange(-1)}
                    disabled={isPrevWeekDisabled}
                    className={`p-2 transition-colors ${isPrevWeekDisabled ? 'text-gray-600 cursor-not-allowed' : 'text-text-secondary-dark hover:text-white'}`}
                    aria-label="Semana Anterior"
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-lg font-bold text-white capitalize">{currentMonthYear}</h3>
                <button 
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
                    
                    // Desabilita dias passados
                    const isPastDay = date < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    // Verifica se o dia está aberto
                    const isOpen = openDays.includes(dayLabels[date.getDay()]);

                    return (
                        <button 
                            type="button"
                            key={index}
                            onClick={() => handleDateChange(date)}
                            disabled={isPastDay || !isOpen}
                            className={`relative w-full flex flex-col items-center text-sm font-bold py-2 rounded-lg transition-colors 
                                ${isPastDay || !isOpen ? 'text-gray-600 cursor-not-allowed' : isSelected ? 'text-background-dark' : 'text-text-secondary-dark hover:bg-gray-700/50'}`}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="day-selector-active-public"
                                    className={`absolute inset-0 ${theme.bgPrimary} rounded-lg z-0`}
                                />
                            )}
                            <span className={`relative z-10 text-xs ${isToday && !isSelected && isOpen ? theme.primary : ''}`}>{dayLabel}</span>
                            <span className="relative z-10 text-sm font-extrabold">{dateLabel}</span>
                        </button>
                    );
                })}
            </div>
            
            {/* Slots Grid */}
            <div className="pt-4">
                <h4 className="text-lg font-bold text-white mb-3">Horários Disponíveis ({requiredDuration} min)</h4>
                
                {loading ? (
                    <div className="text-center text-text-secondary-dark">Carregando horários...</div>
                ) : availableSlots.length === 0 ? (
                    <div className="text-center text-text-secondary-dark">
                        {!openDays.includes(dayLabels[currentDate.getDay()]) 
                            ? 'Barbearia fechada neste dia.' 
                            : 'Nenhum horário disponível para esta duração.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                        {availableSlots.map(slot => (
                            <button
                                type="button"
                                key={slot.time}
                                onClick={() => handleSlotClick(slot.time)}
                                disabled={!slot.isAvailable}
                                className={`py-2 rounded-lg font-semibold transition-colors text-sm 
                                    ${slot.isAvailable 
                                        ? (slot.time === selectedTime ? `${theme.bgPrimary} text-background-dark` : 'bg-card-dark text-white hover:bg-gray-700')
                                        : 'bg-card-dark/50 text-text-secondary-dark/50 cursor-not-allowed'
                                    }`}
                            >
                                {slot.time}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailableSlotsSelector;