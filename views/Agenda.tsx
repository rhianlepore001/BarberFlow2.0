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
const HOUR_HEIGHT = 80; // pixels per hour

const CurrentTimeIndicator: React.FC = () => {
    const [top, setTop] = useState(0);

    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const minutesFromStart = currentMinutes - START_HOUR * 60;
            const newTop = (minutesFromStart / 60) * HOUR_HEIGHT;
            setTop(newTop);
        };

        updatePosition();
        const interval = setInterval(updatePosition, 60000);
        return () => clearInterval(interval);
    }, []);

    if (top < 0 || top > (END_HOUR - START_HOUR) * HOUR_HEIGHT) return null;

    return (
        <div className="absolute w-full" style={{ top: `${top}px` }}>
            <div className="relative h-px bg-primary">
                <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-primary" />
            </div>
        </div>
    );
};

interface ProcessedAppointment extends Appointment {
    top: number;
    height: number;
    width: number;
    left: number;
    startMinutes: number;
    endMinutes: number;
}

interface AgendaProps {
    onAppointmentSelect: (appointment: Appointment) => void;
    dataVersion: number;
}

const Agenda: React.FC<AgendaProps> = ({ onAppointmentSelect, dataVersion }) => {
    const today = new Date();
    const currentDayOfWeek = (today.getDay() + 6) % 7;
    const [selectedDay, setSelectedDay] = useState(currentDayOfWeek > 5 ? 0 : currentDayOfWeek);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [appointments, setAppointments] = useState<(Appointment & { dayOfWeek: number })[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [appointmentsRes, teamMembersRes] = await Promise.all([
                supabase.from('appointments').select('*, clients(id, name, image_url), services(id, name), team_members(id, name)').order('start_time'),
                supabase.from('team_members').select('*')
            ]);

            if (appointmentsRes.error) console.error(appointmentsRes.error);
            else {
                const fetchedAppointments = appointmentsRes.data as unknown as Appointment[];
                setAppointments(fetchedAppointments.map((a: any) => {
                    const date = new Date(a.start_time);
                    return {
                        ...a,
                        barberId: a.barber_id,
                        clientId: a.client_id,
                        serviceId: a.service_id,
                        startTime: a.start_time,
                        dayOfWeek: (date.getDay() + 6) % 7,
                    }
                }));
            }

            if (teamMembersRes.error) console.error(teamMembersRes.error);
            else setTeamMembers(teamMembersRes.data);

            setLoading(false);
        };
        fetchData();
    }, [dataVersion]);
    
    useEffect(() => {
        if (scrollContainerRef.current && !loading) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const minutesFromStart = currentMinutes - START_HOUR * 60;
            const scrollTop = (minutesFromStart / 60) * HOUR_HEIGHT - scrollContainerRef.current.offsetHeight / 3;
            scrollContainerRef.current.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        }
    }, [selectedDay, loading]);

    const timeMarkers = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    const processedAppointments = useMemo((): ProcessedAppointment[] => {
        const todaysAppointments = appointments
            .filter(a => a.dayOfWeek === selectedDay)
            .map(a => {
                const date = new Date(a.startTime);
                const startMinutes = date.getHours() * 60 + date.getMinutes();
                return {
                    ...a,
                    startMinutes: startMinutes,
                    endMinutes: startMinutes + a.duration_minutes,
                }
            })
            .sort((a, b) => a.startMinutes - b.startMinutes);
        
        const layout: ProcessedAppointment[] = [];
        
        for (const appt of todaysAppointments) {
            const top = ((appt.startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
            const height = (appt.duration_minutes / 60) * HOUR_HEIGHT - 2;

            const overlapping = layout.filter(p => (appt.startMinutes < p.endMinutes) && (appt.endMinutes > p.startMinutes));
            const columns: boolean[] = [];
            overlapping.forEach(o => { if (columns[o.left]) columns[o.left] = true; });
            let col = 0;
            while (columns[col]) col++;
            layout.push({ ...appt, top, height, width: 1, left: col });
        }
        
        const finalLayout = layout.map((appt, _, all) => {
            const overlappingGroup = all.filter(other => (appt.startMinutes < other.endMinutes) && (appt.endMinutes > other.startMinutes));
            const maxColumns = Math.max(...overlappingGroup.map(o => o.left)) + 1;
            const newWidth = 100 / maxColumns;
            const newLeft = appt.left * newWidth;
            return {...appt, width: newWidth, left: newLeft};
        });

        return finalLayout;
    }, [selectedDay, appointments]);

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
            
            <div 
                ref={scrollContainerRef}
                className="flex-grow overflow-y-auto pr-4 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                 {loading ? <div className="text-center p-10">Carregando agenda...</div> : (
                <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                    {timeMarkers.map(hour => (
                        <div key={hour} className="relative" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                             <div className="absolute -left-1 w-14 text-right pr-2">
                                <span className="text-xs text-text-secondary-dark">{`${hour.toString().padStart(2, '0')}:00`}</span>
                             </div>
                             <div className="h-px bg-white/10 ml-14"></div>
                        </div>
                    ))}
                    
                    {selectedDay === currentDayOfWeek && <CurrentTimeIndicator />}

                    <div className="absolute top-0 left-14 right-0 h-full">
                        <AnimatePresence>
                        {processedAppointments.map((appointment) => {
                             const barber = teamMembers.find(b => b.id === appointment.barberId);
                             const displayTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                             return (
                                 <motion.div
                                    key={appointment.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    layout
                                    onClick={() => onAppointmentSelect(appointment)}
                                    className="absolute p-1 rounded-lg flex flex-col justify-center overflow-hidden bg-card-dark/80 backdrop-blur-md border border-white/10 cursor-pointer hover:border-primary transition-colors"
                                    style={{
                                        top: `${appointment.top}px`,
                                        height: `${appointment.height}px`,
                                        width: `calc(${appointment.width}% - 4px)`,
                                        left: `calc(${appointment.left}% + 2px)`,
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {appointment.height >= 55 && appointment.clients?.image_url && (
                                            <img src={appointment.clients.image_url} alt={appointment.clients.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0"/>
                                        )}
                                        <p className="font-bold text-white text-xs leading-tight truncate">{appointment.clients?.name || 'Cliente'}</p>
                                    </div>
                                    
                                    {appointment.height > 25 && (
                                        <div className="mt-0.5 text-[11px] leading-tight overflow-hidden">
                                             <p className="text-text-secondary-dark truncate">{appointment.services?.name || 'Serviço'}</p>
                                             {appointment.height > 35 && (
                                                <p className="font-semibold text-primary truncate">
                                                    {displayTime} • {barber?.name.split(' ')[0]}
                                                </p>
                                             )}
                                        </div>
                                    )}
                                </motion.div>
                            )
                         })}
                         </AnimatePresence>
                    </div>
                </div>
                 )}
            </div>
        </motion.div>
    );
};

export default Agenda;