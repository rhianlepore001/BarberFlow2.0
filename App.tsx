import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

import type { View, Appointment, User, TeamMember, Client } from './types';
import { navItems } from './data';
import { supabase } from './lib/supabaseClient';
import { useTheme } from '@/hooks/useTheme';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Home from './views/Home';
import Agenda from './views/Agenda';
import Clients from './views/Clients';
import CashFlow from './views/CashFlow';
import Management from './views/Management';
import Analysis from './views/Analysis';
import Modal from './components/Modal';
import NewAppointmentForm from './components/forms/NewAppointmentForm';
import NewClientForm from './components/forms/NewClientForm';
import NewTransactionForm from './components/forms/NewTransactionForm';
import NewTeamMemberForm from './components/forms/NewTeamMemberForm';
import NewServiceForm from './components/forms/NewServiceForm';
import EditProfileForm from './components/forms/EditProfileForm';
import EditWorkingHoursForm from './components/forms/EditWorkingHoursForm';
import EditTeamMemberForm from './components/forms/EditTeamMemberForm';
import EditCommissionForm from './components/forms/EditCommissionForm';
import AppointmentDetailsModal from './components/AppointmentDetailsModal';
import EditDailyGoalForm from './components/forms/EditDailyGoalForm';
import ClientDetailsModal from './components/ClientDetailsModal';
import EditSettlementDayForm from './components/forms/EditSettlementDayForm';

type ModalContentType = 'newAppointment' | 'editAppointment' | 'newClient' | 'newTransaction' | 'newTeamMember' | 'newService' | 'editProfile' | 'editHours' | 'editTeamMember' | 'editCommission' | 'appointmentDetails' | 'editDailyGoal' | 'clientDetails' | 'editSettlementDay';

interface AppProps {
    session: Session;
}

