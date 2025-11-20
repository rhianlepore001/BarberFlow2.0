import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// import { supabase } from '../lib/supabaseClient'; // Removido
import StatsGrid from '../components/StatsGrid';
import AppointmentsSection from '../components/AppointmentsSection';
import CashFlowChart from '../components/CashFlowChart';
import type { User, Stat, Appointment, CashFlowDay, TeamMember } from '../types';
import { getMockAppointments, getMockTeamMembers, getMockCashFlow, getMockClients } from '../lib/mockData'; // Importa dados mockados

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

            // Simulação de dados
            const mockAppointmentsData = getMockAppointments();
            const mockTeamMembersData = getMockTeamMembers();
            const mockTransactionsData = getMockCashFlow(); // Retorna CashFlowDay[]
            const mockClientsData = getMockClients();

            setTeamMembers(mockTeamMembersData.map((t: any) => ({...t, imageUrl: t.image_url})));

            let completedAppointments = 0;
            // Filtrar agendamentos mockados para hoje e limitar
            const todayAppointments = mockAppointmentsData.filter(a => {
                const apptDate = new Date(a.startTime);
                return apptDate.toDateString() === today.toDateString();
            }).slice(0, 5); // Limita a 5 agendamentos
            
            setAppointments(todayAppointments.map((a: any) => ({ 
                ...a, 
                id: a.id, 
                barberId: a.barberId, 
                imageUrl: a.imageUrl, 
                startTime: a.startTime
            })));
            completedAppointments = todayAppointments.filter(a => new Date(a.startTime) < today).length;

            let newClientsToday = 0;
            // Filtrar clientes mockados criados hoje
            newClientsToday = mockClientsData.filter(c => {
                const clientCreationDate = new Date(c.lastVisitRaw || ''); // Usando lastVisitRaw como proxy para created_at
                return clientCreationDate.toDateString() === today.toDateString();
            }).length;
            
            const weeklyFlow: CashFlowDay[] = Array(7).fill(null).map((_, i) => ({ day: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][i], revenue: 0, isCurrent: false }));
            let dailyRevenue = 0;

            // Usar mockTransactionsData (que já é CashFlowDay[])
            // Ajustar o isCurrent com base no dia atual
            const currentDayIndex = (today.getDay() + 6) % 7; // Segunda=0, Domingo=6
            const updatedWeeklyFlow = mockTransactionsData.map((day, index) => {
                const isCurrent = (currentDayIndex === index);
                if (isCurrent) {
                    dailyRevenue = day.revenue; // Assumindo que o mock já tem a receita do dia
                }
                return { ...day, isCurrent };
            });
            setCashFlowData(updatedWeeklyFlow);
            
            setStats([
                { icon: 'attach_money', value: `R$ ${dailyRevenue.toFixed(2).replace('.',',')}`, label: 'Faturamento' },
                { icon: 'cut', value: `${completedAppointments}`, label: 'Cortes Concluídos' },
                { icon: 'person_add', value: `${newClientsToday}`, label: 'Novos Clientes' }
            ]);

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
                <StatsGrid stats={stats} user={user} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <AppointmentsSection appointments={appointments} teamMembers={teamMembers} onViewAllClick={() => {}} onAppointmentClick={() => {}} user={user} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <CashFlowChart data={cashFlowData} onDetailsClick={() => {}} user={user} />
            </motion.div>
        </motion.div>
    );
};

export default Dashboard;