import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { PeriodData } from '../types';
import PerformanceChart from '../components/PerformanceChart';
import GeminiInsightCard from '../components/GeminiInsightCard';
import GeminiForecastCard from '../components/GeminiForecastCard';

type Period = 'week' | 'month' | 'year';

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

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const PeriodSelector: React.FC<{ selectedPeriod: Period; setPeriod: (p: Period) => void }> = ({ selectedPeriod, setPeriod }) => {
    const periods: { label: string; value: Period }[] = [
        { label: 'Semana', value: 'week' },
        { label: 'Mês', value: 'month' },
        { label: 'Ano', value: 'year' },
    ];
    return (
        <div className="flex justify-center items-center bg-card-dark p-1 rounded-full">
            {periods.map(period => (
                 <button 
                    key={period.value}
                    onClick={() => setPeriod(period.value)}
                    className={`relative w-full text-sm font-bold py-2 rounded-full transition-colors ${selectedPeriod === period.value ? 'text-background-dark' : 'text-text-secondary-dark'}`}
                >
                    {selectedPeriod === period.value && (
                        <motion.div
                            layoutId="period-selector-active"
                            className="absolute inset-0 bg-primary rounded-full z-0"
                        />
                    )}
                    <span className="relative z-10">{period.label}</span>
                </button>
            ))}
        </div>
    );
};

