import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AppointmentsSection from '../components/AppointmentsSection';
import CashFlowChart from '../components/CashFlowChart';
import FinancialSummary from '../components/FinancialSummary';
import WeekSelector from '../components/WeekSelector';
import type { User, Appointment, CashFlowDay, TeamMember, View } from '../types';
import { useShopLabels } from '../hooks/useShopLabels';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabaseClient';

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

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getStartOfWeekByOffset = (offset: number): Date => {
    const today = new Date();
    const date = new Date(today);
    date.setDate(today.getDate() + offset * 7);
    return getStartOfWeek(date);
};

interface HomeProps {
    user: User;
    dataVersion: number;
    setActiveView: (view: View) => void;
    openModal: (content: 'editDailyGoal') => void;
    onAppointmentSelect: (appointment: Appointment) => void;
}

const Home: React.FC<HomeProps> = ({ user, dataVersion, setActiveView, openModal, onAppointmentSelect }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [cashFlowData, setCashFlowData] = useState<CashFlowDay[]>([]);
    const [financials, setFinancials] = useState({
        dailyRevenue: 0,
        dailyGoal: 0,
        completedAppointments: 0,
        totalAppointments: 0,
    });
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0);
    const shopLabels = useShopLabels(user.business_type);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            if (!user) return;

            const today = new Date();
            const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
            const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

            const [settingsRes, appointmentsRes, teamMembersRes] = await Promise.all([
                supabase.from('shop_settings').select('daily_goal').eq('tenant_id', user.tenant_id).single(),
                supabase.from('appointments').select('*, clients(id, name, image_url)').eq('tenant_id', user.tenant_id).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(10),
                supabase.from('team_members').select('*').eq('tenant_id', user.tenant_id)
            ]);

            setAppointments(appointmentsRes.data as any || []);
            setTeamMembers(teamMembersRes.data || []);

            const startOfSelectedWeek = getStartOfWeekByOffset(weekOffset);
            const endOfSelectedWeek = new Date(startOfSelectedWeek);
            endOfSelectedWeek.setDate(startOfSelectedWeek.getDate() + 6);
            endOfSelectedWeek.setHours(23, 59, 59, 999);

            const { data: transactionsData } = await supabase
                .from('transactions')
                .select('amount, transaction_date, type')
                .eq('tenant_id', user.tenant_id)
                .gte('transaction_date', startOfSelectedWeek.toISOString())
                .lte('transaction_date', endOfSelectedWeek.toISOString());

            const daysOfWeek = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
            const weeklyCashFlow: CashFlowDay[] = daysOfWeek.map((day, index) => {
                const dateForDay = new Date(startOfSelectedWeek);
                dateForDay.setDate(startOfSelectedWeek.getDate() + index);
                
                const revenueForDay = (transactionsData || [])
                    .filter(t => new Date(t.transaction_date).toDateString() === dateForDay.toDateString() && t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);

                return { day, revenue: revenueForDay, isCurrent: weekOffset === 0 && (new Date().getDay() + 6) % 7 === index };
            });
            setCashFlowData(weeklyCashFlow);

            const dailyRevenue = weeklyCashFlow.find(d => d.isCurrent)?.revenue || 0;
            
            const { data: todayAppointments, count: totalAppointments } = await supabase
                .from('appointments')
                .select('id, status', { count: 'exact' })
                .eq('tenant_id', user.tenant_id)
                .gte('start_time', todayStart.toISOString())
                .lt('start_time', todayEnd.toISOString());

            const completedAppointments = todayAppointments?.filter(a => a.status === 'completed').length || 0;

            setFinancials({
                dailyRevenue,
                dailyGoal: settingsRes.data?.daily_goal || 0,
                completedAppointments,
                totalAppointments: totalAppointments || 0,
            });

            setLoading(false);
        };

        fetchData();
    }, [user, dataVersion, weekOffset]);

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
        if (user.business_type === 'barbearia') {
            alert("Simulação: Enviando mensagens de 'Encher Cadeira Agora' via WhatsApp!");
        } else {
            alert("Simulação: Disparando campanha de 'Recall de Clientes' para clientes em risco!");
        }
    };

    const gamificationButtonText = user.business_type === 'barbearia' ? 'ENCHER CADEIRA AGORA' : 'RECALL DE CLIENTES';
    const gamificationButtonIcon = user.business_type === 'barbearia' ? 'fa-bolt' : 'fa-rotate-right';

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-6"
        >
            <motion.div variants={itemVariants} className="px-4 pb-4 pt-4">
                <h2 className="text-3xl font-extrabold tracking-tight text-text-primary flex items-center gap-2">
                    {user.tenant_name} {shopLabels.shopTypeEmoji}
                </h2>
                <p className="text-base text-text-secondary">Bem-vindo(a) ao seu painel de gestão. Foco total nos resultados de hoje!</p>
            </motion.div>

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