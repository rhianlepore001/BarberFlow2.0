import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils';

interface BookingConfirmationProps {
    selectedBarber: TeamMember;
    clientSession: any;
    selectedServices: Service[];
    totalDuration: number;
    totalPrice: number;
    selectedDate: Date;
    selectedTime: string;
    onSuccess: () => void;
    onBack: () => void;
    theme: ReturnType<typeof useTheme>;
    user: User;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ 
    selectedBarber, 
    clientSession, 
    selectedServices, 
    totalDuration, 
    totalPrice, 
    selectedDate, 
    selectedTime, 
    onSuccess, 
    onBack, 
    theme,
    user
}) => {
    const [isBooking, setIsBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const clientName = clientSession.user.user_metadata?.name || clientSession.user.email;
    
    const handleConfirm = async () => {
        setIsBooking(true);
        setError(null);
        
        const start_time = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTime}:00`).toISOString();
        const servicesToSave = selectedServices.map(s => ({ id: s.id, name: s.name, price: s.price, duration_minutes: s.duration_minutes }));
        
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, tenant_id')
            .eq('auth_user_id', clientSession.user.id)
            .limit(1)
            .single();
            
        if (clientError || !clientData) {
            setError("Erro ao identificar seu perfil de cliente. Tente fazer login novamente.");
            setIsBooking(false);
            return;
        }
        
        if (!clientData.tenant_id) {
            await supabase.from('clients').update({ tenant_id: selectedBarber.shop_id }).eq('id', clientData.id);
        }
        
        const appointmentData = {
            start_time,
            professional_id: selectedBarber.id,
            client_id: clientData.id,
            duration_minutes: totalDuration, 
            services_json: servicesToSave,
            tenant_id: selectedBarber.shop_id,
        };
        
        const { error: dbError } = await supabase.from('appointments').insert([appointmentData]);
        
        if (dbError) {
            let errorMessage = `Falha ao agendar: ${dbError.message}. Tente outro horário.`;
            if (dbError.message.includes('Conflito de agendamento')) {
                 errorMessage = "Conflito de horário! Este horário foi reservado. Por favor, selecione outro slot.";
            }
            setError(errorMessage);
        } else {
            onSuccess();
        }
        setIsBooking(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-lg font-bold text-white">3. Confirmação</h2>
            <div className="bg-background-dark p-4 rounded-xl space-y-3">
                <p className="text-sm font-medium text-text-secondary-dark">Resumo do Agendamento</p>
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${theme.primary} text-3xl`}>schedule</span>
                    <div>
                        <p className="font-bold text-white">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                        <p className="text-sm text-text-secondary-dark">Às {selectedTime} ({totalDuration} min)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${theme.primary} text-3xl`}>content_cut</span>
                    <div>
                        <p className="font-bold text-white">{selectedBarber.name}</p>
                        <p className="text-sm text-text-secondary-dark">Seu profissional</p>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-3">
                    <p className="text-sm font-medium text-text-secondary-dark mb-1">Serviços Selecionados</p>
                    <ul className="space-y-1">
                        {selectedServices.map((s, index) => (
                            <li key={index} className="flex justify-between text-white text-sm">
                                <span>{s.name}</span>
                                <span className="font-semibold">{formatCurrency(s.price, user.currency)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-3">
                    <p className="text-lg font-bold text-white">Total Estimado</p>
                    <p className={`text-xl font-extrabold ${theme.primary}`}>{formatCurrency(totalPrice, user.currency)}</p>
                </div>
            </div>
            <p className="text-sm text-text-secondary-dark text-center">Você está agendando como <span className="font-bold text-white">{clientName}</span>.</p>
            {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}
            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onBack} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white hover:bg-gray-600 transition-colors">Voltar</button>
                <button type="button" onClick={handleConfirm} disabled={isBooking} className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark hover:${theme.bgPrimary}/80 transition-colors disabled:opacity-50`}>
                    {isBooking ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
            </div>
        </motion.div>
    );
};

export default BookingConfirmation;