import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { Appointment, Client, Service, TeamMember } from '../../types';

interface NewAppointmentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    appointment?: Appointment | null;
}

const NewAppointmentForm: React.FC<NewAppointmentFormProps> = ({ onClose, onSuccess, appointment }) => {
    const isEditing = !!appointment;
    const [clients, setClients] = useState<(Pick<Client, 'id' | 'name' | 'image_url'>)[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [clientsRes, servicesRes, teamRes] = await Promise.all([
                supabase.from('clients').select('id, name, image_url'),
                supabase.from('services').select('id, name, duration_minutes'),
                supabase.from('team_members').select('id, name')
            ]);
            if (clientsRes.data) setClients(clientsRes.data);
            if (servicesRes.data) setServices(servicesRes.data);
            if (teamRes.data) setTeamMembers(teamRes.data);
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const clientId = formData.get('client') as string;
        const serviceId = formData.get('service') as string;
        const barberId = formData.get('barber') as string;
        const time = formData.get('time') as string;
        const date = formData.get('date') as string;
        
        const start_time = new Date(`${date}T${time}:00`).toISOString();
        
        const service = services.find(s => s.id === parseInt(serviceId));

        if (!service) {
            setError("Serviço inválido.");
            setIsSaving(false);
            return;
        }

        const appointmentData = {
            start_time: start_time,
            barber_id: parseInt(barberId),
            client_id: parseInt(clientId),
            service_id: service.id,
            duration_minutes: service.duration_minutes, 
        };

        const { error: dbError } = isEditing
            ? await supabase.from('appointments').update(appointmentData).eq('id', appointment.id)
            : await supabase.from('appointments').insert([appointmentData]);
        
        if (dbError) {
            console.error('Error saving appointment:', dbError);
            setError(`Falha ao salvar o agendamento: ${dbError.message}`);
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!appointment) return;
        setIsSaving(true);
        setError(null);
        const { error: dbError } = await supabase.from('appointments').delete().eq('id', appointment.id);
        if (dbError) {
            console.error("Error deleting appointment:", dbError);
            setError(`Falha ao excluir o agendamento: ${dbError.message}`);
            setIsSaving(false);
        }
        else onSuccess();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">{isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <select name="client" defaultValue={appointment?.clientId} disabled={isEditing} required className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary disabled:opacity-50">
                    <option value="" disabled>Selecione um cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select name="service" defaultValue={appointment?.serviceId} required className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary">
                     <option value="" disabled>Selecione um serviço</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                 <select name="barber" defaultValue={appointment?.barberId} required className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary">
                     <option value="" disabled>Selecione um barbeiro</option>
                    {teamMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="flex gap-3">
                    <input type="date" name="date" required defaultValue={appointment?.startTime ? appointment.startTime.split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"/>
                    <input type="time" name="time" required defaultValue={appointment?.startTime ? new Date(appointment.startTime).toTimeString().substring(0,5) : "14:30"} className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"/>
                </div>

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="w-full rounded-full bg-primary py-3 text-center font-bold text-background-dark disabled:bg-primary/50">{isSaving ? 'Salvando...' : (isEditing ? 'Salvar' : 'Agendar')}</button>
                </div>

                {isEditing && (
                     <div className="!mt-2">
                        <button type="button" onClick={handleDelete} disabled={isSaving} className="w-full py-2 text-center font-semibold text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">Excluir Agendamento</button>
                    </div>
                )}
            </form>
        </motion.div>
    );
};

export default NewAppointmentForm;