import React, { memo } from 'react';
import type { Appointment, TeamMember, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useShopLabels } from '../hooks/useShopLabels'; // Importa o novo hook

interface AppointmentCardProps {
    appointment: Appointment;
    teamMembers: TeamMember[];
    onClick: (appointment: Appointment) => void;
    user: User;
}

const AppointmentCard: React.FC<AppointmentCardProps> = memo(({ appointment, teamMembers, onClick, user }) => {
    const theme = useTheme(user);
    const shopLabels = useShopLabels(user.shopType); // Usa o novo hook
    const barber = teamMembers.find(b => b.id === appointment.barberId);
    const appointmentDate = new Date(appointment.startTime);
    const displayTime = appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const today = new Date();
    const isToday = appointmentDate.toDateString() === today.toDateString();
    
    const displayDate = isToday 
        ? 'Hoje' 
        : appointmentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const clientName = appointment.clients?.name || 'Cliente';
    const serviceName = appointment.services_json && appointment.services_json.length > 0 
        ? appointment.services_json.map(s => s.name).join(', ') 
        : shopLabels.defaultServiceName; // Usando nome de serviço dinâmico
        
    const clientImageUrl = appointment.clients?.image_url || `https://ui-avatars.com/api/?name=${clientName}&background=${theme.themeColor.substring(1)}&color=101012`;

    return (
        <div 
            className="flex h-full w-44 flex-shrink-0 flex-col gap-3 rounded-xl bg-card p-3 cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => onClick(appointment)}
        >
            <div 
                className="aspect-square w-full rounded-lg bg-cover bg-center bg-no-repeat" 
                aria-label={`Foto de perfil de ${clientName}`}
                style={{ backgroundImage: `url("${clientImageUrl}")` }}
            ></div>
            <div>
                <p className="truncate text-base font-bold text-text-primary">{clientName}</p>
                <p className="text-sm font-medium text-text-secondary truncate">{serviceName}</p>
                <p className={`mt-1 text-sm font-bold ${theme.primary}`}>
                    {displayTime} ({displayDate})
                </p>
                <p className="text-xs text-text-secondary truncate">
                    com {barber?.name.split(' ')[0] || shopLabels.defaultTeamMemberRole} {/* Usando fallback dinâmico */}
                </p>
            </div>
        </div>
    );
});


interface AppointmentsSectionProps {
    appointments: Appointment[];
    teamMembers: TeamMember[];
    onViewAllClick: () => void;
    onAppointmentClick: (appointment: Appointment) => void;
    user: User;
}

const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ appointments, teamMembers, onViewAllClick, onAppointmentClick, user }) => {
    const theme = useTheme(user);
    
    return (
        <section>
            <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <h3 className="text-xl font-bold tracking-tight text-text-primary">Próximos Agendamentos</h3>
                <button onClick={onViewAllClick} className={`text-sm font-semibold ${theme.primary} hover:text-yellow-400 transition-colors`}>Ver todos</button>
            </div>
            <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex items-stretch gap-3 px-4">
                    {appointments.map(appointment => (
                        <AppointmentCard 
                            key={appointment.id} 
                            appointment={appointment} 
                            teamMembers={teamMembers} 
                            onClick={onAppointmentClick}
                            user={user}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AppointmentsSection;