import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, User } from '../types';
import TransactionItem from '../components/TransactionItem';
import { useTheme } from '../hooks/useTheme';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

type FilterType = 'all' | 'income' | 'expense';
const ITEMS_PER_PAGE = 10;

interface CashFlowProps {
    dataVersion: number;
    refreshData: () => void; 
    user: User; // Adiciona user para obter o tema
}

const FilterButtons: React.FC<{ activeFilter: FilterType; setFilter: (filter: FilterType) => void; theme: ReturnType<typeof useTheme> }> = ({ activeFilter, setFilter, theme }) => {
    const filters: { label: string; value: FilterType }[] = [
        { label: 'Tudo', value: 'all' },
        { label: 'Entradas', value: 'income' },
        { label: 'Saídas', value: 'expense' },
    ];
    return (
        <div className="flex justify-center items-center bg-card-dark p-1 rounded-full">
            {filters.map(filter => (
                 <button 
                    key={filter.value}
                    onClick={() => setFilter(filter.value)}
                    className={`relative w-full text-sm font-bold py-2 rounded-full transition-colors ${activeFilter === filter.value ? 'text-background-dark' : 'text-text-secondary-dark'}`}
                >
                    {activeFilter === filter.value && (
                        <motion.div
                            layoutId="cashflow-filter-active"
                            className={`absolute inset-0 ${theme.bgPrimary} rounded-full z-0`}
                        />
                    )}
                    <span className="relative z-10">{filter.label}</span>
                </button>
            ))}
        </div>
    );
}


const CashFlow: React.FC<CashFlowProps> = ({ dataVersion, refreshData, user }) => {
    const [filter, setFilter] = useState<FilterType>('all');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme(user);
    
    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            // Faz JOIN com team_members para obter o nome do barbeiro
            const { data, error } = await supabase
                .from('transactions')
                .select('*, team_members(name)')
                .order('transaction_date', { ascending: false });
                
            if (error) {
                console.error("Error fetching transactions:", error);
            } else {
                setTransactions(data.map((t: any) => ({
                    ...t, 
                    date: new Date(t.transaction_date).toLocaleDateString('pt-BR'),
                    barberName: t.team_members?.name || null, // Extrai o nome do barbeiro
                })));
            }
            setLoading(false);
        };
        fetchTransactions();
    }, [dataVersion]);
    
    const balance = useMemo(() => transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0), [transactions]);

    const filteredTransactions = useMemo(() => {
        if (filter === 'all') return transactions;
        return transactions.filter(t => t.type === filter);
    }, [filter, transactions]);

    const visibleTransactions = useMemo(() => {
        return filteredTransactions.slice(0, visibleCount);
    }, [filteredTransactions, visibleCount]);

    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [filter]);

    if (loading) {
        return <div className="text-center p-10">Carregando transações...</div>;
    }

    return (
        <div className="px-4 pt-4 pb-6">
            <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} className={`mt-4 rounded-xl bg-gradient-to-br ${theme.gradientPrimary} p-5 text-background-dark shadow-lg ${theme.shadowPrimary}`}>
                <p className="text-sm font-medium text-black/70">Saldo Atual</p>
                <p className="text-4xl font-extrabold">R$ {balance.toFixed(2).replace('.', ',')}</p>
            </motion.div>
            
            <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0, transition: {delay: 0.1}}} className="my-6">
                <FilterButtons activeFilter={filter} setFilter={setFilter} theme={theme} />
            </motion.div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
            >
                <AnimatePresence>
                {visibleTransactions.map(t => (
                    <motion.div 
                        key={t.id} 
                        variants={itemVariants} 
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <TransactionItem 
                            transaction={t} 
                            onDeleteSuccess={refreshData} 
                            user={user} // Passa o user
                        />
                    </motion.div>
                ))}
                </AnimatePresence>
            </motion.div>
            
            {visibleCount < filteredTransactions.length && (
                <motion.div layout className="mt-6">
                    <button 
                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                        className={`w-full rounded-full bg-card-dark py-3 text-center font-bold ${theme.primary} transition-colors hover:${theme.bgPrimary}/20`}
                    >
                        Carregar Mais
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default CashFlow;