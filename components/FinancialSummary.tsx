import React from 'react';
import { motion } from 'framer-motion'; // Importação adicionada
import type { User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils';

interface FinancialSummaryProps {
    dailyRevenue: number;
    dailyGoal: number;
    completedAppointments: number;
    totalAppointments: number;
    nextAppointmentName: string | null;
    onEditGoalClick: () => void;
    user: User;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ dailyRevenue, dailyGoal, completedAppointments, totalAppointments, nextAppointmentName, onEditGoalClick, user }) => {
    const theme = useTheme(user);
    const progress = dailyGoal > 0 ? Math.min((dailyRevenue / dailyGoal) * 100, 100) : 0;
    
    return (
        <div className="rounded-xl bg-card p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary">Faturamento de Hoje</p>
                <i className={`fa-solid fa-chart-line ${theme.primary} text-xl`}></i>
            </div>
            <p className="text-3xl font-extrabold text-text-primary mt-1">{formatCurrency(dailyRevenue, user.currency)}</p>
            
            <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-text-secondary mb-1">
                    <div className="flex items-center gap-1">
                        <span>Meta diária</span>
                        <button onClick={onEditGoalClick} className={`${theme.primary} hover:text-yellow-400 transition-colors`}>
                            <i className="fa-solid fa-edit text-sm"></i>
                        </button>
                    </div>
                    <span>{formatCurrency(dailyGoal, user.currency)}</span>
                </div>
                <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                    <motion.div
                        className={`${theme.bgPrimary} h-2 rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                    />
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                    <p className="text-sm font-medium text-text-secondary">Agendamentos</p>
                    <p className="text-lg font-bold text-text-primary">{completedAppointments} <span className="text-text-secondary text-base font-medium">/ {totalAppointments}</span></p>
                </div>
                <div>
                    <p className="text-sm font-medium text-text-secondary">Próximo Cliente</p>
                    <p className="text-lg font-bold text-text-primary truncate">{nextAppointmentName || 'Nenhum'}</p>
                </div>
            </div>
        </div>
    );
};

export default FinancialSummary;