const KPICard: React.FC<{ label: string; value: string; percentageChange: number }> = ({ label, value, percentageChange }) => {
    const isPositive = percentageChange >= 0;
    return (
        <div className="bg-card-dark p-3 rounded-xl flex-1">
            <p className="text-xs text-text-secondary-dark">{label}</p>
            <p className="text-lg font-bold text-white">{value}</p>
            <div className={`flex items-center text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span className="material-symbols-outlined text-sm">{isPositive ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(percentageChange).toFixed(1)}%</span>
            </div>
        </div>
    )
}

interface AnalysisProps {
    dataVersion: number;
}

// Helper function to calculate date ranges
const getDateRanges = (period: Period) => {
    const now = new Date();
    let startDate: Date, previousStartDate: Date, endDate: Date, previousEndDate: Date;

    if (period === 'week') {
        const currentDay = new Date(now);
        const dayOfWeek = currentDay.getDay() === 0 ? 6 : currentDay.getDay() - 1; // 0=Mon, 6=Sun
        startDate = new Date(currentDay);
        startDate.setDate(currentDay.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(startDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);

    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else { // year
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    }
    
    return { startDate, endDate, previousStartDate, previousEndDate };
};

const Analysis: React.FC<AnalysisProps> = ({ dataVersion }) => {
    const [period, setPeriod] = useState<Period>('month');
    const [data, setData] = useState<PeriodData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDataForPeriod = async () => {
            setLoading(true);
            setData(null);

            const { startDate, endDate, previousStartDate, previousEndDate } = getDateRanges(period);
            
            // Fetch all relevant data covering both current and previous periods
            const [transactionsRes, clientsRes, appointmentsRes] = await Promise.all([
                 supabase.from('transactions').select('amount, type, transaction_date, client_id').gte('transaction_date', previousStartDate.toISOString()).lte('transaction_date', endDate.toISOString()),
                 supabase.from('clients').select('id, name, created_at'),
                 supabase.from('appointments').select('services(name), start_time').gte('start_time', startDate.toISOString()).lte('start_time', endDate.toISOString())
            ]);

            const reqError = transactionsRes.error || clientsRes.error || appointmentsRes.error;
            if (reqError) {
                console.error("Error fetching analysis data:", reqError);
                setLoading(false);
                return;
            }
            
            // Define types for fetched data
            type TransactionData = {amount: number; type: 'income' | 'expense'; transaction_date: string; client_id: number | null};
            type ClientData = {id: number; name: string; created_at: string};
            type AppointmentData = {services: {name: string} | null; start_time: string};

            const allTransactions: TransactionData[] = transactionsRes.data || [];
            const allClients: ClientData[] = clientsRes.data || [];
            const currentAppointments: AppointmentData[] = appointmentsRes.data || [];

            // --- 1. Filter Transactions for Current and Previous Periods (Income only) ---
            const currentPeriodIncome = allTransactions.filter(t => new Date(t.transaction_date) >= startDate && t.type === 'income');
            const previousPeriodIncome = allTransactions.filter(t => new Date(t.transaction_date) >= previousStartDate && new Date(t.transaction_date) <= previousEndDate && t.type === 'income');

            // --- 2. Calculate Revenue and Avg Ticket ---
            const totalRevenue = currentPeriodIncome.reduce((acc, t) => acc + t.amount, 0);
            const previousTotalRevenue = previousPeriodIncome.reduce((acc, t) => acc + t.amount, 0);
            const avgTicket = totalRevenue / (currentPeriodIncome.length || 1);

            // --- 3. Calculate New Clients ---
            const newClients = allClients.filter(c => new Date(c.created_at) >= startDate).length;

            // --- 4. Calculate Revenue Trend ---
            let trendLength: number;
            let getTrendIndex: (date: Date) => number;
            
            if (period === 'week') {
                trendLength = 7;
                getTrendIndex = (date) => (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
            } else if (period === 'month') {
                trendLength = 4; // 4 weeks
                getTrendIndex = (date) => Math.floor((date.getDate() - 1) / 7);
            } else { // year
                trendLength = 12;
                getTrendIndex = (date) => date.getMonth();
            }

            const revenueTrend = Array(trendLength).fill(0);
            currentPeriodIncome.forEach(t => {
                const date = new Date(t.transaction_date);
                const index = getTrendIndex(date);
                if (index >= 0 && index < trendLength) {
                    revenueTrend[index] += t.amount;
                }
            });
            
            // --- 5. Top Services ---
            const serviceCounts: Record<string, number> = {};
            currentAppointments.forEach(a => {
                if (a.services?.name) {
                    serviceCounts[a.services.name] = (serviceCounts[a.services.name] || 0) + 1;
                }
            });

            const topServices = Object.entries(serviceCounts).sort((a,b) => b[1] - a[1]).slice(0,3).map(([name, value]) => ({name, value: `${value}x`}));

            // --- 6. Top Clients (Spending) ---
            const clientMap = new Map(allClients.map(c => [c.id, c.name]));
            const clientSpending: Record<number, {name: string, total: number}> = {};
            currentPeriodIncome.forEach(t => {
                 if (t.client_id) {
                     const clientName = clientMap.get(t.client_id);
                     if (clientName) {
                         if (!clientSpending[t.client_id]) {
                            clientSpending[t.client_id] = {name: clientName, total: 0};
                         }
                         clientSpending[t.client_id].total += t.amount;
                     }
                 }
            });
            const topClients = Object.values(clientSpending).sort((a,b) => b.total - a.total).slice(0,3).map(c => ({name: c.name, value: formatCurrency(c.total)}));


            setData({
                totalRevenue,
                previousTotalRevenue,
                avgTicket,
                newClients,
                retentionRate: 78, // Placeholder - requires more complex logic
                revenueTrend,
                topServices,
                topClients
            });
            setLoading(false);
        };

        fetchDataForPeriod();
    }, [period, dataVersion]);

    if (loading || !data) {
        return <div className="text-center p-10">Analisando dados...</div>;
    }

    // Calculate percentage change safely
    const revenueChange = data.previousTotalRevenue > 0 
        ? ((data.totalRevenue - data.previousTotalRevenue) / data.previousTotalRevenue) * 100 
        : (data.totalRevenue > 0 ? 100 : 0);
    
    // Placeholder for Avg Ticket Change (needs previous period avg ticket calculation)
    const avgTicketChange = 5.2; 
    const newClientsChange = -3.1;
    const retentionChange = 2.5;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="px-4 pt-4 pb-6 space-y-6"
        >
            <motion.div variants={itemVariants}>
                <PeriodSelector selectedPeriod={period} setPeriod={setPeriod} />
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                <KPICard label="Faturamento" value={formatCurrency(data.totalRevenue)} percentageChange={revenueChange} />
                <KPICard label="Ticket Médio" value={formatCurrency(data.avgTicket)} percentageChange={avgTicketChange} /> 
                <KPICard label="Novos Clientes" value={`${data.newClients}`} percentageChange={newClientsChange} />
                <KPICard label="Taxa de Retenção" value={`${data.retentionRate}%`} percentageChange={retentionChange} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <PerformanceChart data={data} />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-6">
                 <GeminiForecastCard data={data} period={period}/>
                 <GeminiInsightCard data={data} period={period}/>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <h3 className="text-lg font-bold mb-2">Serviços Populares</h3>
                <div className="bg-card-dark p-3 rounded-xl space-y-2">
                    {data.topServices.length > 0 ? data.topServices.map(service => (
                        <div key={service.name} className="flex justify-between items-center text-sm">
                            <p className="font-semibold text-white">{service.name}</p>
                            <p className="font-bold text-primary">{service.value}</p>
                        </div>
                    )) : <p className="text-sm text-center text-text-secondary-dark">Sem dados de serviços.</p>}
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <h3 className="text-lg font-bold mb-2">Clientes Destaque</h3>
                <div className="bg-card-dark p-3 rounded-xl space-y-2">
                    {data.topClients.length > 0 ? data.topClients.map(client => (
                        <div key={client.name} className="flex justify-between items-center text-sm">
                            <p className="font-semibold text-white">{client.name}</p>
                            <p className="font-semibold text-text-secondary-dark">{client.value}</p>
                        </div>
                    )) : <p className="text-sm text-center text-text-secondary-dark">Sem dados de clientes.</p>}
                </div>
            </motion.div>

        </motion.div>
    );
};

export default Analysis;