import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { supabase } from '../lib/supabaseClient'; // Removido
import type { Appointment, TeamMember, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { getMockAppointments, getMockTeamMembers } from '../lib/mockData'; // Importa dados mockados

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getDateForDayIndex = (dayIndex: number, referenceDate: Date): { dayLabel: string, dateLabel: string, fullDate: Date } => {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() + dayIndex);
    const dayLabels = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
    return {
        dayLabel: dayLabels[dayIndex],
        dateLabel: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: date
    };
};

interface DaySelectorProps {
    selectedDay: number;
    setSelectedDay: (day: number) => void;
    weekOffset: number;
    setWeekOffset: (offset: number) => void;
    startOfWeek: Date;
    theme: ReturnType<typeof useTheme>;
}

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDay, setSelectedDay, weekOffset, setWeekOffset, startOfWeek, theme }) => {
    const days = [0, 1, 2, 3, 4, 5];
    const currentMonthYear = startOfWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-text-secondary hover:text-text-primary transition-colors" aria-label="Semana Anterior">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-lg font-bold text-text-primary capitalize">{currentMonthYear}</h3>
                <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 text-text-secondary hover:text-text-primary transition-colors" aria-label="Próxima Semana">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
            <div className="flex justify-between items-center bg-card p-1 rounded-xl">
                {days.map((dayIndex) => {
                    const { dayLabel, dateLabel } = getDateForDayIndex(dayIndex, startOfWeek);
                    return (
                        <button key={dayIndex} onClick={() => setSelectedDay(dayIndex)} className={`relative w-full flex flex-col items-center text-sm font-bold py-2 rounded-lg transition-colors ${selectedDay === dayIndex ? 'text-background' : 'text-text-secondary'}`}>
                            {selectedDay === dayIndex && <motion.div layoutId="day-selector-active" className={`absolute inset-0 ${theme.bgPrimary} rounded-lg z-0`} />}
                            <span className="relative z-10 text-xs">{dayLabel}</span>
                            <span className="relative z-10 text-sm font-extrabold">{dateLabel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const MINUTE_HEIGHT = 2.5;
const HOUR_HEIGHT = MINUTE_HEIGHT * 60;

interface AppointmentCardProps {
    appointment: Appointment;
    onClick: (appointment: Appointment) => void;
    startHour: number;
    theme: ReturnType<typeof useTheme>;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onClick, startHour, theme }) => {
    const clientName = appointment.clients?.name || 'Cliente';
    const services = appointment.services_json || [];
    const serviceNames = services.map(s => s.name).join(', ');
    const displayTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const startMinutes = new Date(appointment.startTime).getHours() * 60 + new Date(appointment.startTime).getMinutes();
    const top = (startMinutes - startHour * 60) * MINUTE_HEIGHT;
    const height = appointment.duration_minutes * MINUTE_HEIGHT - 2;
    
    const isSmallCard = height < 70; 
    const hasSpaceForServices = height > 90;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            layout
            onClick={() => onClick(appointment)}
            className={`absolute w-[98%] p-2 rounded-lg flex flex-col justify-start overflow-hidden bg-card border-l-4 ${theme.borderPrimary} shadow-md cursor-pointer hover:bg-card/80 transition-colors z-10`}
            style={{ top: `${top}px`, height: `${height}px`, left: '1%' }}
        >
            <p className="font-bold text-text-primary text-sm leading-tight truncate">{clientName}</p>
            <div className={`flex items-center gap-1 text-xs font-semibold ${theme.primary} ${isSmallCard ? 'mt-0' : 'mt-auto'}`}>
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>{displayTime} ({appointment.duration_minutes} min)</span>
            </div>
            {hasSpaceForServices && <p className="text-xs text-text-secondary leading-snug line-clamp-2 mt-1">{serviceNames}</p>}
        </motion.div>
    );
};

interface AgendaProps {
    onAppointmentSelect: (appointment: Appointment) => void;
    dataVersion: number;
    initialAppointment: Appointment | null;
    user: User;
}

const Agenda: React.FC<AgendaProps> = ({ onAppointmentSelect, dataVersion, initialAppointment, user }) => {
    const today = new Date();
    const currentDayOfWeek = (today.getDay() + 6) % 7; 
    const initialDay = currentDayOfWeek > 5 ? 0 : currentDayOfWeek;
    
    const [selectedDay, setSelectedDay] = useState(initialDay);
    const [weekOffset, setWeekOffset] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [startHour, setStartHour] = useState(8);
    const [endHour, setEndHour] = useState(20);
    const initialScrollDone = useRef(false);
    const theme = useTheme(user);

    const startOfSelectedWeek = useMemo(() => {
        const date = new Date(); 
        date.setDate(date.getDate() + weekOffset * 7);
        return getStartOfWeek(date);
    }, [weekOffset]);
    
    useEffect(() => {
        if (initialAppointment && !initialScrollDone.current) {
            const apptDate = new Date(initialAppointment.startTime);
            const startOfApptWeek = getStartOfWeek(apptDate);
            const startOfTodayWeek = getStartOfWeek(new Date());
            const diffWeeks = Math.round((startOfApptWeek.getTime() - startOfTodayWeek.getTime()) / (1000 * 60 * 60 * 24 * 7));
            setWeekOffset(diffWeeks);
            const dayIndex = (apptDate.getDay() + 6) % 7;
            setSelectedDay(dayIndex);
            initialScrollDone.current = true;
        }
    }, [initialAppointment]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            // Simulação de configurações da loja
            const settingsData = { start_time: '08:00', end_time: '20:00' }; // Mocked values
            setStartHour(settingsData.start_time ? parseInt(settingsData.start_time.split(':')[0]) : 8);
            setEndHour(settingsData.end_time ? parseInt(settingsData.end_time.split(':')[0]) : 20);

            // Simulação de membros da equipe
            const teamMembersData = getMockTeamMembers();
            setTeamMembers(teamMembersData as TeamMember[]);

            // Simulação de agendamentos
            const appointmentsData = getMockAppointments();
            setAppointments(appointmentsData as unknown as Appointment[]);

            setLoading(false);
        };
        fetchData();
    }, [dataVersion, startOfSelectedWeek, user.shopId]);
    
    useEffect(() => {
        if (scrollContainerRef.current && !loading) {
            let targetScroll = 0;
            if (initialAppointment && initialScrollDone.current) {
                const apptDate = new Date(initialAppointment.startTime);
                const minutesFromStart = (apptDate.getHours() - startHour) * 60 + apptDate.getMinutes();
                targetScroll = Math.max(0, (minutesFromStart * MINUTE_HEIGHT) - HOUR_HEIGHT);
                initialScrollDone.current = false;
            }
            scrollContainerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
    }, [selectedDay, loading, weekOffset, startHour, initialAppointment]);

    const timeMarkers = useMemo(() => {
        const markers = [];
        const totalMinutes = (endHour - startHour) * 60;
        for (let m = 0; m <= totalMinutes; m += 30) {
            const currentHour = startHour + Math.floor(m / 60);
            const currentMinute = m % 60;
            if (currentHour > endHour || (currentHour === endHour && currentMinute > 0)) continue;
            markers.push({ hour: currentHour, minute: currentMinute, isHour: currentMinute === 0, timeString: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}` });
        }
        return markers;
    }, [startHour, endHour]);
    
    const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

    const appointmentsByBarber = useMemo(() => {
        const selectedDayDate = getDateForDayIndex(selectedDay, startOfSelectedWeek).fullDate;
        const selectedDateStr = selectedDayDate.toISOString().split('T')[0];
        const filteredAppointments = appointments.filter(a => a.startTime.split('T')[0] === selectedDateStr);
        return teamMembers.reduce((acc, member) => {
            acc[member.id] = filteredAppointments.filter(a => a.barberId === member.id);
            return acc;
        }, {} as Record<string, Appointment[]>);
    }, [selectedDay, appointments, teamMembers, startOfSelectedWeek]);

    if (loading) return <div className="text-center p-10">Carregando agenda...</div>;
    if (teamMembers.length === 0) return <div className="text-center p-10 text-text-secondary">Adicione membros à equipe na tela de Gestão para visualizar a agenda.</div>;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full">
            <motion.div variants={itemVariants} className="my-4 px-4">
                <DaySelector selectedDay={selectedDay} setSelectedDay={setSelectedDay} weekOffset={weekOffset} setWeekOffset={setWeekOffset} startOfWeek={startOfSelectedWeek} theme={theme} />
            </motion.div>
            <motion.div variants={itemVariants} className="sticky top-20 z-10 bg-background/90 backdrop-blur-sm border-b border-card pt-2 pb-2">
                <div className="flex ml-14">
                    {teamMembers.map(member => <div key={member.id} className="flex-1 text-center px-1"><p className="text-xs font-bold text-text-primary truncate">{member.name.split(' ')[0]}</p></div>)}
                </div>
            </motion.div>
            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="relative ml-14" style={{ height: `${totalHeight}px` }}>
                    {timeMarkers.map((marker, index) => {
                        const topPosition = ((marker.hour - startHour) * 60 + marker.minute) * MINUTE_HEIGHT;
                        const isLastMarker = marker.hour === endHour && marker.minute === 0;
                        return (
                            <div key={index} className="absolute w-full" style={{ top: `${topPosition}px` }}>
                                {marker.isHour && !isLastMarker && <div className="absolute -left-14 w-14 text-right pr-2 -translate-y-1/2"><span className="text-xs text-text-secondary">{marker.timeString}</span></div>}
                                <div className={`h-px ${marker.isHour ? 'bg-white/10' : 'bg-white/5'}`}></div>
                            </div>
                        );
                    })}
                    <div className="absolute inset-0 flex">
                        {teamMembers.map(member => (
                            <div key={member.id} className="flex-1 relative border-l border-white/5">
                                <AnimatePresence>
                                    {appointmentsByBarber[member.id]?.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onClick={onAppointmentSelect} startHour={startHour} theme={theme} />)}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Agenda;