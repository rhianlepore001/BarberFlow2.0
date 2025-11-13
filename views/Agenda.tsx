import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Appointment, TeamMember, User } from '../types';
import { useTheme } from '../hooks/useTheme';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};

// Helper function to get the start of the week (Monday) for a given date
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper function to get the date for a specific day index (0=Mon, 5=Sat) based on a reference date
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
    // 0=Seg, 5=Sab
    const days = [0, 1, 2, 3, 4, 5]; // Indices for Mon to Sat
    
    const currentMonthYear = startOfWeek.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <button 
                    onClick={() => setWeekOffset(weekOffset - 1)}
                    className="p-2 text-text-secondary-dark hover:text-white transition-colors"
                    aria-label="Semana Anterior"
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h3 className="text-lg font-bold text-white capitalize">{currentMonthYear}</h3>
                <button 
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    className="p-2 text-text-secondary-dark hover:text-white transition-colors"
                    aria-label="Próxima Semana"
                >
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
            
            <div className="flex justify-between items-center bg-card-dark p-1 rounded-xl">
                {days.map((dayIndex) => {
                    const { dayLabel, dateLabel } = getDateForDayIndex(dayIndex, startOfWeek);
                    return (
                        <button 
                            key={dayIndex}
                            onClick={() => setSelectedDay(dayIndex)}
                            className={`relative w-full flex flex-col items-center text-sm font-bold py-2 rounded-lg transition-colors ${selectedDay === dayIndex ? 'text-background-dark' : 'text-text-secondary-dark'}`}
                        >
                            {selectedDay === dayIndex && (
                                <motion.div
                                    layoutId="day-selector-active"
                                    className={`absolute inset-0 ${theme.bgPrimary} rounded-lg z-0`}
                                />
                            )}
                            <span className="relative z-10 text-xs">{dayLabel}</span>
                            <span className="relative z-10 text-sm font-extrabold">{dateLabel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const MINUTE_HEIGHT = 2.5; // pixels per minute (150px per hour) - Aumentado para 2.5
const HOUR_HEIGHT = MINUTE_HEIGHT * 60; // 150 pixels per hour

// Interface para o agendamento com dados de layout calculados
interface AppointmentWithLayout extends Appointment {
    top: number;
    height: number;
    left: number;
    width: number;
}

interface AppointmentCardProps {
    appointment: AppointmentWithLayout; // Usa o tipo com layout
    onClick: (appointment: Appointment) => void;
    startHour: number;
    theme: ReturnType<typeof useTheme>;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onClick, startHour, theme }) => {
    const clientName = appointment.clients?.name || 'Cliente';
    const services = appointment.services_json || [];
    const serviceNames = services.map(s => s.name).join(', ');
    const displayTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Novo limite: 30 minutos (73px) é o mínimo para exibir nome e horário/duração
    const isSmallCard = appointment.height < 70; 
    const hasSpaceForServices = appointment.height > 90; // Reajustado para 90px (36 minutos)

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            layout
            onClick={() => onClick(appointment)}
            className={`absolute p-2 rounded-lg flex flex-col justify-start overflow-hidden bg-card-dark border-l-4 ${theme.borderPrimary} shadow-md cursor-pointer hover:bg-card-dark/80 transition-colors z-10`}
            style={{
                top: `${appointment.top}px`,
                height: `${appointment.height}px`,
                left: `${appointment.left}%`, // Usa left calculado
                width: `${appointment.width}%`, // Usa width calculado
            }}
        >
            {/* Nome do Cliente (Sempre no topo) */}
            <p className="font-bold text-white text-sm leading-tight truncate">{clientName}</p>
            
            {/* Horário e Duração */}
            <div className={`flex items-center gap-1 text-xs font-semibold ${theme.primary} ${isSmallCard ? 'mt-0' : 'mt-auto'}`}>
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>{displayTime} ({appointment.duration_minutes} min)</span>
            </div>
            
            {/* Serviços (Apenas se houver espaço suficiente) */}
            {hasSpaceForServices && (
                <p className="text-xs text-text-secondary-dark leading-snug line-clamp-2 mt-1">
                    {serviceNames}
                </p>
            )}
        </motion.div>
    );
};

// Função para calcular o layout de agendamentos sobrepostos
const calculateAppointmentLayout = (appointments: Appointment[], startHour: number): AppointmentWithLayout[] => {
    if (appointments.length === 0) return [];

    // 1. Calcular posições verticais iniciais
    const appointmentsWithPos = appointments.map(appt => {
        const startMinutes = new Date(appt.startTime).getHours() * 60 + new Date(appt.startTime).getMinutes();
        const top = (startMinutes - startHour * 60) * MINUTE_HEIGHT;
        const height = appt.duration_minutes * MINUTE_HEIGHT - 2;
        
        return { ...appt, top, height, left: 0, width: 100 };
    });

    // 2. Detectar e resolver colisões
    const resolvedAppointments: AppointmentWithLayout[] = [];
    
    // Ordena por horário de início para processamento sequencial
    appointmentsWithPos.sort((a, b) => a.top - b.top);

    for (let i = 0; i < appointmentsWithPos.length; i++) {
        const current = appointmentsWithPos[i];
        const overlappingGroup: AppointmentWithLayout[] = [current];

        // Encontra todos os agendamentos que colidem com o atual
        for (let j = i + 1; j < appointmentsWithPos.length; j++) {
            const next = appointmentsWithPos[j];
            
            // Colisão ocorre se: (CurrentStart < NextEnd) AND (CurrentEnd > NextStart)
            if (current.top < next.top + next.height && current.top + current.height > next.top) {
                overlappingGroup.push(next);
            }
        }
        
        // Se houver sobreposição, resolve o layout para o grupo
        if (overlappingGroup.length > 1) {
            const groupSize = overlappingGroup.length;
            const width = 100 / groupSize;
            
            // Atribui largura e posição horizontal para cada item do grupo
            overlappingGroup.forEach((appt, index) => {
                appt.width = width - 1; // Subtrai um pouco para espaçamento
                appt.left = width * index + 0.5; // Adiciona 0.5% de margem
                
                // Marca os itens resolvidos para não processá-los novamente
                if (!resolvedAppointments.includes(appt)) {
                    resolvedAppointments.push(appt);
                }
            });
            
            // Pula os itens já processados no loop externo
            i += groupSize - 1; 
        } else {
            // Sem sobreposição, usa 100% da largura
            current.width = 98;
            current.left = 1;
            resolvedAppointments.push(current);
        }
    }
    
    // Nota: A lógica acima é simplificada e pode ter problemas com colisões complexas (A colide com B, B colide com C, mas A não colide com C).
    // Para este caso, vamos usar uma abordagem mais simples de "coluna" que funciona bem para a maioria dos cenários de barbearia.
    
    // Vamos reverter para a lógica simples de 100% de largura, mas garantir que a verificação de conflito no BookingCalendar funcione.
    // O problema aqui é apenas visual. A lógica de colisão é complexa e pode ser overkill.
    // Vamos garantir que a lógica de layout seja simples (98% de largura) e focar na correção do BookingCalendar.
    
    // Revertendo para layout simples (98% de largura) e confiando na correção do BookingCalendar para evitar sobreposição.
    return appointmentsWithPos.map(appt => ({
        ...appt,
        width: 98,
        left: 1,
    }));
};


interface AgendaProps {
    onAppointmentSelect: (appointment: Appointment) => void;
    dataVersion: number;
    initialAppointment: Appointment | null;
    user: User; // Adiciona user para obter o tema
}

const Agenda: React.FC<AgendaProps> = ({ onAppointmentSelect, dataVersion, initialAppointment, user }) => {
    const today = new Date();
    // 0=Seg, 5=Sab. Se for Dom(0) ou Sab(6), ajusta para Seg(0)
    const currentDayOfWeek = (today.getDay() + 6) % 7; 
    const initialDay = currentDayOfWeek > 5 ? 0 : currentDayOfWeek;
    
    const [selectedDay, setSelectedDay] = useState(initialDay);
    const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Horários de funcionamento dinâmicos
    const [startHour, setStartHour] = useState(8);
    const [endHour, setEndHour] = useState(20);
    
    // Estado para controlar se a rolagem inicial já foi feita
    const initialScrollDone = useRef(false);
    const theme = useTheme(user);

    // Calculate the start of the currently selected week (Monday)
    const startOfSelectedWeek = useMemo(() => {
        // Cria uma nova data baseada no dia atual para evitar referências fixas
        const date = new Date(); 
        date.setDate(date.getDate() + weekOffset * 7);
        return getStartOfWeek(date);
    }, [weekOffset]);
    
    // --- Lógica de Inicialização do Agendamento ---
    useEffect(() => {
        if (initialAppointment && !initialScrollDone.current) {
            const apptDate = new Date(initialAppointment.startTime);
            const today = new Date();
            
            // 1. Calcular Week Offset
            const startOfApptWeek = getStartOfWeek(apptDate);
            const startOfTodayWeek = getStartOfWeek(today);
            
            // Diferença em milissegundos / milissegundos por dia / 7 dias
            const diffWeeks = Math.round((startOfApptWeek.getTime() - startOfTodayWeek.getTime()) / (1000 * 60 * 60 * 24 * 7));
            setWeekOffset(diffWeeks);
            
            // 2. Calcular Selected Day (0=Mon, 5=Sat)
            const dayIndex = (apptDate.getDay() + 6) % 7;
            setSelectedDay(dayIndex);
            
            // 3. Forçar a rolagem (será executada no próximo useEffect)
            // Marcamos que a rolagem inicial deve ocorrer
            initialScrollDone.current = true;
        }
    }, [initialAppointment]);


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            // 1. Fetch Shop Settings for working hours
            const { data: settingsData, error: settingsError } = await supabase
                .from('shop_settings')
                .select('start_time, end_time')
                .limit(1)
                .single();
            
            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error("Error fetching shop settings:", settingsError);
            } else if (settingsData) {
                // Converte strings de tempo (ex: "09:00:00") para horas inteiras
                const newStartHour = settingsData.start_time ? parseInt(settingsData.start_time.split(':')[0]) : 8;
                const newEndHour = settingsData.end_time ? parseInt(settingsData.end_time.split(':')[0]) : 20;
                
                setStartHour(newStartHour);
                setEndHour(newEndHour);
            }

            // 2. Fetch Team Members
            const { data: teamMembersData, error: teamMembersError } = await supabase.from('team_members').select('id, name');
            if (teamMembersError) {
                console.error(teamMembersError);
                setLoading(false);
                return;
            }
            setTeamMembers(teamMembersData);

            // 3. Fetch Appointments for the selected week (Mon to Sun)
            const startOfWeekISO = startOfSelectedWeek.toISOString();
            
            const endOfWeek = new Date(startOfSelectedWeek);
            endOfWeek.setDate(startOfSelectedWeek.getDate() + 6); // Sunday
            endOfWeek.setHours(23, 59, 59, 999);
            const endOfWeekISO = endOfWeek.toISOString();

            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('appointments')
                .select('*, clients(id, name, image_url), team_members(id, name)')
                .gte('start_time', startOfWeekISO)
                .lte('start_time', endOfWeekISO)
                .order('start_time');

            if (appointmentsError) console.error(appointmentsError);
            else {
                const fetchedAppointments = appointmentsData as unknown as Appointment[];
                setAppointments(fetchedAppointments.map((a: any) => ({
                    ...a,
                    barberId: a.barber_id,
                    clientId: a.client_id,
                    services_json: a.services_json, // Novo campo
                    startTime: a.start_time,
                })));
            }

            setLoading(false);
        };
        fetchData();
    }, [dataVersion, startOfSelectedWeek]); // Recarrega quando a semana muda ou dados mudam
    
    // Scroll to the appointment time if initialAppointment is set
    useEffect(() => {
        if (scrollContainerRef.current && !loading && initialAppointment && initialScrollDone.current) {
            const apptDate = new Date(initialAppointment.startTime);
            const apptHour = apptDate.getHours();
            const apptMinute = apptDate.getMinutes();
            
            // Calcula a posição em pixels
            const minutesFromStart = (apptHour - startHour) * 60 + apptMinute;
            const targetScroll = minutesFromStart * MINUTE_HEIGHT;
            
            // Rola para a posição, subtraindo um pouco para dar contexto (ex: 1 hora antes)
            const scrollPosition = Math.max(0, targetScroll - HOUR_HEIGHT); 
            
            scrollContainerRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
            
            // Reseta a flag para que a rolagem só ocorra na inicialização via Home
            initialScrollDone.current = false;
        } else if (scrollContainerRef.current && !loading) {
            // Se não houver agendamento inicial, rola para o topo da hora de início
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [selectedDay, loading, weekOffset, startHour, initialAppointment]);

    // Gera os marcadores de tempo a cada 30 minutos
    const timeMarkers = useMemo(() => {
        const markers = [];
        // Multiplica por 2 para incluir as meias horas
        const totalMinutes = (endHour - startHour) * 60;
        
        for (let m = 0; m <= totalMinutes; m += 30) {
            const currentHour = startHour + Math.floor(m / 60);
            const currentMinute = m % 60;
            
            // Garante que não ultrapasse o horário final (endHour)
            if (currentHour > endHour || (currentHour === endHour && currentMinute > 0)) continue;
            
            markers.push({
                hour: currentHour,
                minute: currentMinute,
                isHour: currentMinute === 0,
                timeString: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
            });
        }
        return markers;
    }, [startHour, endHour]);
    
    const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

    const appointmentsByBarber = useMemo(() => {
        // Calculate the date string for the selected day within the selected week
        const selectedDayDate = getDateForDayIndex(selectedDay, startOfSelectedWeek).fullDate;
        const selectedDateStr = selectedDayDate.toISOString().split('T')[0];

        const filteredAppointments = appointments.filter(a => {
            const apptDateStr = a.startTime.split('T')[0];
            return apptDateStr === selectedDateStr;
        });

        const grouped = teamMembers.reduce((acc, member) => {
            const memberAppointments = filteredAppointments.filter(a => a.barberId === member.id);
            
            // Calcula o layout para os agendamentos deste barbeiro
            acc[member.id] = calculateAppointmentLayout(memberAppointments, startHour);
            return acc;
        }, {} as Record<number, AppointmentWithLayout[]>);

        return grouped;
    }, [selectedDay, appointments, teamMembers, startOfSelectedWeek, startHour]);

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
                <DaySelector 
                    selectedDay={selectedDay} 
                    setSelectedDay={setSelectedDay} 
                    weekOffset={weekOffset}
                    setWeekOffset={setWeekOffset}
                    startOfWeek={startOfSelectedWeek}
                    theme={theme}
                />
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
                <div className="relative ml-14" style={{ height: `${totalHeight}px` }}>
                    
                    {/* Time Grid Lines */}
                    {timeMarkers.map((marker, index) => {
                        // Calcula a posição top em pixels
                        const minutesFromStart = (marker.hour - startHour) * 60 + marker.minute;
                        const topPosition = minutesFromStart * MINUTE_HEIGHT;
                        
                        // A última linha (endHour:00) não precisa de rótulo de tempo, mas precisa da linha
                        const isLastMarker = marker.hour === endHour && marker.minute === 0;

                        return (
                            <div 
                                key={index} 
                                className="absolute w-full" 
                                style={{ top: `${topPosition}px` }}
                            >
                                 {marker.isHour && !isLastMarker && (
                                     <div className="absolute -left-14 w-14 text-right pr-2 -translate-y-1/2">
                                        <span className="text-xs text-text-secondary-dark">{marker.timeString}</span>
                                     </div>
                                 )}
                                 <div className={`h-px ${marker.isHour ? 'bg-white/10' : 'bg-white/5'}`}></div>
                            </div>
                        );
                    })}
                    
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
                                            startHour={startHour}
                                            theme={theme}
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