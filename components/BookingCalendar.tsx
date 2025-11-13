import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, Appointment } from '../types';
import { useTheme } from '../hooks/useTheme';

interface BookingCalendarProps {
    selectedBarber: TeamMember; // Alterado de 'barber' para 'selectedBarber'
    selectedServices: Service[];
    totalDuration: number;
    onTimeSelect: (date: Date, time: string) => void;
    onBack: () => void;
    theme: ReturnType<typeof useTheme>;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MINUTE_INTERVAL = 30; // Intervalo de agendamento

// Helper para obter o início da semana (Domingo)
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
};

const BookingCalendar: React.FC<BookingCalendarProps> = ({ selectedBarber, totalDuration, onTimeSelect, onBack, theme }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [settings, setSettings] = useState<{ start_time: string, end_time: string, open_days: string[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const shopId = selectedBarber.shop_id; // Pega o shopId do barbeiro selecionado
    
    // Mapeamento de dias da semana (0=Dom, 6=Sáb) para strings do BD
    const dayMap: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };

    // Calcula a semana atual
    const currentWeekStart = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() + weekOffset * 7);
        return getStartOfWeek(date);
    }, [weekOffset]);
    
    // Gera os 7 dias da semana
    const weekDays = useMemo(() => {
        return Array(7).fill(null).map((_, i) => {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            return date;
        });
    }, [currentWeekStart]);

    // --- Fetch Data (Settings and Appointments) ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            // 1. Fetch Shop Settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('shop_settings')
                .select('start_time, end_time, open_days')
                .eq('shop_id', shopId)
                .limit(1)
                .single();
            
            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error("Error fetching shop settings:", settingsError);
                setError("Erro ao carregar configurações da barbearia.");
                setLoading(false);
                return;
            }
            setSettings(settingsData || { start_time: '09:00', end_time: '20:00', open_days: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] });

            // 2. Fetch Appointments for the entire week
            const startOfWeekISO = currentWeekStart.toISOString();
            const endOfWeek = new Date(currentWeekStart);
            endOfWeek.setDate(currentWeekStart.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            const endOfWeekISO = endOfWeek.toISOString();

            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select('*')
                .eq('barber_id', selectedBarber.id) // Filtra apenas os agendamentos deste barbeiro
                .gte('start_time', startOfWeekISO)
                .lte('start_time', endOfWeekISO)
                .order('start_time');

            if (appointmentsError) {
                console.error("Error fetching appointments:", appointmentsError);
                setError("Erro ao carregar agendamentos.");
            } else {
                setAppointments(appointmentsData as Appointment[]);
            }

            setLoading(false);
        };
        fetchData();
    }, [shopId, selectedBarber.id, currentWeekStart]); // Depende de selectedBarber.id e shopId
    
    // Define o dia selecionado como o primeiro dia aberto da semana atual
    useEffect(() => {
        if (settings && !loading) {
            const today = new Date();
            
            // Se a semana atual for a de hoje (offset 0), tentamos selecionar hoje ou o próximo dia aberto
            if (weekOffset === 0) {
                const todayIndex = today.getDay();
                const todayDayStr = dayMap[todayIndex];
                
                if (settings.open_days.includes(todayDayStr)) {
                    // Se hoje está aberto, seleciona hoje
                    setSelectedDate(today);
                } else {
                    // Se hoje está fechado, procura o próximo dia aberto
                    let nextOpenDay = new Date(today);
                    for (let i = 1; i <= 7; i++) {
                        nextOpenDay.setDate(today.getDate() + i);
                        const nextDayIndex = nextOpenDay.getDay();
                        const nextDayStr = dayMap[nextDayIndex];
                        if (settings.open_days.includes(nextDayStr)) {
                            setSelectedDate(nextOpenDay);
                            break;
                        }
                    }
                }
            } else {
                // Se for uma semana futura, seleciona o primeiro dia aberto da semana
                for (let i = 0; i < 7; i++) {
                    const day = weekDays[i];
                    const dayStr = dayMap[day.getDay()];
                    if (settings.open_days.includes(dayStr)) {
                        setSelectedDate(day);
                        break;
                    }
                }
            }
        }
    }, [settings, loading, weekOffset, weekDays]);


    // --- Lógica de Cálculo de Slots Disponíveis (Gerando todos os slots) ---
    const allPossibleSlots = useMemo(() => {
        if (!settings || totalDuration === 0 || !selectedDate) return [];
        
        const selectedDayIndex = selectedDate.getDay();
        const selectedDayStr = dayMap[selectedDayIndex];
        
        if (!settings.open_days.includes(selectedDayStr)) return [];
        
        const [startHour, startMinute] = settings.start_time.split(':').map(Number);
        const [endHour, endMinute] = settings.end_time.split(':').map(Number);
        
        const workStartMinutes = startHour * 60 + startMinute;
        const workEndMinutes = endHour * 60 + endMinute;
        
        const slots: string[] = [];

        // Gera todos os slots de 30 minutos que começam dentro do horário de trabalho
        for (let m = workStartMinutes; m < workEndMinutes; m += MINUTE_INTERVAL) {
            const slotStartMinutes = m;
            const slotEndMinutes = m + totalDuration;

            // Verifica se o slot termina dentro do horário de trabalho
            if (slotEndMinutes > workEndMinutes) continue;
            
            const hour = Math.floor(slotStartMinutes / 60);
            const minute = slotStartMinutes % 60;
            slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }

        return slots;
    }, [selectedDate, settings, totalDuration]);
    
    // 1. Create a timeline of busy minutes for the selected day
    const dayTimeline = useMemo(() => {
        const timeline = new Array(24 * 60).fill(false); // false = free, true = busy
        if (!selectedDate) return timeline;

        appointments
            .filter(a => new Date(a.startTime).toDateString() === selectedDate.toDateString())
            .forEach(a => {
                const apptDate = new Date(a.startTime);
                const start = apptDate.getHours() * 60 + apptDate.getMinutes();
                const end = start + a.duration_minutes;
                
                for (let i = start; i < end; i++) {
                    if (i < timeline.length) {
                        timeline[i] = true;
                    }
                }
            });
        return timeline;
    }, [selectedDate, appointments]);
    
    // 2. Function to check if a specific slot is available
    const getSlotStatus = (time: string): 'available' | 'past' | 'conflict' => {
        const [slotHour, slotMinute] = time.split(':').map(Number);
        const slotStartMinutes = slotHour * 60 + slotMinute;
        const slotEndMinutes = slotStartMinutes + totalDuration;
        
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Check if slot is in the past
        if (isToday && slotStartMinutes < currentMinutes) {
            return 'past';
        }

        // Check for conflict using the timeline
        for (let i = slotStartMinutes; i < slotEndMinutes; i++) {
            if (dayTimeline[i]) {
                return 'conflict';
            }
        }
        
        return 'available';
    };


    if (loading) {
        return <div className="text-center p-8 text-text-secondary-dark">Carregando agenda...</div>;
    }
    
    if (error) {
        return <div className="text-center p-8 text-red-400">{error}</div>;
    }
    
    const isDayOpen = settings?.open_days.includes(dayMap[selectedDate.getDay()]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-lg font-bold text-white">2. Data e Hora</h2>
            
            {/* Week Selector */}
            <div className="flex items-center justify-between bg-background-dark p-2 rounded-xl">
                <button 
                    onClick={() => setWeekOffset(weekOffset - 1)}
                    className="p-2 text-text-secondary-dark hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-sm font-bold text-white text-center">
                    {currentWeekStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <button 
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    className="p-2 text-text-secondary-dark hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
            
            {/* Day Selector */}
            <div className="flex justify-between items-center bg-background-dark p-1 rounded-xl">
                {weekDays.map((day, index) => {
                    const dayStr = dayMap[day.getDay()];
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const isOpen = settings?.open_days.includes(dayStr);
                    
                    // Verifica se o dia está no passado (apenas se não for hoje)
                    const isPast = day < new Date() && !isToday;

                    return (
                        <button 
                            key={index}
                            onClick={() => setSelectedDate(day)}
                            disabled={!isOpen || isPast}
                            className={`relative w-full flex flex-col items-center text-sm font-bold py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                isSelected ? 'text-background-dark' : 'text-text-secondary-dark hover:bg-card-dark'
                            }`}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="day-selector-active-public"
                                    className={`absolute inset-0 ${theme.bgPrimary} rounded-lg z-0`}
                                />
                            )}
                            <span className="relative z-10 text-xs">{DAY_LABELS[day.getDay()]}</span>
                            <span className="relative z-10 text-sm font-extrabold">{day.getDate()}</span>
                            {!isOpen && <span className="absolute inset-0 bg-black/50 rounded-lg z-20"></span>}
                        </button>
                    );
                })}
            </div>
            
            {/* Time Slots */}
            <div className="space-y-3">
                <p className="text-sm font-medium text-text-secondary-dark">Horários disponíveis em {selectedDate.toLocaleDateString('pt-BR')}:</p>
                
                {!isDayOpen ? (
                    <p className="text-center text-red-400 font-semibold">Fechado neste dia.</p>
                ) : allPossibleSlots.length === 0 ? (
                    <p className="text-center text-text-secondary-dark">Nenhum horário disponível para {totalDuration} min.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
                        {allPossibleSlots.map(time => {
                            const status = getSlotStatus(time);
                            const isAvailable = status === 'available';
                            const isConflict = status === 'conflict';
                            const isPast = status === 'past';
                            
                            let buttonClasses = 'py-2 rounded-full font-bold transition-colors border-2';
                            
                            if (isAvailable) {
                                buttonClasses += ` ${theme.bgPrimary} text-background-dark hover:${theme.bgPrimary}/80`;
                            } else if (isConflict) {
                                buttonClasses += ' bg-red-900/50 text-red-400 border-red-900/80 cursor-not-allowed opacity-70';
                            } else if (isPast) {
                                buttonClasses += ' bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50';
                            }

                            return (
                                <button
                                    key={time}
                                    onClick={() => isAvailable && onTimeSelect(selectedDate, time)}
                                    disabled={!isAvailable}
                                    className={buttonClasses}
                                >
                                    {time}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <button 
                onClick={onBack}
                className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white hover:bg-gray-600 transition-colors"
            >
                Voltar
            </button>
        </motion.div>
    );
};

export default BookingCalendar;