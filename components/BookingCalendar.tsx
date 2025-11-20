import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, Appointment, User } from '../types';
import { useTheme } from '../hooks/useTheme';

interface BookingCalendarProps {
    selectedBarber: TeamMember;
    selectedServices: Service[];
    totalDuration: number;
    onTimeSelect: (date: Date, time: string) => void;
    onBack: () => void;
    theme: ReturnType<typeof useTheme>;
    user: User;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MINUTE_INTERVAL = 30;

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
};

const BookingCalendar: React.FC<BookingCalendarProps> = ({ selectedBarber, totalDuration, onTimeSelect, onBack, theme, user }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [settings, setSettings] = useState<{ start_time: string, end_time: string, open_days: string[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const shopId = selectedBarber.shop_id;
    const dayMap: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };

    const currentWeekStart = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() + weekOffset * 7);
        return getStartOfWeek(date);
    }, [weekOffset]);

    const weekDays = useMemo(() => {
        return Array(7).fill(null).map((_, i) => {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            return date;
        });
    }, [currentWeekStart]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            const [settingsRes, appointmentsRes] = await Promise.all([
                supabase.from('shop_settings').select('start_time, end_time, open_days').eq('tenant_id', shopId).limit(1).single(),
                supabase.from('appointments').select('startTime:start_time, duration_minutes').eq('professional_id', selectedBarber.id).gte('start_time', currentWeekStart.toISOString()).lte('start_time', new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1).toISOString())
            ]);

            if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
                setError("Erro ao carregar configurações da loja.");
            } else {
                setSettings(settingsRes.data || { start_time: '09:00', end_time: '20:00', open_days: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] });
            }

            if (appointmentsRes.error) {
                setError("Erro ao carregar agendamentos.");
            } else {
                setAppointments(appointmentsRes.data as Appointment[]);
            }

            setLoading(false);
        };
        fetchData();
    }, [shopId, selectedBarber.id, currentWeekStart]);

    useEffect(() => {
        if (settings && !loading) {
            const today = new Date();
            if (weekOffset === 0 && settings.open_days.includes(dayMap[today.getDay()])) {
                setSelectedDate(today);
            } else {
                const firstOpenDay = weekDays.find(day => settings.open_days.includes(dayMap[day.getDay()]));
                if (firstOpenDay) setSelectedDate(firstOpenDay);
            }
        }
    }, [settings, loading, weekOffset, weekDays]);

    const allPossibleSlots = useMemo(() => {
        if (!settings || totalDuration === 0 || !selectedDate) return [];
        const selectedDayStr = dayMap[selectedDate.getDay()];
        if (!settings.open_days.includes(selectedDayStr)) return [];
        
        const [startHour, startMinute] = settings.start_time.split(':').map(Number);
        const [endHour, endMinute] = settings.end_time.split(':').map(Number);
        const workStartMinutes = startHour * 60 + startMinute;
        const workEndMinutes = endHour * 60 + endMinute;
        
        const slots: string[] = [];
        for (let m = workStartMinutes; m < workEndMinutes; m += MINUTE_INTERVAL) {
            if (m + totalDuration <= workEndMinutes) {
                const hour = Math.floor(m / 60);
                const minute = m % 60;
                slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
            }
        }
        return slots;
    }, [selectedDate, settings, totalDuration]);

    const appointmentsForSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        const selectedDateStr = selectedDate.toDateString();
        return appointments.filter(a => new Date(a.startTime).toDateString() === selectedDateStr);
    }, [selectedDate, appointments]);

    const getSlotStatus = (time: string): 'available' | 'past' | 'conflict' => {
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [slotHour, slotMinute] = time.split(':').map(Number);
        const newApptStart = slotHour * 60 + slotMinute;
        const newApptEnd = newApptStart + totalDuration;

        if (isToday && newApptStart < currentMinutes) {
            return 'past';
        }

        const hasConflict = appointmentsForSelectedDay.some(existingAppt => {
            const existingApptDate = new Date(existingAppt.startTime);
            const existingApptStart = existingApptDate.getHours() * 60 + existingApptDate.getMinutes();
            const existingApptEnd = existingApptStart + existingAppt.duration_minutes;
            
            return newApptStart < existingApptEnd && newApptEnd > existingApptStart;
        });

        return hasConflict ? 'conflict' : 'available';
    };

    if (loading) return <div className="text-center p-8 text-text-secondary-dark">Carregando agenda...</div>;
    if (error) return <div className="text-center p-8 text-red-400">{error}</div>;
    
    const isDayOpen = settings?.open_days.includes(dayMap[selectedDate.getDay()]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-lg font-bold text-white">2. Data e Hora</h2>
            
            <div className="flex items-center justify-between bg-background-dark p-2 rounded-xl">
                <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-text-secondary-dark hover:text-white transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-sm font-bold text-white text-center">
                    {currentWeekStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 text-text-secondary-dark hover:text-white transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
            
            <div className="flex justify-between items-center bg-background-dark p-1 rounded-xl">
                {weekDays.map((day, index) => {
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const isOpen = settings?.open_days.includes(dayMap[day.getDay()]);
                    const isPast = day < new Date() && day.toDateString() !== new Date().toDateString();

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
                            
                            let buttonClasses = 'py-2 rounded-full font-bold transition-colors border-2';
                            if (isAvailable) {
                                buttonClasses += ` bg-green-600 text-white hover:bg-green-700 border-green-700`;
                            } else if (status === 'conflict') {
                                buttonClasses += ' bg-red-900/50 text-red-400 border-red-900/80 cursor-not-allowed opacity-70';
                            } else { // past
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

            <button onClick={onBack} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white hover:bg-gray-600 transition-colors">
                Voltar
            </button>
        </motion.div>
    );
};

export default BookingCalendar;