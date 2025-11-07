import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AppointmentsSection from '../components/AppointmentsSection';
import CashFlowChart from '../components/CashFlowChart';
import FinancialSummary from '../components/FinancialSummary';
import type { User, Appointment, CashFlowDay, TeamMember } from '../types';

interface HomeProps {
    user: User;
    dataVersion: number;
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

const Home: React.FC<HomeProps> = ({ user, dataVersion }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [cashFlowData, setCashFlowData] = useState<CashFlowDay[]>([]);
    const [financials, setFinancials] = useState({
        dailyRevenue: 0,
        dailyGoal: 500, // Assuming a static goal for now
        completedAppointments: 0,
        totalAppointments: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const today = new Date();
            const todayStrStart = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
            const todayStrEnd = today.toISOString().split('T')[0] + 'T23:59:59.999Z';

            const [appointmentsRes, teamMembersRes, transactionsRes] = await Promise.all([
                supabase
                    .from('appointments')
                    .select('*, clients(id, name, image_url), services(id, name), team_members(id, name)')
                    .gte('start_time', todayStrStart)
                    .lte('start_time', todayStrEnd)
                    .order('start_time')
                    .limit(5),
                supabase.from('team_members').select('*'),
                supabase.from('transactions').select('amount, transaction_date, type')
            ]);
            
            // Team Members
            if (teamMembersRes.error) console.error("Error fetching team members:", teamMembersRes.error);
            else setTeamMembers(teamMembersRes.data);

            // Appointments and Financials
            if (appointmentsRes.error) console.error("Error fetching appointments:", appointmentsRes.error);
            else {
                const now = new Date();
                // O tipo já é compatível com a resposta do Supabase com JOINs
                const fetchedAppointments = appointmentsRes.data as unknown as Appointment[];

                setAppointments(fetchedAppointments.map(a => ({
                    ...a,
                    barberId: (a as any).barber_id, // alias
                    startTime: (a as any).start_time,
                })));

                setFinancials(prev => ({
                    ...prev,
                    totalAppointments: fetchedAppointments.length,
                    completedAppointments: fetchedAppointments.filter(a => new Date(a.startTime) < now).length,
                }));
            }
            
            // Cash Flow and Financials
            if (transactionsRes.error) {
                console.error("Error fetching transactions:", transactionsRes.error);
            } else {
                const weeklyFlow: CashFlowDay[] = Array(7).fill(null).map((_, i) => ({ day: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][i], revenue: 0, isCurrent: false }));
                let dailyRevenue = 0;

                transactionsRes.data.forEach((t: any) => {
                    const tDate = new Date(t.transaction_date);
                    if (t.type === 'income') {
                         // Weekly flow
                        const dayIndex = (tDate.getDay() + 6) % 7;
                        weeklyFlow[dayIndex].revenue += t.amount;
                        // Daily revenue
                        if (tDate.toDateString() === today.toDateString()) {
                            dailyRevenue += t.amount;
                        }
                    }
                });
                const currentDayIndex = (today.getDay() + 6) % 7;
                weeklyFlow[currentDayIndex].isCurrent = true;
                setCashFlowData(weeklyFlow);
                setFinancials(prev => ({...prev, dailyRevenue}));
            }

            setLoading(false);
        };

        fetchData();
    }, [dataVersion]);

    if (loading) {
        return <div className="text-center p-10">Carregando...</div>;
    }

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
                    nextAppointmentName={appointments[0]?.clients?.name || null}
                />
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

export default Home;