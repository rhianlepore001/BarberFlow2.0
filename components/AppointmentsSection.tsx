import React from 'react';
import type { Appointment, TeamMember } from '../types';

interface AppointmentCardProps {
    appointment: Appointment;
    teamMembers: TeamMember[];
    onClick: (appointment: Appointment) => void; // Nova prop
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, teamMembers, onClick }) => {
    const barber = teamMembers.find(b => b.id === appointment.barberId);
    const appointmentDate = new Date(appointment.startTime);
    const displayTime = appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const today = new Date();
    const isToday = appointmentDate.toDateString() === today.toDateString();
    
    const displayDate = isToday 
        ? 'Hoje' 
        : appointmentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const clientName = appointment.clients?.name || 'Cliente';
    // Usa o primeiro serviço ou uma lista de serviços
    const serviceName = appointment.services_json && appointment.services_json.length > 0 
        ? appointment.services_json.map(s => s.name).join(', ') 
        : 'Serviço';
        
    const clientImageUrl = appointment.clients?.image_url || `https://ui-avatars.com/api/?name=${clientName}&background=E5A00D&color=101012`;

    return (
        <div 
            className="flex h-full w-44 flex-shrink-0 flex-col gap-3 rounded-xl bg-card-dark p-3 cursor-pointer hover:bg-card-dark/80 transition-colors"
            onClick={() => onClick(appointment)} // Adiciona o manipulador de clique
        >
            <div 
                className="aspect-square w-full rounded-lg bg-cover bg-center bg-no-repeat" 
                aria-label={`Foto de perfil de ${clientName}`}
                style={{ backgroundImage: `url("${clientImageUrl}")` }}
            ></div>
            <div>
                <p className="truncate text-base font-bold text-white">{clientName}</p>
                <p className="text-sm font-medium text-text-secondary-dark truncate">{serviceName}</p>
                <p className="mt-1 text-sm font-bold text-primary">
                    {displayTime} ({displayDate})
                </p>
                <p className="text-xs text-text-secondary-dark truncate">
                    com {barber?.name.split(' ')[0] || 'Barbeiro'}
                </p>
            </div>
        </div>
    );
};


interface AppointmentsSectionProps {
    appointments: Appointment[];
    teamMembers: TeamMember[];
    onViewAllClick: () => void;
    onAppointmentClick: (appointment: Appointment) => void; // Nova prop
}

const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ appointments, teamMembers, onViewAllClick, onAppointmentClick }) => {
    return (
        <section>
            <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <h3 className="text-xl font-bold tracking-tight text-white">Próximos Agendamentos</h3>
                <button onClick={onViewAllClick} className="text-sm font-semibold text-primary hover:text-yellow-400 transition-colors">Ver todos</button>
            </div>
            <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex items-stretch gap-3 px-4">
                    {appointments.map(appointment => (
                        <AppointmentCard 
                            key={appointment.id} 
                            appointment={appointment} 
                            teamMembers={teamMembers} 
                            onClick={onAppointmentClick} // Passa a função de clique
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AppointmentsSection;