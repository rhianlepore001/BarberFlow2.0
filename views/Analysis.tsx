import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { PeriodData, User } from '../types';
import PerformanceChart from '../components/PerformanceChart';
import GeminiInsightCard from '../components/GeminiInsightCard';
import GeminiForecastCard from '../components/GeminiForecastCard';
import Tooltip from '../components/Tooltip';
import { useTheme } from '../hooks/useTheme';

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

const PeriodSelector: React.FC<{ selectedPeriod: Period; setPeriod: (p: Period) => void; theme: ReturnType<typeof useTheme> }> = ({ selectedPeriod, setPeriod, theme }) => {
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
                            className={`absolute inset-0 ${theme.bgPrimary} rounded-full z-0`}
                        />
                    )}
                    <span className="relative z-10">{period.label}</span>
                </button>
            ))}
        </div>
    );
};

interface KPICardProps {
    label: string;
    value: string;
    percentageChange: number;
    tooltipContent: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, percentageChange, tooltipContent }) => {
    const isPositive = percentageChange >= 0;
    return (
        <div className="bg-card-dark p-3 rounded-xl flex-1">
            <div className="flex items-center gap-1">
                <p className="text-xs text-text-secondary-dark">{label}</p>
                <Tooltip content={tooltipContent}>
                    <span className="material-symbols-outlined text-xs text-text-secondary-dark cursor-pointer hover:text-white transition-colors">info</span>
                </Tooltip>
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
            <div className={`flex items-center text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span className="material-symbols-outlined text-sm">{isPositive ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(percentageChange).toFixed(1)}%</span>
            </div>
        </div>
    )
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

// Interface para armazenar todos os dados calculados, incluindo os do período anterior
interface FullAnalysisData extends PeriodData {
    previousAvgTicket: number;
    previousNewClients: number;
}

interface AnalysisProps {
    dataVersion: number;
    // O App.tsx precisa passar o user para que o tema seja aplicado
    user: User; 
}

const Analysis: React.FC<AnalysisProps> = ({ dataVersion, user }) => {
    const [period, setPeriod] = useState<Period>('month');
    const [data, setData] = useState<FullAnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchDataForPeriod = async () => {
            setLoading(true);
            setData(null);
            setFetchError(null);

            const { startDate, endDate, previousStartDate, previousEndDate } = getDateRanges(period);
            
            // Fetch all relevant data covering both current and previous periods
            const [transactionsRes, clientsRes, appointmentsRes] = await Promise.all([
                 // Fetch transactions from previous start date to current end date
                 supabase.from('transactions').select('amount, type, transaction_date, client_id').gte('transaction_date', previousStartDate.toISOString()).lte('transaction_date', endDate.toISOString()),
                 // Fetch clients created from previous start date to current end date
                 supabase.from('clients').select('id, name, created_at').gte('created_at', previousStartDate.toISOString()).lte('created_at', endDate.toISOString()),
                 // Fetch appointments for the current period, joining with services
                 supabase.from('appointments').select('services_json, start_time').gte('start_time', startDate.toISOString()).lte('start_time', endDate.toISOString())
            ]);

            const reqError = transactionsRes.error || clientsRes.error || appointmentsRes.error;
            if (reqError) {
                console.error("Error fetching analysis data:", reqError);
                setFetchError("Falha ao carregar dados de análise. Verifique sua conexão ou se há dados registrados.");
                setLoading(false);
                return;
            }
            
            // Define types for fetched data
            type TransactionData = {amount: number; type: 'income' | 'expense'; transaction_date: string; client_id: number | null};
            type ClientData = {id: number; name: string; created_at: string};
            // Ajusta a tipagem para garantir que services_json é um array de objetos com 'name'
            type AppointmentData = {services_json: {name: string, price: number}[] | null; start_time: string};

            const allTransactions: TransactionData[] = transactionsRes.data || [];
            const allClients: ClientData[] = clientsRes.data || [];
            const currentAppointments: AppointmentData[] = appointmentsRes.data || [];

            // --- 1. Filter Transactions for Current and Previous Periods (Income only) ---
            const currentPeriodIncome = allTransactions.filter(t => new Date(t.transaction_date) >= startDate && t.type === 'income');
            const previousPeriodIncome = allTransactions.filter(t => new Date(t.transaction_date) >= previousStartDate && new Date(t.transaction_date) <= previousEndDate && t.type === 'income');

            // --- 2. Calculate Revenue and Avg Ticket ---
            const totalRevenue = currentPeriodIncome.reduce((acc, t) => acc + t.amount, 0);
            const previousTotalRevenue = previousPeriodIncome.reduce((acc, t) => acc + t.amount, 0);
            
            const currentTransactionCount = currentPeriodIncome.length;
            const previousTransactionCount = previousPeriodIncome.length;
            
            const avgTicket = currentTransactionCount > 0 ? totalRevenue / currentTransactionCount : 0;
            const previousAvgTicket = previousTransactionCount > 0 ? previousTotalRevenue / previousTransactionCount : 0;

            // --- 3. Calculate New Clients ---
            const newClients = allClients.filter(c => new Date(c.created_at) >= startDate && new Date(c.created_at) <= endDate).length;
            const previousNewClients = allClients.filter(c => new Date(c.created_at) >= previousStartDate && new Date(c.created_at) <= previousEndDate).length;

            // --- 4. Calculate Revenue Trend and X-Axis Labels ---
            let trendLength: number;
            let getTrendIndex: (date: Date) => number;
            let xAxisLabels: string[] = [];
            
            if (period === 'week') {
                trendLength = 7;
                const dayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
                getTrendIndex = (date) => (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
                xAxisLabels = dayLabels;
            } else if (period === 'month') {
                trendLength = 4; // 4 weeks
                getTrendIndex = (date) => Math.floor((date.getDate() - 1) / 7);
                xAxisLabels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
            } else { // year
                trendLength = 12;
                getTrendIndex = (date) => date.getMonth();
                xAxisLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            }

            const revenueTrend = Array(trendLength).fill(0);
            currentPeriodIncome.forEach(t => {
                const date = new Date(t.transaction_date);
                const index = getTrendIndex(date);
                // Garante que o índice esteja dentro do limite
                if (index >= 0 && index < trendLength) {
                    revenueTrend[index] += t.amount;
                }
            });
            
            // --- 5. Top Services ---
            const serviceCounts: Record<string, number> = {};
            currentAppointments.forEach(a => {
                // Verifica se services_json existe e é um array
                if (a.services_json && Array.isArray(a.services_json)) {
                    a.services_json.forEach(s => {
                        // Garante que 'name' existe no objeto de serviço
                        if (s.name) {
                            serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1;
                        }
                    });
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
                xAxisLabels, // Adiciona os rótulos
                topServices,
                topClients,
                previousAvgTicket,
                previousNewClients
            });
            setLoading(false);
        };

        fetchDataForPeriod();
    }, [period, dataVersion]);

    if (loading) {
        return <div className="text-center p-10">Analisando dados...</div>;
    }
    
    if (fetchError) {
        return <div className="text-center p-10 text-red-400 font-semibold">{fetchError}</div>;
    }

    if (!data) {
         return <div className="text-center p-10 text-text-secondary-dark">Nenhum dado encontrado para o período selecionado.</div>;
    }

    // Calculate percentage change safely
    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    const revenueChange = calculateChange(data.totalRevenue, data.previousTotalRevenue);
    const avgTicketChange = calculateChange(data.avgTicket, data.previousAvgTicket);
    const newClientsChange = calculateChange(data.newClients, data.previousNewClients);
    // Retention rate remains placeholder for now
    const retentionChange = 2.5; 
    
    const kpiDescriptions = {
        faturamento: "O valor total de vendas e serviços realizados no período selecionado. Indica o volume de negócios.",
        ticketMedio: "A média de gasto por transação (corte, barba, etc.). Um ticket médio alto sugere que os clientes estão comprando mais serviços ou produtos por visita.",
        novosClientes: "O número de clientes que fizeram sua primeira visita ou agendamento neste período. Essencial para medir o crescimento.",
        taxaRetencao: "A porcentagem de clientes que retornaram para um novo serviço após a primeira visita. Uma taxa alta indica fidelidade e satisfação."
    };
    
    const iaTooltipContent = "A precisão da Previsão e do Insight da IA aumenta significativamente após 30 dias de uso consistente do aplicativo, pois ela terá dados históricos suficientes para identificar padrões e tendências reais do seu negócio.";

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="px-4 pt-4 pb-6 space-y-6"
        >
            <motion.div variants={itemVariants}>
                <PeriodSelector selectedPeriod={period} setPeriod={setPeriod} theme={theme} />
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                <KPICard 
                    label="Faturamento" 
                    value={formatCurrency(data.totalRevenue)} 
                    percentageChange={revenueChange} 
                    tooltipContent={kpiDescriptions.faturamento}
                />
                <KPICard 
                    label="Ticket Médio" 
                    value={formatCurrency(data.avgTicket)} 
                    percentageChange={avgTicketChange} 
                    tooltipContent={kpiDescriptions.ticketMedio}
                /> 
                <KPICard 
                    label="Novos Clientes" 
                    value={`${data.newClients}`} 
                    percentageChange={newClientsChange} 
                    tooltipContent={kpiDescriptions.novosClientes}
                />
                <KPICard 
                    label="Taxa de Retenção" 
                    value={`${data.retentionRate}%`} 
                    percentageChange={retentionChange} 
                    tooltipContent={kpiDescriptions.taxaRetencao}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <PerformanceChart data={data} user={user} />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-6">
                 <div className="flex items-center gap-2 mb-1 px-1">
                    <h3 className="font-bold text-white">Ferramentas de IA</h3>
                    <Tooltip content={iaTooltipContent}>
                        <span className="material-symbols-outlined text-sm text-text-secondary-dark cursor-pointer hover:text-white transition-colors">info</span>
                    </Tooltip>
                </div>
                 <GeminiForecastCard data={data} period={period}/>
                 <GeminiInsightCard data={data} period={period}/>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <h3 className="text-lg font-bold mb-2">Serviços Populares</h3>
                <div className="bg-card-dark p-3 rounded-xl space-y-2">
                    {data.topServices.length > 0 ? data.topServices.map(service => (
                        <div key={service.name} className="flex justify-between items-center text-sm">
                            <p className="font-semibold text-white">{service.name}</p>
                            <p className={`font-bold ${theme.primary}`}>{service.value}</p>
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