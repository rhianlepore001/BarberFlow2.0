import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Appointment } from '../types';

interface AppointmentDetailsModalProps {
    appointment: Appointment;
    onClose: () => void;
    onSuccess: () => void;
    shopId: number;
}

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ appointment, onClose, onSuccess, shopId }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clientName = appointment.clients?.name || 'Cliente Desconhecido';
    const serviceName = appointment.services?.name || 'Serviço';
    const barberName = appointment.team_members?.name || 'Barbeiro';
    const startTime = new Date(appointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Nota: O preço do serviço não está diretamente no objeto Appointment, mas o service_id está.
    // Para simplificar, vamos buscar o preço do serviço antes de dar baixa.
    // No entanto, se o preço for fixo, podemos buscar o preço do serviço no momento da baixa.
    // Vamos assumir que o preço do serviço é necessário para a transação.

    const handleCompleteAppointment = async () => {
        setIsProcessing(true);
        setError(null);

        if (!appointment.serviceId || !appointment.barberId) {
            setError("Dados de serviço ou barbeiro ausentes.");
            setIsProcessing(false);
            return;
        }
        
        // 1. Buscar o preço do serviço
        const { data: serviceData, error: serviceError } = await supabase
            .from('services')
            .select('price')
            .eq('id', appointment.serviceId)
            .limit(1)
            .single();

        if (serviceError || !serviceData) {
            console.error("Error fetching service price:", serviceError);
            setError("Não foi possível obter o preço do serviço.");
            setIsProcessing(false);
            return;
        }
        
        const price = serviceData.price;
        
        // 2. Inserir Transação de Entrada (Income)
        const transactionData = {
            description: `${serviceName} - ${clientName}`,
            amount: price,
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

        // 3. Deletar Agendamento (Dar Baixa)
        const { error: deleteError } = await supabase.from('appointments').delete().eq('id', appointment.id);

        if (deleteError) {
            console.error("Error deleting appointment:", deleteError);
            // Se a transação foi salva, mas o agendamento não foi deletado, é um problema menor.
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
                    <span className="material-symbols-outlined text-primary text-3xl">content_cut</span>
                    <div>
                        <p className="font-bold text-white">{serviceName}</p>
                        <p className="text-sm text-text-secondary-dark">Serviço</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
                    <div>
                        <p className="font-bold text-white">{startTime}</p>
                        <p className="text-sm text-text-secondary-dark">Horário com {barberName}</p>
                    </div>
                </div>
            </div>
            
            {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

            <div className="flex gap-3 pt-4">
                <button 
                    type="button" 
                    onClick={handleCancelAppointment} 
                    disabled={isProcessing}
                    className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white disabled:opacity-50"
                >
                    {isProcessing ? 'Processando...' : 'Cancelar'}
                </button>
                <button 
                    type="button" 
                    onClick={handleCompleteAppointment} 
                    disabled={isProcessing}
                    className="w-full rounded-full bg-green-600 py-3 text-center font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {isProcessing ? 'Dando Baixa...' : 'Dar Baixa (Concluir & Pagar)'}
                </button>
            </div>
        </motion.div>
    );
};

export default AppointmentDetailsModal;