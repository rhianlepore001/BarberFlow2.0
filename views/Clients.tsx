import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Client } from '../types';
import Tooltip from '../components/Tooltip'; // Importa o Tooltip

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
    onClientSelect: (client: Client) => void; // Nova prop para selecionar cliente
}

const getFilterTooltipContent = (filter: ClientFilter) => {
    switch (filter) {
        case 'vips':
            return "Clientes VIPs: Aqueles com gasto total acumulado igual ou superior a R$ 1000,00. Foco na fidelização e ofertas exclusivas.";
        case 'recent':
            return "Clientes Recentes: Clientes que visitaram a barbearia nos últimos 7 dias. Mantenha o contato para garantir o retorno.";
        case 'at_risk':
            return "Clientes em Risco: Clientes que não visitam a barbearia há mais de 30 dias. Recomenda-se contato para reengajamento.";
        default:
            return "";
    }
}

const FilterButtons: React.FC<{ activeFilter: ClientFilter; setFilter: (filter: ClientFilter) => void }> = ({ activeFilter, setFilter }) => {
    const filters: { label: string; value: ClientFilter }[] = [
        { label: 'Todos', value: 'all' },
        { label: 'VIPs', value: 'vips' },
        { label: 'Recentes', value: 'recent' },
        { label: 'Em Risco', value: 'at_risk' },
    ];
    return (
        <div className="flex justify-center items-center bg-card-dark p-1 rounded-full text-sm">
            {filters.map(filter => (
                 <button 
                    key={filter.value}
                    onClick={() => setFilter(filter.value)}
                    className={`relative w-full font-bold py-2 px-1 rounded-full transition-colors ${activeFilter === filter.value ? 'text-background-dark' : 'text-text-secondary-dark'}`}
                >
                    {activeFilter === filter.value && (
                        <motion.div
                            layoutId="client-filter-active"
                            className="absolute inset-0 bg-primary rounded-full z-0"
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

const Clients: React.FC<ClientsProps> = ({ dataVersion, onClientSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<ClientFilter>('all');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Lógica para determinar o status do cliente
    const getClientStatus = (client: Client): 'vip' | 'at_risk' | 'recent' | null => {
        // Mantemos a lógica de status para exibir os ícones na lista
        
        // VIP: Gasto total >= R$ 1000
        if ((client.totalSpent ?? 0) >= 1000) return 'vip';
        
        if (client.lastVisitRaw) {
            const lastVisitDate = new Date(client.lastVisitRaw);
            const now = new Date();
            const diffTime = now.getTime() - lastVisitDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Recente: visitou nos últimos 7 dias
            if (diffDays <= 7) return 'recent';
            
            // Em Risco: Última visita há mais de 30 dias
            if (diffDays > 30) return 'at_risk';
        }
        return null;
    }

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            // Busca todos os campos, incluindo total_spent e last_visit
            const { data, error } = await supabase.from('clients').select('*').order('name');
            if (error) {
                console.error("Error fetching clients:", error);
            } else {
                setClients(data.map(c => ({
                    id: c.id,
                    name: c.name,
                    imageUrl: c.image_url,
                    lastVisitRaw: c.last_visit, // Data bruta para cálculo
                    lastVisit: getRelativeDate(c.last_visit), // Data formatada para exibição
                    totalSpent: c.total_spent,
                    phone: c.phone,
                })));
            }
            setLoading(false);
        };
        fetchClients();
    }, [dataVersion]);

    const filteredClients = useMemo(() => {
        let intermediateClients = clients;
        const now = new Date();

        switch (activeFilter) {
            case 'vips':
                intermediateClients = clients.filter(c => getClientStatus(c) === 'vip');
                break;
            case 'recent':
                intermediateClients = clients.filter(c => getClientStatus(c) === 'recent');
                break;
            case 'at_risk':
                intermediateClients = clients.filter(c => getClientStatus(c) === 'at_risk');
                break;
        }

        return intermediateClients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, activeFilter, clients]);

    if (loading) {
        return <div className="text-center p-10">Carregando clientes...</div>;
    }
    
    // Removemos a função getStatusTooltip daqui, pois ela não é mais necessária para os ícones da lista.

    return (
        <div className="px-4 pt-4 pb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                 <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card-dark border-none rounded-full py-3 pl-12 pr-4 text-white placeholder-text-secondary-dark focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-dark">
                        search
                    </span>
                </div>
                <FilterButtons activeFilter={activeFilter} setFilter={setActiveFilter} />
            </motion.div>
            
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-6 space-y-3"
            >
                {filteredClients.length > 0 ? filteredClients.map(client => {
                    const status = getClientStatus(client);
                    return (
                        <motion.div key={client.id} variants={itemVariants} className="flex items-center gap-4 rounded-xl bg-card-dark p-3">
                            <img src={client.imageUrl || `https://ui-avatars.com/api/?name=${client.name}&background=E5A00D&color=101012`} alt={client.name} className="w-12 h-12 rounded-full object-cover"/>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-white truncate">{client.name}</p>
                                    {/* Ícones de status na lista (sem tooltip, apenas visual) */}
                                    {status === 'vip' && (
                                        <span title="Cliente VIP" className="material-symbols-outlined text-primary text-base">workspace_premium</span>
                                    )}
                                    {status === 'recent' && (
                                        <span title="Cliente Recente" className="material-symbols-outlined text-green-400 text-base">schedule</span>
                                    )}
                                    {status === 'at_risk' && (
                                        <span title="Cliente em Risco" className="material-symbols-outlined text-red-400 text-base">hourglass_empty</span>
                                    )}
                                </div>
                                <p className="text-sm text-text-secondary-dark">Última visita: {client.lastVisit}</p>
                            </div>
                            <button 
                                onClick={() => onClientSelect(client)}
                                className="text-text-secondary-dark hover:text-white transition-colors"
                            >
                                 <span className="material-symbols-outlined">more_vert</span>
                            </button>
                        </motion.div>
                    )
                }) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-text-secondary-dark pt-10">
                        <p>Nenhum cliente encontrado.</p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default Clients;