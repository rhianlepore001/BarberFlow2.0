import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Appointment, Service } from '../types';

interface AppointmentDetailsModalProps {
    appointment: Appointment;
    onClose: () => void;
    onSuccess: () => void;
    shopId: number;
    onEditClick: (appointment: Appointment) => void; // Nova prop
}

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ appointment, onClose, onSuccess, shopId, onEditClick }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clientName = appointment.clients?.name || 'Cliente Desconhecido';
    const barberName = appointment.team_members?.name || 'Barbeiro';
    const startTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const services: Service[] = appointment.services_json || [];
    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
    const serviceNames = services.map(s => s.name).join(', ');
    const totalDuration = appointment.duration_minutes;

    const handleCompleteAppointment = async () => {
        setIsProcessing(true);
        setError(null);

        if (!appointment.barberId) {
            setError("Dados de barbeiro ausentes.");
            setIsProcessing(false);
            return;
        }
        
        if (totalAmount <= 0) {
            setError("O valor total do agendamento é zero. Não é possível registrar a transação.");
            setIsProcessing(false);
            return;
        }
        
        // 1. Inserir Transação de Entrada (Income)
        const transactionData = {
            description: serviceNames,
            amount: totalAmount,
            type: 'income',
            transaction_date: new Date().toISOString(),
            shop_id: shopId,
            barber_id: appointment.barberId,
            client_id: appointment.clientId,
        };

        const { error: transactionError } = await supabase.from('transactions').insert([transactionData]);

        if (transactionError) {
            console.error("Error inserting transaction:", transactionError);
            setError(`Falha ao registrar pagamento: ${transactionError.message}`);
            setIsProcessing(false);
            return;
        }

        // 2. Deletar Agendamento (Dar Baixa)
        const { error: deleteError } = await supabase.from('appointments').delete().eq('id', appointment.id);

        if (deleteError) {
            console.error("Error deleting appointment:", deleteError);
            setError(`Pagamento registrado, mas falha ao remover agendamento: ${deleteError.message}`);
            setIsProcessing(false);
            return;
        }

        onSuccess();
    };
    
    const handleCancelAppointment = async () => {
        if (!window.confirm(`Tem certeza que deseja CANCELAR o agendamento de ${clientName} às ${startTime}?`)) return;
        
        setIsProcessing(true);
        setError(null);
        
        const { error: deleteError } = await supabase.from('appointments').delete().eq('id', appointment.id);

        if (deleteError) {
            console.error("Error deleting appointment:", deleteError);
            setError(`Falha ao cancelar agendamento: ${deleteError.message}`);
            setIsProcessing(false);
            return;
        }
        
        onSuccess();
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Detalhes do Agendamento</h2>
            
            <div className="bg-background-dark p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-3xl">person</span>
                    <div>
                        <p className="font-bold text-white">{clientName}</p>
                        <p className="text-sm text-text-secondary-dark">Cliente</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
                    <div>
                        <p className="font-bold text-white">{startTime}</p>
                        <p className="text-sm text-text-secondary-dark">Horário com {barberName}</p>
                    </div>
                </div>
                
                <div className="border-t border-white/10 pt-3">
                    <p className="text-sm font-medium text-text-secondary-dark mb-1">Serviços ({totalDuration} min)</p>
                    <ul className="space-y-1">
                        {services.map((s, index) => (
                            <li key={index} className="flex justify-between text-white text-sm">
                                <span>{s.name}</span>
                                <span className="font-semibold">{formatCurrency(s.price)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div className="flex justify-between items-center border-t border-white/10 pt-3">
                    <p className="text-lg font-bold text-white">Total</p>
                    <p className="text-xl font-extrabold text-primary">{formatCurrency(totalAmount)}</p>
                </div>
            </div>
            
            {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

            <div className="flex gap-3 pt-4">
                <button 
                    type="button" 
                    onClick={() => onEditClick(appointment)} // Novo botão de edição
                    disabled={isProcessing}
                    className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white disabled:opacity-50 hover:bg-gray-600 transition-colors"
                >
                    Modificar
                </button>
                <button 
                    type="button" 
                    onClick={handleCompleteAppointment} 
                    disabled={isProcessing}
                    className="w-full rounded-full bg-green-600 py-3 text-center font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {isProcessing ? 'Dando Baixa...' : 'Dar Baixa'}
                </button>
            </div>
            <div className="!mt-2">
                <button type="button" onClick={handleCancelAppointment} disabled={isProcessing} className="w-full py-2 text-center font-semibold text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">Cancelar Agendamento</button>
            </div>
        </motion.div>
    );
};

export default AppointmentDetailsModal;