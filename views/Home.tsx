import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AppointmentsSection from '../components/AppointmentsSection';
import CashFlowChart from '../components/CashFlowChart';
import FinancialSummary from '../components/FinancialSummary';
import WeekSelector from '../components/WeekSelector';
import type { User, Appointment, CashFlowDay, TeamMember, View } from '../types';

interface HomeProps {
    user: User;
    dataVersion: number;
    setActiveView: (view: View) => void;
    openModal: (content: 'editDailyGoal') => void;
    onAppointmentSelect: (appointment: Appointment) => void; // Nova prop
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
        dailyRevenue: 0,
        dailyGoal: 500,
        completedAppointments: 0,
        totalAppointments: 0,
    });
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0); // 0 = Current week, -1 = Last week

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const nowISO = new Date().toISOString(); // Ponto de partida: Agora
            const today = new Date();
            const todayStrStart = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
            
            // Calculate start of the current week for daily stats (always today's week)
            const startOfCurrentWeek = getStartOfWeek(today);
            
            // Calculate start of the selected week for cash flow chart
            const startOfSelectedWeek = getStartOfWeekByOffset(weekOffset);
            const endOfSelectedWeek = new Date(startOfSelectedWeek);
            endOfSelectedWeek.setDate(startOfSelectedWeek.getDate() + 6);
            endOfSelectedWeek.setHours(23, 59, 59, 999);

            const [appointmentsRes, teamMembersRes, transactionsRes, settingsRes] = await Promise.all([
                // Appointments from NOW onwards (Next 5 appointments)
                supabase
                    .from('appointments')
                    .select('*, clients(id, name, image_url), team_members(id, name)')
                    .gte('start_time', nowISO) // Busca a partir de agora
                    .order('start_time')
                    .limit(5),
                supabase.from('team_members').select('*'),
                // Fetch transactions for the SELECTED week
                supabase.from('transactions').select('amount, transaction_date, type').gte('transaction_date', startOfSelectedWeek.toISOString()).lte('transaction_date', endOfSelectedWeek.toISOString()),
                supabase.from('shop_settings').select('daily_goal').eq('shop_id', user.shopId).limit(1).single()
            ]);
            
            // Team Members
            if (teamMembersRes.error) console.error("Error fetching team members:", teamMembersRes.error);
            else setTeamMembers(teamMembersRes.data);

            // Shop Settings (Daily Goal)
            let dailyGoal = 500;
            if (settingsRes.data && settingsRes.data.daily_goal !== null) {
                dailyGoal = settingsRes.data.daily_goal;
            } else if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
                console.error("Error fetching shop settings:", settingsRes.error);
            }

            // Appointments and Financials (Today's stats)
            if (appointmentsRes.error) console.error("Error fetching appointments:", appointmentsRes.error);
            else {
                const now = new Date();
                const fetchedAppointments = appointmentsRes.data as unknown as Appointment[];

                setAppointments(fetchedAppointments.map(a => {
                    // Determina o nome do serviço principal para o resumo
                    const serviceName = a.services_json && a.services_json.length > 0 ? a.services_json[0].name : 'Serviço';
                    
                    return {
                        ...a,
                        barberId: (a as any).barber_id,
                        startTime: (a as any).start_time,
                        // Adiciona um campo temporário para o nome do serviço principal para o FinancialSummary
                        mainServiceName: serviceName 
                    };
                }));

                // Para o resumo financeiro, precisamos contar os agendamentos CONCLUÍDOS HOJE
                // Vamos buscar todos os agendamentos de hoje para calcular os concluídos
                const { data: todayAppointmentsData } = await supabase
                    .from('appointments')
                    .select('start_time')
                    .gte('start_time', todayStrStart)
                    .lte('start_time', today.toISOString().split('T')[0] + 'T23:59:59.999Z');
                
                const totalAppointmentsToday = todayAppointmentsData?.length || 0;
                const completedAppointmentsToday = todayAppointmentsData?.filter(a => new Date(a.start_time) < now).length || 0;


                setFinancials(prev => ({
                    ...prev,
                    dailyGoal,
                    totalAppointments: totalAppointmentsToday,
                    completedAppointments: completedAppointmentsToday,
                }));
            }
            
            // Cash Flow (Selected Week)
            if (transactionsRes.error) {
                console.error("Error fetching transactions:", transactionsRes.error);
            } else {
                // Initialize weekly flow for 7 days (Mon-Sun)
                const weeklyFlow: CashFlowDay[] = Array(7).fill(null).map((_, i) => ({ day: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][i], revenue: 0, isCurrent: false }));
                let dailyRevenue = 0; // This should only calculate today's revenue from the current week's transactions

                transactionsRes.data.forEach((t: any) => {
                    const tDate = new Date(t.transaction_date);
                    if (t.type === 'income') {
                         // Weekly flow: (tDate.getDay() + 6) % 7 maps Sun(0) to 6, Mon(1) to 0, etc.
                        const dayIndex = (tDate.getDay() + 6) % 7;
                        
                        // Only update the weekly flow if the transaction falls within the selected week
                        if (tDate >= startOfSelectedWeek && tDate <= endOfSelectedWeek) {
                            weeklyFlow[dayIndex].revenue += t.amount;
                        }
                        
                        // Daily revenue calculation must only use transactions from TODAY
                        if (weekOffset === 0 && tDate.toDateString() === today.toDateString()) {
                            dailyRevenue += t.amount;
                        }
                    }
                });
                
                // Mark current day only if viewing the current week
                if (weekOffset === 0) {
                    const currentDayIndex = (today.getDay() + 6) % 7;
                    weeklyFlow[currentDayIndex].isCurrent = true;
                }
                
                setCashFlowData(weeklyFlow);
                // Update daily revenue only if viewing the current week, otherwise keep the previous state or recalculate based on current week's transactions
                if (weekOffset === 0) {
                    setFinancials(prev => ({...prev, dailyRevenue, dailyGoal}));
                } else {
                    // If viewing past/future week, dailyRevenue is irrelevant for the summary card, but we update the goal
                    setFinancials(prev => ({...prev, dailyGoal}));
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [dataVersion, user.shopId, weekOffset]); // Recarrega quando weekOffset muda

    if (loading) {
        return <div className="text-center p-10">Carregando...</div>;
    }
    
    const startOfSelectedWeek = getStartOfWeekByOffset(weekOffset);
    const endOfSelectedWeek = new Date(startOfSelectedWeek);
    endOfSelectedWeek.setDate(startOfSelectedWeek.getDate() + 6);
    
    const weekLabel = weekOffset === 0 
        ? 'Esta Semana' 
        : `${startOfSelectedWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endOfSelectedWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

    // Determina o nome do próximo agendamento
    const nextAppointmentName = appointments[0]?.clients?.name || null;
    
    const handleAppointmentClick = (appointment: Appointment) => {
        // 1. Mudar para a view 'agenda'
        setActiveView('agenda');
        // 2. Abrir o modal de detalhes/edição
        onAppointmentSelect(appointment);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-6"
        >
            <motion.div variants={itemVariants} className="px-4 pb-4 pt-4">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">{user.shopName}</h2>
                <p className="text-base text-text-secondary-dark">Bem-vindo(a) ao seu painel de gestão. Foco total nos resultados de hoje!</p>
            </motion.div>

            <motion.div variants={itemVariants} className="px-4 pb-3">
                <FinancialSummary 
                    dailyRevenue={financials.dailyRevenue}
                    dailyGoal={financials.dailyGoal}
                    completedAppointments={financials.completedAppointments}
                    totalAppointments={financials.totalAppointments}
                    nextAppointmentName={nextAppointmentName}
                    onEditGoalClick={() => openModal('editDailyGoal')}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <AppointmentsSection 
                    appointments={appointments} 
                    teamMembers={teamMembers} 
                    onViewAllClick={() => setActiveView('agenda')}
                    onAppointmentClick={handleAppointmentClick} // Passa a nova função
                />
            </motion.div>

            <motion.div variants={itemVariants} className="px-4 pb-3 pt-6">
                <h3 className="text-xl font-bold tracking-tight text-white">Fluxo de Caixa</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="px-4">
                <WeekSelector 
                    weekOffset={weekOffset} 
                    setWeekOffset={setWeekOffset} 
                    currentWeekLabel={weekLabel}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <CashFlowChart data={cashFlowData} onDetailsClick={() => setActiveView('caixa')} />
            </motion.div>
        </motion.div>
    );
};

export default Home;