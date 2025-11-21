import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Client, User } from '../types';
import Tooltip from '../components/Tooltip';
import { useTheme } from '../hooks/useTheme';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.07,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
};

type ClientFilter = 'all' | 'vips' | 'recent' | 'at_risk';

interface ClientsProps {
    dataVersion: number;
    onClientSelect: (client: Client) => void;
    user: User;
}

const getFilterTooltipContent = (filter: ClientFilter) => {
    switch (filter) {
        case 'vips':
            return "Clientes VIPs: Aqueles com gasto total acumulado superior a um valor definido. Foco na fidelização.";
        case 'recent':
            return "Clientes Recentes: Clientes que visitaram nos últimos 30 dias.";
        case 'at_risk':
            return "Clientes em Risco: Clientes que não visitam há mais de 60 dias.";
        default:
            return "";
    }
}

const FilterButtons: React.FC<{ activeFilter: ClientFilter; setFilter: (filter: ClientFilter) => void; theme: ReturnType<typeof useTheme> }> = ({ activeFilter, setFilter, theme }) => {
    const filters: { label: string; value: ClientFilter }[] = [
        { label: 'Todos', value: 'all' },
        { label: 'VIPs', value: 'vips' },
        { label: 'Recentes', value: 'recent' },
        { label: 'Em Risco', value: 'at_risk' },
    ];
    return (
        <div className="flex justify-center items-center bg-card p-1 rounded-full text-sm">
            {filters.map(filter => (
                 <button 
                    key={filter.value}
                    onClick={() => setFilter(filter.value)}
                    className={`relative w-full font-bold py-2 px-1 rounded-full transition-colors ${activeFilter === filter.value ? 'text-background' : 'text-text-secondary'}`}
                >
                    {activeFilter === filter.value && (
                        <motion.div
                            layoutId="client-filter-active"
                            className={`absolute inset-0 ${theme.bgPrimary} rounded-full z-0`}
                        />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1">
                        {filter.label}
                        {filter.value !== 'all' && (
                            <Tooltip content={getFilterTooltipContent(filter.value)}>
                                <span className="material-symbols-outlined text-xs cursor-pointer hover:text-white transition-colors">info</span>
                            </Tooltip>
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
}

const getRelativeDate = (dateString: string | null): string => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    if (diffTime < 0) return "Futuro"; 
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return "Hoje";
    if (diffDays <= 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem.`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Há ${diffMonths} ${diffMonths > 1 ? 'meses' : 'mês'}`;
};

const Clients: React.FC<ClientsProps> = ({ dataVersion, onClientSelect, user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<ClientFilter>('all');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            if (!user) return;

            let query = supabase.from('clients').select('*').eq('tenant_id', user.tenant_id);
            
            const now = new Date();
            if (activeFilter === 'recent') {
                const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();
                query = query.gte('last_visit', thirtyDaysAgo);
            } else if (activeFilter === 'at_risk') {
                const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 60)).toISOString();
                query = query.lt('last_visit', sixtyDaysAgo);
            } else if (activeFilter === 'vips') {
                query = query.gte('total_spent', 500); // Exemplo de valor VIP
            }

            const { data, error } = await query.order('name');
            
            if (!error) {
                setClients(data.map(c => ({ ...c, last_visit: getRelativeDate(c.last_visit) })));
            }
            setLoading(false);
        };
        fetchClients();
    }, [dataVersion, user, activeFilter]);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, clients]);

    if (loading) {
        return <div className="text-center p-10">Carregando clientes...</div>;
    }

    return (
        <div className="px-4 pt-4 pb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                 <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full bg-card border-none rounded-full py-3 pl-12 pr-4 text-text-primary placeholder-text-secondary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                        search
                    </span>
                </div>
                <FilterButtons activeFilter={activeFilter} setFilter={setActiveFilter} theme={theme} />
            </motion.div>
            
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-6 space-y-3"
            >
                {filteredClients.length > 0 ? filteredClients.map(client => (
                    <motion.div key={client.id} variants={itemVariants} className="flex items-center gap-4 rounded-xl bg-card p-3">
                        <img src={client.image_url || `https://ui-avatars.com/api/?name=${client.name}&background=E5A00D&color=101012`} alt={client.name} className="w-12 h-12 rounded-full object-cover"/>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-text-primary truncate">{client.name}</p>
                            <p className="text-sm text-text-secondary">Última visita: {client.last_visit}</p>
                        </div>
                        <button 
                            onClick={() => onClientSelect(client)}
                            className="text-text-secondary hover:text-white transition-colors"
                        >
                             <span className="material-symbols-outlined">more_vert</span>
                        </button>
                    </motion.div>
                )) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-text-secondary pt-10">
                        <p>Nenhum cliente encontrado.</p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default Clients;