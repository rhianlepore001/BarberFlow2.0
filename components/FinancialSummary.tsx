import React from 'react';
import { motion } from 'framer-motion';

interface FinancialSummaryProps {
    dailyRevenue: number;
    dailyGoal: number;
    completedAppointments: number;
    totalAppointments: number;
    nextAppointmentName: string | null;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ dailyRevenue, dailyGoal, completedAppointments, totalAppointments, nextAppointmentName }) => {
    const progress = dailyGoal > 0 ? Math.min((dailyRevenue / dailyGoal) * 100, 100) : 0;
    
    const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

    return (
        <div className="rounded-xl bg-card-dark p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary-dark">Faturamento de Hoje</p>
                <span className="material-symbols-outlined text-primary text-xl">monitoring</span>
            </div>
            <p className="text-3xl font-extrabold text-white mt-1">{formatCurrency(dailyRevenue)}</p>
            
            <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-text-secondary-dark mb-1">
                    <span>Meta diária</span>
                    <span>{formatCurrency(dailyGoal)}</span>
                </div>
                <div className="w-full bg-background-dark rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="bg-primary h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                    />
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                    <p className="text-sm font-medium text-text-secondary-dark">Agendamentos</p>
                    <p className="text-lg font-bold text-white">{completedAppointments} <span className="text-text-secondary-dark text-base font-medium">/ {totalAppointments}</span></p>
                </div>
                <div>
                    <p className="text-sm font-medium text-text-secondary-dark">Próximo Cliente</p>
                    <p className="text-lg font-bold text-white truncate">{nextAppointmentName || 'Nenhum'}</p>
                </div>
            </div>
        </div>
    );
};

export default FinancialSummary;
