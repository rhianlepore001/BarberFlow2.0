import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { User, Service, TeamMember, BarberFinancials } from '../types';
import FinancialSettlement from '../components/FinancialSettlement';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils';

interface ManagementProps {
    user: User;
    openModal: (content: 'newTeamMember' | 'newService' | 'editProfile' | 'editHours' | 'editTeamMember' | 'editCommission' | 'editSettlementDay', data?: any) => void;
    dataVersion: number;
    refreshData: () => void;
}

interface ShopSettings {
    open_days: string[];
    start_time: string;
    end_time: string;
    settlement_day: number;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const getSettlementPeriod = (settlementDay: number) => {
    const now = new Date();
    const currentDay = now.getDate();
    let periodStart: Date;
    if (currentDay >= settlementDay) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), settlementDay);
    } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, settlementDay);
    }
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { periodStart, periodEnd };
};

const Management: React.FC<ManagementProps> = ({ user, openModal, dataVersion, refreshData }) => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [financials, setFinancials] = useState<BarberFinancials[]>([]);
    const [settings, setSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [copyMessage, setCopyMessage] = useState<string | null>(null);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [teamRes, servicesRes, transactionsRes, settingsRes] = await Promise.all([
                supabase.from('team_members').select('*, commission_rate').eq('tenant_id', user.shopId),
                supabase.from('services').select('*').eq('tenant_id', user.shopId),
                supabase.from('transactions').select('amount, professional_id, type, transaction_date').eq('tenant_id', user.shopId),
                supabase.from('shop_settings').select('*').eq('tenant_id', user.shopId).limit(1).single()
            ]);

            let fetchedTeam: TeamMember[] = [];
            if (teamRes.error) console.error("Error fetching team members:", teamRes.error.message);
            else {
                fetchedTeam = teamRes.data.map((t: any) => ({ ...t, imageUrl: t.image_url, commissionRate: t.commission_rate || 0.5 }));
                setTeam(fetchedTeam);
            }

            if (servicesRes.error) console.error("Error fetching services:", servicesRes.error.message);
            else setServices(servicesRes.data as Service[]);

            let currentSettings: ShopSettings | null = null;
            if (settingsRes.error && settingsRes.error.code !== 'PGRST116') console.error("Error fetching settings: ", settingsRes.error.message);
            else if (settingsRes.data) {
                currentSettings = settingsRes.data as ShopSettings;
                setSettings(currentSettings);
            }
            
            const settlementDay = currentSettings?.settlement_day || 1;
            const { periodStart, periodEnd } = getSettlementPeriod(settlementDay);
            
            if (transactionsRes.error) console.error("Error fetching transactions:", transactionsRes.error.message);
            else {
                const barberRevenues: { [key: string]: number } = {};
                transactionsRes.data
                    .filter(t => t.type === 'income' && new Date(t.transaction_date) >= periodStart && new Date(t.transaction_date) <= periodEnd && t.professional_id)
                    .forEach(t => {
                        barberRevenues[t.professional_id] = (barberRevenues[t.professional_id] || 0) + t.amount;
                    });
                
                const barberFinancials: BarberFinancials[] = fetchedTeam
                    .filter(member => member.id in barberRevenues)
                    .map(member => ({
                        barberId: member.id,
                        monthRevenue: barberRevenues[member.id] || 0,
                        commissionRate: member.commissionRate || 0.5
                    }));
                setFinancials(barberFinancials);
            }
            setLoading(false);
        };
        fetchData();
    }, [dataVersion, user.shopId]);
    
    const handleDeleteMember = async (memberId: string) => {
        if (window.confirm('Tem certeza que deseja remover este membro da equipe? Essa ação não pode ser desfeita.')) {
            const { error } = await supabase.from('team_members').delete().eq('id', memberId);
            if (error) {
                console.error('Error deleting team member:', error);
                alert('Não foi possível remover o membro da equipe.');
            } else {
                refreshData();
            }
        }
    };
    
    const handleCopyGeneralLink = () => {
        const link = `${window.location.origin}/public-booking/${user.shopId}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopyMessage('Link de agendamento geral copiado!');
            setTimeout(() => setCopyMessage(null), 5000);
        }).catch(err => {
            console.error('Failed to copy link:', err);
            setCopyMessage('Falha ao copiar o link.');
            setTimeout(() => setCopyMessage(null), 3000);
        });
    };

    const dayMap: { [key: string]: string } = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
    const formatOpenDays = (days: string[]): string => {
        const orderedDays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
        const sortedDays = [...days].sort((a, b) => orderedDays.indexOf(a) - orderedDays.indexOf(b));
        if (sortedDays.length === 0) return "Fechado";
        if (sortedDays.length === 1) return dayMap[sortedDays[0]];
        let isSequence = true;
        for (let i = 0; i < sortedDays.length - 1; i++) {
            if (orderedDays.indexOf(sortedDays[i+1]) - orderedDays.indexOf(sortedDays[i]) !== 1) {
                isSequence = false;
                break;
            }
        }
        if (isSequence) return `${dayMap[sortedDays[0]]} à ${dayMap[sortedDays[sortedDays.length - 1]]}`;
        return sortedDays.map(d => dayMap[d]).join(', ');
    };
    
    const formatSettlementPeriod = () => {
        if (!settings) return "Mês Atual";
        const { periodStart, periodEnd } = getSettlementPeriod(settings.settlement_day);
        const startDay = periodStart.getDate().toString().padStart(2, '0');
        const startMonth = (periodStart.getMonth() + 1).toString().padStart(2, '0');
        const endDay = periodEnd.getDate().toString().padStart(2, '0');
        const endMonth = (periodEnd.getMonth() + 1).toString().padStart(2, '0');
        return `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
    }

    if(loading) return <div className="text-center p-10">Carregando dados de gestão...</div>;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 pt-4 pb-6 space-y-8">
            <motion.div variants={itemVariants} className="flex items-center gap-4 rounded-xl bg-card-dark p-4">
                <img src={user.imageUrl || `https://ui-avatars.com/api/?name=${user.name}&background=E5A00D&color=101012`} alt={user.name} className="w-16 h-16 rounded-full object-cover"/>
                <div>
                    <h3 className="text-xl font-bold">{user.name}</h3>
                    <button onClick={() => openModal('editProfile')} className={`text-sm font-semibold ${theme.primary} hover:text-yellow-400 transition-colors`}>Editar perfil</button>
                </div>
            </motion.div>
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="text-lg font-bold">Horário de Funcionamento</h4>
                    <button onClick={() => openModal('editHours')} className={`${theme.primary} font-semibold text-sm flex items-center gap-1 hover:text-yellow-400 transition-colors`}>
                        <span className="material-symbols-outlined text-lg">edit</span>Editar
                    </button>
                </div>
                <div className="rounded-xl bg-card-dark p-4 flex justify-between items-center">
                    {settings ? (
                        <>
                            <p className="font-bold text-white text-base">{formatOpenDays(settings.open_days)}</p>
                            <p className="text-sm font-semibold text-text-secondary-dark">{settings.start_time?.substring(0,5)} - {settings.end_time?.substring(0,5)}</p>
                        </>
                    ) : <p className="text-sm text-text-secondary-dark w-full text-center">Defina seu horário</p>}
                </div>
            </motion.div>
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-3 px-1"><h4 className="text-lg font-bold">Agendamento Online</h4></div>
                <div className="rounded-xl bg-card-dark p-4">
                    <p className="text-sm text-text-secondary-dark mb-3">Compartilhe este link com seus clientes para que eles possam agendar online e escolher o profissional.</p>
                    <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${window.location.origin}/public-booking/${user.shopId}`} className="flex-grow bg-background-dark border border-gray-700 rounded-lg py-2 px-3 text-white text-sm truncate"/>
                        <button onClick={handleCopyGeneralLink} className={`flex-shrink-0 ${theme.bgPrimary} text-background-dark font-bold py-2 px-4 rounded-lg hover:${theme.bgPrimary}/80 transition-colors`}>Copiar</button>
                    </div>
                </div>
            </motion.div>
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="text-lg font-bold">Acerto Mensal</h4>
                    <button onClick={() => openModal('editSettlementDay')} className={`${theme.primary} font-semibold text-sm flex items-center gap-1 hover:text-yellow-400 transition-colors`}>
                        <span className="material-symbols-outlined text-lg">calendar_month</span>Dia de Acerto: {settings?.settlement_day || 1}
                    </button>
                </div>
                <div className="rounded-xl bg-card-dark p-4 mb-4">
                    <p className="text-sm font-medium text-text-secondary-dark">Período de Cálculo:</p>
                    <p className="font-bold text-white text-base">{formatSettlementPeriod()}</p>
                </div>
                <FinancialSettlement financials={financials} team={team} user={user} />
            </motion.div>
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="text-lg font-bold">Equipe</h4>
                    <button onClick={() => openModal('newTeamMember')} className={`${theme.primary} font-semibold text-sm flex items-center gap-1 hover:text-yellow-400 transition-colors`}>
                        <span className="material-symbols-outlined text-lg">add</span>Adicionar
                    </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-1">
                     {team.map(member => (
                        <motion.div key={member.id} layout variants={itemVariants} className="flex items-center gap-3 rounded-lg bg-card-dark p-3">
                            <img src={member.image_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-grow">
                                <p className="font-semibold text-white">{member.name}</p>
                                <p className="text-sm text-text-secondary-dark">{member.role} ({Math.round(member.commissionRate * 100)}%)</p>
                            </div>
                            <div className="relative">
                                <button onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)} className="text-text-secondary-dark hover:text-white transition-colors p-1 rounded-full"><span className="material-symbols-outlined">more_vert</span></button>
                                <AnimatePresence>
                                    {activeMenu === member.id && (
                                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="absolute top-full right-0 mt-1 w-48 bg-background-dark rounded-lg shadow-lg border border-white/10 z-20">
                                            <button onClick={() => { openModal('editCommission', member); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2 transition-colors"><span className="material-symbols-outlined text-base">percent</span>Editar Comissão</button>
                                            <button onClick={() => { openModal('editTeamMember', member); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2 transition-colors"><span className="material-symbols-outlined text-base">edit</span>Editar Perfil</button>
                                            <button onClick={() => { handleDeleteMember(member.id); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"><span className="material-symbols-outlined text-base">delete</span>Remover</button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ))}
                </div>
                <AnimatePresence>
                    {copyMessage && <motion.div key="copy-toast" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-xl z-50 text-sm font-semibold">{copyMessage}</motion.div>}
                </AnimatePresence>
            </motion.div>
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="text-lg font-bold">Serviços</h4>
                    <button onClick={() => openModal('newService')} className={`${theme.primary} font-semibold text-sm flex items-center gap-1 hover:text-yellow-400 transition-colors`}><span className="material-symbols-outlined text-lg">add</span>Adicionar</button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {services.map(service => (
                        <div key={service.id} className="flex items-center justify-between rounded-lg bg-card-dark p-3">
                            <div>
                               <p className="font-semibold text-white">{service.name}</p>
                               <p className="text-sm text-text-secondary-dark">{service.duration_minutes} min</p>
                            </div>
                             <p className="font-bold text-green-400">{formatCurrency(service.price, user.currency)}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Management;