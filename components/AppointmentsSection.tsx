import React from 'react';
import type { Appointment, TeamMember } from '../types';

interface AppointmentCardProps {
    appointment: Appointment;
    teamMembers: TeamMember[];
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, teamMembers }) => {
    const barber = teamMembers.find(b => b.id === appointment.barberId);
    const displayTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const clientName = appointment.clients?.name || 'Cliente';
    const serviceName = appointment.services?.name || 'Serviço';
    const clientImageUrl = appointment.clients?.image_url || `https://ui-avatars.com/api/?name=${clientName}&background=E5A00D&color=101012`;

    return (
        <div className="flex h-full w-44 flex-shrink-0 flex-col gap-3 rounded-xl bg-card-dark p-3">
            <div 
                className="aspect-square w-full rounded-lg bg-cover bg-center bg-no-repeat" 
                aria-label={`Foto de perfil de ${clientName}`}
                style={{ backgroundImage: `url("${clientImageUrl}")` }}
            ></div>
            <div>
                <p className="truncate text-base font-bold text-white">{clientName}</p>
                <p className="text-sm font-medium text-text-secondary-dark">{serviceName}</p>
                <p className="mt-1 text-sm font-bold text-primary">
                    {displayTime} com {barber?.name.split(' ')[0] || 'Barbeiro'}
                </p>
            </div>
        </div>
    );
};


interface AppointmentsSectionProps {
    appointments: Appointment[];
    teamMembers: TeamMember[];
}

const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ appointments, teamMembers }) => {
    return (
        <section>
            <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <h3 className="text-xl font-bold tracking-tight text-white">Próximos Agendamentos</h3>
                <a className="text-sm font-semibold text-primary" href="#">Ver todos</a>
            </div>
            <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex items-stretch gap-3 px-4">
                    {appointments.map(appointment => (
                        <AppointmentCard key={appointment.id} appointment={appointment} teamMembers={teamMembers} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AppointmentsSection;