import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AppointmentsSection from '../components/AppointmentsSection';
import CashFlowChart from '../components/CashFlowChart';
import FinancialSummary from '../components/FinancialSummary';
import WeekSelector from '../components/WeekSelector';
import type { User, Appointment, CashFlowDay, TeamMember, View } from '../types';
import { useShopLabels } from '../hooks/useShopLabels';
import { useTheme } from '../hooks/useTheme';
import { getMockAppointments, getMockCashFlow, getMockTeamMembers } from '../lib/mockData';

interface HomeProps {
    user: User;
    dataVersion: number;
    setActiveView: (view: View) => void;
    openModal: (content: 'editDailyGoal') => void;
    onAppointmentSelect: (appointment: Appointment) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// Helper function to get the start of the current calendar week (Monday)
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper function to get the start of the week based on offset
const getStartOfWeekByOffset = (offset: number): Date => {
    const today = new Date();
    const date = new Date(today);
    date.setDate(today.getDate() + offset * 7);
    return getStartOfWeek(date);
};

const Home: React.FC<HomeProps> = ({ user, dataVersion, setActiveView, openModal, onAppointmentSelect }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [cashFlowData, setCashFlowData] = useState<CashFlowDay[]>([]);
    const [financials, setFinancials] = useState({
        dailyRevenue: 450, // Mocked
        dailyGoal: 500,
        completedAppointments: 3,
        totalAppointments: 5,
    });
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0);
    const shopLabels = useShopLabels(user.shopType);
    const theme = useTheme(user);

    useEffect(() => {
        // Simulação de busca de dados
        setLoading(true);
        
        // Mock Data
        const mockAppts = getMockAppointments();
        const mockTeam = getMockTeamMembers();
        const mockCash = getMockCashFlow();
        
        setAppointments(mockAppts);
        setTeamMembers(mockTeam);
        
        // Simulação de fluxo de caixa semanal (ajustando o isCurrent com base no offset)
        const today = new Date();
        const updatedCashFlow = mockCash.map((day, index) => ({
            ...day,
            isCurrent: weekOffset === 0 && (today.getDay() + 6) % 7 === index
        }));
        setCashFlowData(updatedCashFlow);
        
        // Simulação de faturamento diário
        const currentDayRevenue = updatedCashFlow.find(d => d.isCurrent)?.revenue || 450;
        
        setFinancials(prev => ({
            ...prev,
            dailyRevenue: currentDayRevenue,
            dailyGoal: 500, // Mantendo mockado por enquanto
            completedAppointments: 3,
            totalAppointments: 5,
        }));

        setLoading(false);
    }, [dataVersion, weekOffset]);

    if (loading) {
        return <div className="text-center p-10">Carregando...</div>;
    }
    
    const startOfSelectedWeek = getStartOfWeekByOffset(weekOffset);
    const endOfSelectedWeek = new Date(startOfSelectedWeek);
    endOfSelectedWeek.setDate(startOfSelectedWeek.getDate() + 6);
    
    const weekLabel = weekOffset === 0 
        ? 'Esta Semana' 
        : `${startOfSelectedWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endOfSelectedWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

    const nextAppointmentName = appointments[0]?.clients?.name || null;
    
    const handleAppointmentClick = (appointment: Appointment) => {
        setActiveView('agenda');
        onAppointmentSelect(appointment);
    };
    
    const handleGamificationClick = () => {
        if (user.shopType === 'barbearia') {
            alert("Simulação: Enviando mensagens de 'Encher Cadeira Agora' via WhatsApp!");
        } else {
            alert("Simulação: Disparando campanha de 'Recall de Clientes' para clientes em risco!");
        }
    };

    const gamificationButtonText = user.shopType === 'barbearia' ? 'ENCHER CADEIRA AGORA' : 'RECALL DE CLIENTES';
    const gamificationButtonIcon = user.shopType === 'barbearia' ? 'fa-bolt' : 'fa-rotate-right';

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-6"
        >
            <motion.div variants={itemVariants} className="px-4 pb-4 pt-4">
                <h2 className="text-3xl font-extrabold tracking-tight text-text-primary flex items-center gap-2">
                    {user.shopName} {shopLabels.shopTypeEmoji}
                </h2>
                <p className="text-base text-text-secondary">Bem-vindo(a) ao seu painel de gestão. Foco total nos resultados de hoje!</p>
            </motion.div>

            {/* Botão de Gamificação (Destaque Total) */}
            <motion.div variants={itemVariants} className="px-4 pb-4">
                <button
                    onClick={handleGamificationClick}
                    className={`w-full rounded-xl ${theme.bgPrimary} py-4 text-center font-extrabold text-background shadow-xl ${theme.shadowPrimary} transition-transform duration-200 hover:scale-[1.01] flex items-center justify-center gap-3`}
                >
                    <i className={`fa-solid ${gamificationButtonIcon} text-2xl`}></i>
                    <span className="text-lg">{gamificationButtonText}</span>
                </button>
            </motion.div>

            <motion.div variants={itemVariants} className="px-4 pb-3">
                <FinancialSummary 
                    dailyRevenue={financials.dailyRevenue}
                    dailyGoal={financials.dailyGoal}
                    completedAppointments={financials.completedAppointments}
                    totalAppointments={financials.totalAppointments}
                    nextAppointmentName={nextAppointmentName}
                    onEditGoalClick={() => openModal('editDailyGoal')}
                    user={user}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <AppointmentsSection 
                    appointments={appointments} 
                    teamMembers={teamMembers} 
                    onViewAllClick={() => setActiveView('agenda')}
                    onAppointmentClick={handleAppointmentClick}
                    user={user}
                />
            </motion.div>

            <motion.div variants={itemVariants} className="px-4 pb-3 pt-6">
                <h3 className="text-xl font-bold tracking-tight text-text-primary">Fluxo de Caixa</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="px-4">
                <WeekSelector 
                    weekOffset={weekOffset} 
                    setWeekOffset={setWeekOffset} 
                    currentWeekLabel={weekLabel}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <CashFlowChart data={cashFlowData} onDetailsClick={() => setActiveView('caixa')} user={user} />
            </motion.div>
        </motion.div>
    );
};

export default Home;