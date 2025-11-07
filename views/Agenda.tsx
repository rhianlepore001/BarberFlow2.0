import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Appointment, TeamMember } from '../types';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};

const DaySelector: React.FC<{ selectedDay: number; setSelectedDay: (day: number) => void }> = ({ selectedDay, setSelectedDay }) => {
    // 0=Seg, 5=Sab
    const days = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB"]; 
    return (
        <div className="flex justify-between items-center bg-card-dark p-1 rounded-full">
            {days.map((day, index) => (
                <button 
                    key={day}
                    onClick={() => setSelectedDay(index)}
                    className={`relative w-full text-sm font-bold py-2 rounded-full transition-colors ${selectedDay === index ? 'text-background-dark' : 'text-text-secondary-dark'}`}
                >
                    {selectedDay === index && (
                        <motion.div
                            layoutId="day-selector-active"
                            className="absolute inset-0 bg-primary rounded-full z-0"
                        />
                    )}
                    <span className="relative z-10">{day}</span>
                </button>
            ))}
        </div>
    );
}

const START_HOUR = 8;
const END_HOUR = 20;
const MINUTE_HEIGHT = 1.5; // pixels per minute (90px per hour)
const HOUR_HEIGHT = MINUTE_HEIGHT * 60; // 90 pixels per hour

const CurrentTimeIndicator: React.FC<{ scrollContainerRef: React.RefObject<HTMLDivElement> }> = ({ scrollContainerRef }) => {
    const [top, setTop] = useState(0);

    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const minutesFromStart = currentMinutes - START_HOUR * 60;
            const newTop = minutesFromStart * MINUTE_HEIGHT;
            setTop(newTop);
        };

        updatePosition();
        const interval = setInterval(updatePosition, 60000);
        return () => clearInterval(interval);
    }, []);

    // Check if the indicator is within the visible time range
    if (top < 0 || top > (END_HOUR - START_HOUR) * HOUR_HEIGHT) return null;

    return (
        <div className="absolute w-full z-20 pointer-events-none" style={{ top: `${top}px` }}>
            <div className="relative h-px bg-red-500">
                <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
            </div>
        </div>
    );
};

interface AppointmentCardProps {
    appointment: Appointment;
    onClick: (appointment: Appointment) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onClick }) => {
    const clientName = appointment.clients?.name || 'Cliente';
    const serviceName = appointment.services?.name || 'Serviço';
    const displayTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const startMinutes = new Date(appointment.startTime).getHours() * 60 + new Date(appointment.startTime).getMinutes();
    const top = (startMinutes - START_HOUR * 60) * MINUTE_HEIGHT;
    const height = appointment.duration_minutes * MINUTE_HEIGHT - 2;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            layout
            onClick={() => onClick(appointment)}
            className="absolute w-[98%] p-2 rounded-lg flex flex-col justify-start overflow-hidden bg-primary/10 backdrop-blur-sm border border-primary/30 cursor-pointer hover:bg-primary/20 transition-colors z-10"
            style={{
                top: `${top}px`,
                height: `${height}px`,
                left: '1%',
            }}
        >
            <p className="font-bold text-white text-sm leading-tight truncate">{clientName}</p>
            {height > 25 && (
                <p className="text-xs text-text-secondary-dark truncate">{serviceName}</p>
            )}
            {height > 40 && (
                <p className="text-xs font-semibold text-primary mt-1">{displayTime}</p>
            )}
        </motion.div>
    );
};

interface AgendaProps {
    onAppointmentSelect: (appointment: Appointment) => void;
    dataVersion: number;
}

