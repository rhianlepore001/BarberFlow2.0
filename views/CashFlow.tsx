import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Transaction } from '../types';

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
}

const FilterButtons: React.FC<{ activeFilter: FilterType; setFilter: (filter: FilterType) => void }> = ({ activeFilter, setFilter }) => {
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
                            className="absolute inset-0 bg-primary rounded-full z-0"
                        />
                    )}
                    <span className="relative z-10">{filter.label}</span>
                </button>
            ))}
        </div>
    );
}


const CashFlow: React.FC<CashFlowProps> = ({ dataVersion }) => {
    const [filter, setFilter] = useState<FilterType>('all');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false });
            if (error) {
                console.error("Error fetching transactions:", error);
            } else {
                setTransactions(data.map((t: any) => ({...t, date: new Date(t.transaction_date).toLocaleDateString('pt-BR')})));
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
            <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} className="mt-4 rounded-xl bg-gradient-to-br from-primary to-yellow-600 p-5 text-background-dark shadow-lg shadow-primary/20">
                <p className="text-sm font-medium text-black/70">Saldo Atual</p>
                <p className="text-4xl font-extrabold">R$ {balance.toFixed(2).replace('.', ',')}</p>
            </motion.div>
            
            <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0, transition: {delay: 0.1}}} className="my-6">
                <FilterButtons activeFilter={filter} setFilter={setFilter} />
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
                        layout
                        className="flex items-center gap-4 rounded-xl bg-card-dark p-3"
                    >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>
                           <span className="material-symbols-outlined">{t.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white">{t.description}</p>
                            <p className="text-sm text-text-secondary-dark">{t.date}</p>
                        </div>
                        <p className={`font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                           {t.type === 'income' ? `+R$${t.amount.toFixed(2)}` : `-R$${t.amount.toFixed(2)}`}
                        </p>
                    </motion.div>
                ))}
                </AnimatePresence>
            </motion.div>
            
            {visibleCount < filteredTransactions.length && (
                <motion.div layout className="mt-6">
                    <button 
                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                        className="w-full rounded-full bg-card-dark py-3 text-center font-bold text-primary transition-colors hover:bg-primary/20"
                    >
                        Carregar Mais
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default CashFlow;
