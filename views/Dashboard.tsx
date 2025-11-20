import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import StatsGrid from '../components/StatsGrid';
import AppointmentsSection from '../components/AppointmentsSection';
import CashFlowChart from '../components/CashFlowChart';
import type { User, Stat, Appointment, CashFlowDay, TeamMember } from '../types';

interface DashboardProps {
    user: User;
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

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const [stats, setStats] = useState<Stat[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [cashFlowData, setCashFlowData] = useState<CashFlowDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const today = new Date();
            const todayStrStart = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
            const todayStrEnd = today.toISOString().split('T')[0] + 'T23:59:59.999Z';
            
            // Calculate start of the current week for chart filtering
            const startOfWeek = getStartOfWeek(today);

            const [appointmentsRes, teamMembersRes, transactionsRes, clientsRes] = await Promise.all([
                supabase.from('appointments').select('*').gte('start_time', todayStrStart).lte('start_time', todayStrEnd).order('start_time').limit(5),
                supabase.from('team_members').select('*'),
                // Fetch transactions only from the start of the current week
                supabase.from('transactions').select('amount, transaction_date, type').gte('transaction_date', startOfWeek.toISOString()),
                supabase.from('clients').select('created_at').gte('created_at', todayStrStart)
            ]);
            
            if (teamMembersRes.error) console.error("Error fetching team members:", teamMembersRes.error);
            else setTeamMembers(teamMembersRes.data.map((t: any) => ({...t, imageUrl: t.image_url})));

            let completedAppointments = 0;
            if (appointmentsRes.error) console.error("Error fetching appointments:", appointmentsRes.error);
            else {
                const now = new Date();
                setAppointments(appointmentsRes.data.map((a: any) => ({ 
                    ...a, 
                    id: a.id, 
                    barberId: a.barber_id, 
                    imageUrl: a.image_url, 
                    startTime: a.start_time
                })));
                completedAppointments = appointmentsRes.data.filter(a => new Date(a.start_time) < now).length;
            }

            let newClientsToday = 0;
            if (clientsRes.error) console.error("Error fetching new clients:", clientsRes.error);
            else {
                newClientsToday = clientsRes.data.length;
            }
            
            if (transactionsRes.error) {
                console.error("Error fetching transactions:", transactionsRes.error);
            } else {
                const weeklyFlow: CashFlowDay[] = Array(7).fill(null).map((_, i) => ({ day: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][i], revenue: 0, isCurrent: false }));
                let dailyRevenue = 0;

                transactionsRes.data.forEach((t: any) => {
                    const tDate = new Date(t.transaction_date);
                    if (t.type === 'income') {
                        const dayIndex = (tDate.getDay() + 6) % 7;
                        // Now only processes transactions from the current week
                        weeklyFlow[dayIndex].revenue += t.amount;
                        if (tDate.toDateString() === today.toDateString()) {
                            dailyRevenue += t.amount;
                        }
                    }
                });
                const currentDayIndex = (today.getDay() + 6) % 7;
                weeklyFlow[currentDayIndex].isCurrent = true;
                setCashFlowData(weeklyFlow);
                
                setStats([
                    { icon: 'attach_money', value: `R$ ${dailyRevenue.toFixed(2).replace('.',',')}`, label: 'Faturamento' },
                    { icon: 'cut', value: `${completedAppointments}`, label: 'Cortes Concluídos' },
                    { icon: 'person_add', value: `${newClientsToday}`, label: 'Novos Clientes' }
                ]);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full text-text-primary">Carregando...</div>;
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-6"
        >
            <motion.div variants={itemVariants} className="px-4 pb-4 pt-4">
                <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">Bom dia, {user.name}!</h2>
                <p className="text-base text-text-secondary">Sua agenda de hoje está movimentada.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="px-4 pb-3">
                <h3 className="pb-3 text-xl font-bold tracking-tight text-text-primary">Resumo do Dia</h3>
                <StatsGrid stats={stats} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <AppointmentsSection appointments={appointments} teamMembers={teamMembers} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <CashFlowChart data={cashFlowData} />
            </motion.div>
        </motion.div>
    );
};

export default Dashboard;