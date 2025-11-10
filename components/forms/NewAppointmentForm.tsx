import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { Appointment, Client, Service, TeamMember, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface NewAppointmentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    appointment?: Appointment | null;
    shopId: number;
    user: User; // Adiciona user para obter o tema
}

const NewAppointmentForm: React.FC<NewAppointmentFormProps> = ({ onClose, onSuccess, appointment, shopId, user }) => {
    const isEditing = !!appointment;
    const [clients, setClients] = useState<(Pick<Client, 'id' | 'name' | 'image_url'>)[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
        isEditing && appointment.services_json ? appointment.services_json.map(s => s.id) : []
    );
    
    const [barberId, setBarberId] = useState(appointment?.barberId || '');
    const [clientId, setClientId] = useState(appointment?.clientId || '');
    const [date, setDate] = useState(appointment?.startTime ? appointment.startTime.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(appointment?.startTime ? new Date(appointment.startTime).toTimeString().substring(0,5) : "14:30");

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchData = async () => {
            const [clientsRes, servicesRes, teamRes] = await Promise.all([
                supabase.from('clients').select('id, name, image_url').order('name'),
                supabase.from('services').select('id, name, price, duration_minutes').order('name'),
                supabase.from('team_members').select('id, name').order('name')
            ]);
            if (clientsRes.data) setClients(clientsRes.data);
            if (servicesRes.data) setAllServices(servicesRes.data);
            if (teamRes.data) setTeamMembers(teamRes.data);
        };
        fetchData();
    }, []);
    
    const handleServiceToggle = (serviceId: number) => {
        setSelectedServiceIds(prev => 
            prev.includes(serviceId) 
                ? prev.filter(id => id !== serviceId) 
                : [...prev, serviceId]
        );
    };

    const selectedServices = useMemo(() => {
        return allServices.filter(s => selectedServiceIds.includes(s.id));
    }, [selectedServiceIds, allServices]);

    const totalDuration = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
    }, [selectedServices]);
    
    const totalPrice = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.price, 0);
    }, [selectedServices]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        if (selectedServices.length === 0) {
            setError("Selecione pelo menos um serviço.");
            setIsSaving(false);
            return;
        }
        if (!barberId || !clientId) {
            setError("Selecione o cliente e o barbeiro.");
            setIsSaving(false);
            return;
        }

        const start_time = new Date(`${date}T${time}:00`).toISOString();
        
        // Prepara os dados dos serviços para salvar como JSONB
        const servicesToSave = selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price,
            duration_minutes: s.duration_minutes
        }));

        const appointmentData = {
            start_time: start_time,
            barber_id: parseInt(barberId as string),
            client_id: parseInt(clientId as string),
            duration_minutes: totalDuration, 
            services_json: servicesToSave, // Novo campo JSONB
            shop_id: shopId,
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
                {/* Cliente */}
                <select 
                    name="client" 
                    value={clientId}
                    onChange={(e) => setClientId(parseInt(e.target.value))}
                    disabled={isEditing} 
                    required 
                    className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary disabled:opacity-50`}
                >
                    <option value="" disabled>Selecione um cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                
                {/* Barbeiro */}
                 <select 
                    name="barber" 
                    value={barberId}
                    onChange={(e) => setBarberId(parseInt(e.target.value))}
                    required 
                    className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                >
                     <option value="" disabled>Selecione um barbeiro</option>
                    {teamMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                {/* Seleção de Serviços (Múltipla) */}
                <div className="bg-background-dark border-2 border-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <p className="text-sm font-medium text-text-secondary-dark mb-2">Serviços ({totalDuration} min | R$ {totalPrice.toFixed(2).replace('.', ',')})</p>
                    {allServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1">
                            <label htmlFor={`service-${s.id}`} className="flex items-center gap-2 text-white text-sm cursor-pointer flex-1">
                                <input 
                                    type="checkbox" 
                                    id={`service-${s.id}`} 
                                    checked={selectedServiceIds.includes(s.id)}
                                    onChange={() => handleServiceToggle(s.id)}
                                    className={`form-checkbox h-4 w-4 ${theme.primary} bg-background-dark border-gray-600 rounded ${theme.ringPrimary}`}
                                />
                                {s.name}
                            </label>
                            <span className="text-xs text-text-secondary-dark">R$ {s.price.toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {/* Data e Hora */}
                <div className="flex gap-3">
                    <input 
                        type="date" 
                        name="date" 
                        required 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                    />
                    <input 
                        type="time" 
                        name="time" 
                        required 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}>{isSaving ? 'Salvando...' : (isEditing ? 'Salvar' : 'Agendar')}</button>
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