const Agenda: React.FC<AgendaProps> = ({ onAppointmentSelect, dataVersion }) => {
    const today = new Date();
    // 0=Seg, 5=Sab. Se for Dom(0) ou Sab(6), ajusta para Seg(0)
    const currentDayOfWeek = (today.getDay() + 6) % 7; 
    const [selectedDay, setSelectedDay] = useState(currentDayOfWeek > 5 ? 0 : currentDayOfWeek);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    
    const dayMap = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            // 1. Fetch Team Members
            const { data: teamMembersData, error: teamMembersError } = await supabase.from('team_members').select('id, name');
            if (teamMembersError) {
                console.error(teamMembersError);
                setLoading(false);
                return;
            }
            setTeamMembers(teamMembersData);

            // 2. Fetch Appointments (for the next 7 days to cover the selector)
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfNextWeek = new Date(startOfToday);
            endOfNextWeek.setDate(startOfToday.getDate() + 7);

            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select('*, clients(id, name, image_url), services(id, name), team_members(id, name)')
                .gte('start_time', startOfToday.toISOString())
                .lte('start_time', endOfNextWeek.toISOString())
                .order('start_time');

            if (appointmentsError) console.error(appointmentsError);
            else {
                const fetchedAppointments = appointmentsData as unknown as Appointment[];
                setAppointments(fetchedAppointments.map((a: any) => ({
                    ...a,
                    barberId: a.barber_id,
                    clientId: a.client_id,
                    serviceId: a.service_id,
                    startTime: a.start_time,
                })));
            }

            setLoading(false);
        };
        fetchData();
    }, [dataVersion]);
    
    // Scroll to current time on load/day change
    useEffect(() => {
        if (scrollContainerRef.current && !loading) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const minutesFromStart = currentMinutes - START_HOUR * 60;
            const scrollTop = (minutesFromStart * MINUTE_HEIGHT) - scrollContainerRef.current.offsetHeight / 3;
            scrollContainerRef.current.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        }
    }, [selectedDay, loading]);

    const timeMarkers = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    const appointmentsByBarber = useMemo(() => {
        const selectedDate = new Date();
        const todayDayIndex = (selectedDate.getDay() + 6) % 7; // 0=Seg, 6=Dom
        
        // Adjust selectedDate to the start of the selected day
        const diff = selectedDay - todayDayIndex;
        selectedDate.setDate(selectedDate.getDate() + diff);
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        const filteredAppointments = appointments.filter(a => {
            const apptDateStr = a.startTime.split('T')[0];
            return apptDateStr === selectedDateStr;
        });

        const grouped = teamMembers.reduce((acc, member) => {
            acc[member.id] = filteredAppointments.filter(a => a.barberId === member.id);
            return acc;
        }, {} as Record<number, Appointment[]>);

        return grouped;
    }, [selectedDay, appointments, teamMembers]);

    const isToday = selectedDay === currentDayOfWeek;

    if (loading) {
        return <div className="text-center p-10">Carregando agenda...</div>;
    }
    
    if (teamMembers.length === 0) {
        return <div className="text-center p-10 text-text-secondary-dark">Adicione membros à equipe na tela de Gestão para visualizar a agenda.</div>;
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col h-full"
        >
            <motion.div variants={itemVariants} className="my-4 px-4">
                <DaySelector selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            </motion.div>
            
            {/* Header da Agenda (Barbeiros) */}
            <motion.div variants={itemVariants} className="sticky top-20 z-10 bg-background-dark/90 backdrop-blur-sm border-b border-card-dark pt-2 pb-2">
                <div className="flex ml-14">
                    {teamMembers.map(member => (
                        <div key={member.id} className="flex-1 text-center px-1">
                            <p className="text-xs font-bold text-white truncate">{member.name.split(' ')[0]}</p>
                        </div>
                    ))}
                </div>
            </motion.div>

            <div 
                ref={scrollContainerRef}
                className="flex-grow overflow-y-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                <div className="relative ml-14" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                    
                    {/* Time Grid Lines */}
                    {timeMarkers.map(hour => (
                        <div key={hour} className="relative" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                             <div className="absolute -left-14 w-14 text-right pr-2 -translate-y-1/2">
                                <span className="text-xs text-text-secondary-dark">{`${hour.toString().padStart(2, '0')}:00`}</span>
                             </div>
                             <div className="h-px bg-white/10"></div>
                        </div>
                    ))}
                    
                    {/* Current Time Indicator */}
                    {isToday && <CurrentTimeIndicator scrollContainerRef={scrollContainerRef} />}

                    {/* Appointment Columns */}
                    <div className="absolute inset-0 flex">
                        {teamMembers.map(member => (
                            <div key={member.id} className="flex-1 relative border-l border-white/5">
                                <AnimatePresence>
                                    {appointmentsByBarber[member.id]?.map((appointment) => (
                                        <AppointmentCard 
                                            key={appointment.id} 
                                            appointment={appointment} 
                                            onClick={onAppointmentSelect}
                                        />
                                    ))}
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