const App: React.FC<AppProps> = ({ session }) => {
    const [activeView, setActiveView] = useState<View>('inicio');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContentType | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [dataVersion, setDataVersion] = useState(0);
    const [profileLoadAttempts, setProfileLoadAttempts] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(500);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    const theme = useTheme(user); // Inicializa o hook de tema

    const refreshData = () => setDataVersion(v => v + 1);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    useEffect(() => {
        const MAX_ATTEMPTS = 5;
        
        const fetchUserProfile = async () => {
            if (!session.user) {
                setIsInitialLoading(false);
                return;
            }

            // 1. Fetch team member data (which includes shop_id)
            const { data: memberData, error: memberError } = await supabase
                .from('team_members')
                .select('name, image_url, shop_id')
                .eq('auth_user_id', session.user.id)
                .limit(1)
                .single();

            let shopName = "Barbearia";
            let name = session.user.email?.split('@')[0] || "Usuário";
            let imageUrl = "";
            let shopId: number | null = null;
            let shopType: 'barbearia' | 'salao' = 'barbearia'; // Default

            if (memberError) {
                // PGRST116: No rows found (pode ser um novo usuário que o trigger ainda não processou)
                if (memberError.code !== 'PGRST116') {
                    console.error("Error fetching user profile from DB:", memberError.message);
                }
            }

            if (memberData) {
                name = memberData.name;
                const imageUrlWithCacheBust = memberData.image_url ? `${memberData.image_url.split('?')[0]}?t=${new Date().getTime()}` : '';
                imageUrl = imageUrlWithCacheBust;
                shopId = memberData.shop_id;
            } else {
                 // Fallback for users who signed up via OAuth without custom metadata
                const metadataName = session.user.user_metadata?.name;
                const metadataImageUrl = session.user.user_metadata?.image_url;

                if (metadataName) name = metadataName;
                if (metadataImageUrl) imageUrl = `${metadataImageUrl.split('?')[0]}?t=${new Date().getTime()}`;
            }
            
            // 2. Fetch shop name and Daily Goal if shopId exists
            if (shopId) {
                const [shopRes, settingsRes] = await Promise.all([
                    // Adiciona 'type' na busca da loja
                    supabase.from('shops').select('name, type').eq('id', shopId).limit(1).single(),
                    supabase.from('shop_settings').select('daily_goal').eq('shop_id', shopId).limit(1).single()
                ]);
                
                if (shopRes.data) {
                    shopName = shopRes.data.name;
                    shopType = (shopRes.data.type as 'barbearia' | 'salao') || 'barbearia'; // Captura o tipo
                }
                
                if (settingsRes.data && settingsRes.data.daily_goal !== null) {
                    setDailyGoal(settingsRes.data.daily_goal);
                } else {
                    setDailyGoal(500); // Default fallback
                }
            }

            if (!shopId) {
                // Se o shopId ainda for nulo, tentamos novamente se não excedeu o limite
                if (profileLoadAttempts < MAX_ATTEMPTS) {
                    console.warn(`Shop ID not found. Retrying in 1 second... (Attempt ${profileLoadAttempts + 1}/${MAX_ATTEMPTS})`);
                    setProfileLoadAttempts(prev => prev + 1);
                    setTimeout(fetchUserProfile, 1000);
                } else {
                    console.error("FATAL: User does not have an associated shop ID after multiple attempts. Forcing logout.");
                    // Se falhar após MAX_ATTEMPTS, forçamos o logout para voltar à tela de AuthScreen
                    await handleLogout(); 
                    setUser(null);
                    setIsInitialLoading(false);
                }
                return;
            }

            const finalUser: User = { name, imageUrl, shopName, shopId, shopType }; // Adiciona shopType
            setUser(finalUser);
            setProfileLoadAttempts(0); // Reset attempts on success
            setIsInitialLoading(false);
        };
        
        // Inicia a busca ou repetição
        fetchUserProfile();
    }, [session, dataVersion, profileLoadAttempts]);
    
    const openModal = (content: ModalContentType, data: any = null) => {
        if (!user) return;
        
        if (content === 'editTeamMember' || content === 'editCommission') {
            setEditingMember(data as TeamMember);
        } else if (content === 'clientDetails' && data) {
            setSelectedClient(data as Client);
        }
        
        setModalContent(content);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalContent(null);
            setEditingAppointment(null);
            setEditingMember(null);
            setSelectedClient(null);
        }, 300);
    };

    const handleSuccess = () => {
        refreshData();
        closeModal();
    };
    
    const handleAppointmentSelect = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setModalContent('appointmentDetails'); 
        setIsModalOpen(true);
    };
    
    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setModalContent('clientDetails');
        setIsModalOpen(true);
    };
    
    const handleEditAppointment = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setModalContent('editAppointment');
    };

    const renderView = () => {
        if (!user) return null;
        switch (activeView) {
            case 'inicio':
                return <Home 
                            user={user} 
                            dataVersion={dataVersion} 
                            setActiveView={setActiveView} 
                            openModal={openModal} 
                            onAppointmentSelect={handleAppointmentSelect}
                        />;
            case 'agenda':
                return <Agenda 
                            onAppointmentSelect={handleAppointmentSelect} 
                            dataVersion={dataVersion} 
                            initialAppointment={editingAppointment}
                            user={user}
                        />;
            case 'clientes':
                return <Clients dataVersion={dataVersion} onClientSelect={handleClientSelect} user={user} />;
            case 'caixa':
                return <CashFlow dataVersion={dataVersion} refreshData={refreshData} user={user} />;
            case 'gestao':
                return <Management user={user} openModal={openModal} dataVersion={dataVersion} refreshData={refreshData} />;
            case 'analise':
                return <Analysis dataVersion={dataVersion} user={user} />;
            default:
                return <Home 
                            user={user} 
                            dataVersion={dataVersion} 
                            setActiveView={setActiveView} 
                            openModal={openModal} 
                            onAppointmentSelect={handleAppointmentSelect}
                        />;
        }
    };
    
    const getModalContent = () => {
        if (!user) return null;
        
        switch (modalContent) {
            case 'newAppointment':
                return <NewAppointmentForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'editAppointment':
                return <NewAppointmentForm onClose={closeModal} onSuccess={handleSuccess} appointment={editingAppointment} shopId={user.shopId} user={user} />;
            case 'appointmentDetails':
                if (!editingAppointment) return null;
                return <AppointmentDetailsModal 
                            appointment={editingAppointment} 
                            onClose={closeModal} 
                            onSuccess={handleSuccess} 
                            shopId={user.shopId} 
                            onEditClick={handleEditAppointment}
                            user={user}
                        />;
             case 'newClient':
                return <NewClientForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'clientDetails':
                if (!selectedClient) return null;
                return <ClientDetailsModal client={selectedClient} onClose={closeModal} onSuccess={handleSuccess} user={user} />;
            case 'newTransaction':
                return <NewTransactionForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'newTeamMember':
                return <NewTeamMemberForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'newService':
                return <NewServiceForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'editProfile':
                return <EditProfileForm user={user} session={session} onClose={closeModal} onSuccess={handleSuccess} />;
            case 'editHours':
                return <EditWorkingHoursForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'editTeamMember':
                return <EditTeamMemberForm member={editingMember!} onClose={closeModal} onSuccess={handleSuccess} user={user} />;
            case 'editCommission':
                return <EditCommissionForm member={editingMember!} onClose={closeModal} onSuccess={handleSuccess} user={user} />;
            case 'editDailyGoal':
                return <EditDailyGoalForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} currentGoal={dailyGoal} user={user} />;
            case 'editSettlementDay': // NOVO
                return <EditSettlementDayForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            default:
                return null;
        }
    }

    const handleFabClick = () => {
        if (activeView === 'agenda') openModal('newAppointment');
        else if (activeView === 'clientes') openModal('newClient');
        else if (activeView === 'caixa') openModal('newTransaction');
    };

    const pageVariants = {
        initial: { opacity: 0, scale: 0.98 },
        in: { opacity: 1, scale: 1 },
        out: { opacity: 0, scale: 0.98 },
    };

    const pageTransition = {
        type: 'tween',
        ease: 'circOut',
        duration: 0.3,
    };

    const isFabVisible = ['agenda', 'clientes', 'caixa'].includes(activeView);

    if (isInitialLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-background-dark text-white">
                <p>Carregando painel...</p>
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen bg-background-dark text-white">
                <p>Erro ao carregar perfil. Tentando novamente...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-background-dark">
            <Sidebar 
                user={user}
                onLogout={handleLogout}
                items={navItems}
                activeView={activeView}
                setActiveView={setActiveView}
                openModal={() => openModal('editProfile')}
            />
            
            <div className="relative flex flex-col w-full md:ml-64">
                <Header activeViewLabel={navItems.find(item => item.id === activeView)?.label || 'FlowPro'}/>
                
                <div className="flex-grow overflow-y-auto pb-20 md:pb-4">
                    <AnimatePresence mode="wait">
                        <motion.main
                            key={activeView}
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                            className="flex-grow"
                        >
                            {renderView()}
                        </motion.main>
                    </AnimatePresence>
                </div>
                
                <AnimatePresence>
                {isFabVisible && (
                     <motion.div 
                        initial={{ scale: 0, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0, y: 50, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="fixed bottom-24 right-4 z-20 md:bottom-8 md:right-8"
                    >
                        <button 
                            onClick={handleFabClick}
                            className={`flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full ${theme.bgPrimary} text-background-dark shadow-lg ${theme.shadowPrimary}`}
                            aria-label="Adicionar novo item"
                        >
                            <span className="material-symbols-outlined text-4xl">add</span>
                        </button>
                    </motion.div>
                )}
                </AnimatePresence>
                
                <BottomNav items={navItems} activeView={activeView} setActiveView={setActiveView} user={user} />

                <Modal isOpen={isModalOpen} onClose={closeModal}>
                    {getModalContent()}
                </Modal>
            </div>
        </div>
    );
};

export default App;