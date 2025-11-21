import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { PeriodData, User } from '../types';
import PerformanceChart from '../components/PerformanceChart';
import GeminiInsightCard from '../components/GeminiInsightCard';
import GeminiForecastCard from '../components/GeminiForecastCard';
import Tooltip from '../components/Tooltip';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils';

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

const PeriodSelector: React.FC<{ selectedPeriod: Period; setPeriod: (p: Period) => void; theme: ReturnType<typeof useTheme> }> = ({ selectedPeriod, setPeriod, theme }) => {
    const periods: { label: string; value: Period }[] = [
        { label: 'Semana', value: 'week' },
        { label: 'Mês', value: 'month' },
        { label: 'Ano', value: 'year' },
    ];
    return (
        <div className="flex justify-center items-center bg-card p-1 rounded-full">
            {periods.map(period => (
                 <button 
                    key={period.value}
                    onClick={() => setPeriod(period.value)}
                    className={`relative w-full text-sm font-bold py-2 rounded-full transition-colors ${selectedPeriod === period.value ? 'text-background' : 'text-text-secondary'}`}
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
        <div className="bg-card p-3 rounded-xl flex-1">
            <div className="flex items-center gap-1">
                <p className="text-xs text-text-secondary">{label}</p>
                <Tooltip content={tooltipContent}>
                    <span className="material-symbols-outlined text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">info</span>
                </Tooltip>
            </div>
            <p className="text-lg font-bold text-text-primary">{value}</p>
            <div className={`flex items-center text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span className="material-symbols-outlined text-sm">{isPositive ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(percentageChange).toFixed(1)}%</span>
            </div>
        </div>
    )
}

interface AnalysisProps {
    dataVersion: number;
    user: User; 
}

const Analysis: React.FC<AnalysisProps> = ({ dataVersion, user }) => {
    const [period, setPeriod] = useState<Period>('month');
    const [data, setData] = useState<PeriodData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchDataForPeriod = async () => {
            setLoading(true);
            setData(null);
            setFetchError(null);

            // Lógica de cálculo de dados (simplificada para o exemplo)
            // Em um app real, isso seria mais complexo, com queries e agregações
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('amount, transaction_date, type')
                .eq('tenant_id', user.tenant_id)
                .eq('type', 'income');

            if (error) {
                setFetchError("Erro ao buscar dados de transações.");
                setLoading(false);
                return;
            }

            const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
            
            // Dados de exemplo para o restante
            const mockData: PeriodData = {
                totalRevenue: totalRevenue,
                previousTotalRevenue: totalRevenue * 0.85, // Simulado
                avgTicket: totalRevenue > 0 ? totalRevenue / (transactions.length || 1) : 0,
                newClients: 15, // Simulado
                retentionRate: 75, // Simulado
                revenueTrend: [100, 200, 150, 300, 250, 400, 350], // Simulado
                xAxisLabels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], // Simulado
                topServices: [{name: 'Corte', value: '50'}, {name: 'Barba', value: '30'}], // Simulado
                topClients: [{name: 'João Silva', value: 'R$ 250'}, {name: 'Carlos Souza', value: 'R$ 180'}], // Simulado
            };

            setData(mockData);
            setLoading(false);
        };

        fetchDataForPeriod();
    }, [period, dataVersion, user.tenant_id]);

    if (loading) {
        return <div className="text-center p-10">Analisando dados...</div>;
    }
    
    if (fetchError) {
        return <div className="text-center p-10 text-red-400 font-semibold">{fetchError}</div>;
    }

    if (!data) {
         return <div className="text-center p-10 text-text-secondary">Nenhum dado encontrado para o período selecionado.</div>;
    }

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    const revenueChange = calculateChange(data.totalRevenue, data.previousTotalRevenue);
    const avgTicketChange = 10.5; // Simulado
    const newClientsChange = 5.2; // Simulado
    const retentionChange = 2.5; // Simulado
    
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
                    value={formatCurrency(data.totalRevenue, user.currency)} 
                    percentageChange={revenueChange} 
                    tooltipContent={kpiDescriptions.faturamento}
                />
                <KPICard 
                    label="Ticket Médio" 
                    value={formatCurrency(data.avgTicket, user.currency)} 
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
                    <h3 className="font-bold text-text-primary">Ferramentas de IA</h3>
                    <Tooltip content={iaTooltipContent}>
                        <span className="material-symbols-outlined text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">info</span>
                    </Tooltip>
                </div>
                 <GeminiForecastCard data={data} period={period} user={user}/>
                 <GeminiInsightCard data={data} period={period} user={user}/>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <h3 className="text-lg font-bold mb-2 text-text-primary">Serviços Populares</h3>
                <div className="bg-card p-3 rounded-xl space-y-2">
                    {data.topServices.length > 0 ? data.topServices.map(service => (
                        <div key={service.name} className="flex justify-between items-center text-sm">
                            <p className="font-semibold text-text-primary">{service.name}</p>
                            <p className={`font-bold ${theme.primary}`}>{service.value}</p>
                        </div>
                    )) : <p className="text-sm text-center text-text-secondary">Sem dados de serviços.</p>}
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <h3 className="text-lg font-bold mb-2 text-text-primary">Clientes Destaque</h3>
                <div className="bg-card p-3 rounded-xl space-y-2">
                    {data.topClients.length > 0 ? data.topClients.map(client => (
                        <div key={client.name} className="flex justify-between items-center text-sm">
                            <p className="font-semibold text-text-primary">{client.name}</p>
                            <p className="font-semibold text-text-secondary">{client.value}</p>
                        </div>
                    )) : <p className="text-sm text-center text-text-secondary">Sem dados de clientes.</p>}
                </div>
            </motion.div>

        </motion.div>
    );
};

export default Analysis;