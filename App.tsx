import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

import type { View, Appointment, User, TeamMember, Client } from './types';
import { navItems } from './data';
import { supabase } from './lib/supabaseClient';
import { useTheme } from '@/hooks/useTheme';
import { useShopLabels } from '@/hooks/useShopLabels'; // Importa o novo hook

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';

// Lazy load views
const Home = lazy(() => import('./views/Home'));
const Agenda = lazy(() => import('./views/Agenda'));
const Clients = lazy(() => import('./views/Clients'));
const CashFlow = lazy(() => import('./views/CashFlow'));
const Management = lazy(() => import('./views/Management'));
const Analysis = lazy(() => import('./views/Analysis'));

// Lazy load forms for the modal
const NewAppointmentForm = lazy(() => import('./components/forms/NewAppointmentForm'));
const NewClientForm = lazy(() => import('./components/forms/NewClientForm'));
const NewTransactionForm = lazy(() => import('./components/forms/NewTransactionForm'));
const NewTeamMemberForm = lazy(() => import('./components/forms/NewTeamMemberForm'));
const NewServiceForm = lazy(() => import('./components/forms/NewServiceForm'));
const EditProfileForm = lazy(() => import('./components/forms/EditProfileForm'));
const EditWorkingHoursForm = lazy(() => import('./components/forms/EditWorkingHoursForm'));
const EditTeamMemberForm = lazy(() => import('./components/forms/EditTeamMemberForm'));
const EditCommissionForm = lazy(() => import('./components/forms/EditCommissionForm'));
const AppointmentDetailsModal = lazy(() => import('./components/AppointmentDetailsModal'));
const EditDailyGoalForm = lazy(() => import('./components/forms/EditDailyGoalForm'));
const ClientDetailsModal = lazy(() => import('./components/ClientDetailsModal'));
const EditSettlementDayForm = lazy(() => import('./components/forms/EditSettlementDayForm'));


type ModalContentType = 'newAppointment' | 'editAppointment' | 'newClient' | 'newTransaction' | 'newTeamMember' | 'newService' | 'editProfile' | 'editHours' | 'editTeamMember' | 'editCommission' | 'appointmentDetails' | 'editDailyGoal' | 'clientDetails' | 'editSettlementDay';

interface AppProps {
    session: Session;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <p>Carregando...</p>
    </div>
);

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
    
    const theme = useTheme(user);
    const shopLabels = useShopLabels(user?.shopType); // Usa o novo hook aqui também

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
            let shopType: 'barbearia' | 'salao' = 'barbearia';
            let country: 'BR' | 'PT' = 'BR';
            let currency: 'BRL' | 'EUR' = 'BRL'; // Inicializa com BRL

            if (memberError && memberError.code !== 'PGRST116') {
                console.error("Error fetching user profile from DB:", memberError.message);
            }

            if (memberData) {
                name = memberData.name;
                imageUrl = memberData.image_url || ''; // Não adiciona cache buster aqui, será feito no final
                shopId = memberData.shop_id;
            } else {
                const metadataName = session.user.user_metadata?.name;
                const metadataImageUrl = session.user.user_metadata?.image_url;
                if (metadataName) name = metadataName;
                if (metadataImageUrl) imageUrl = metadataImageUrl; // Não adiciona cache buster aqui
            }
            
            if (shopId) {
                const [shopRes, settingsRes] = await Promise.all([
                    supabase.from('shops').select('name, type, country, currency').eq('id', shopId).limit(1).single(), // Busca currency
                    supabase.from('shop_settings').select('daily_goal').eq('shop_id', shopId).limit(1).single()
                ]);
                
                if (shopRes.data) {
                    shopName = shopRes.data.name;
                    shopType = (shopRes.data.type as 'barbearia' | 'salao') || 'barbearia';
                    country = (shopRes.data.country as 'BR' | 'PT') || 'BR';
                    currency = (shopRes.data.currency as 'BRL' | 'EUR') || 'BRL'; // Define currency
                    
                    // console.log('🏪 Shop loaded:', {
                    //     shopId,
                    //     shopName,
                    //     country,
                    //     currency,
                    //     rawData: shopRes.data
                    // });
                }
                
                if (settingsRes.data && settingsRes.data.daily_goal !== null) {
                    setDailyGoal(settingsRes.data.daily_goal);
                } else {
                    setDailyGoal(500);
                }
            }

            if (!shopId) {
                if (profileLoadAttempts < MAX_ATTEMPTS) {
                    console.warn(`Shop ID not found. Retrying... (Attempt ${profileLoadAttempts + 1})`);
                    setProfileLoadAttempts(prev => prev + 1);
                    setTimeout(fetchUserProfile, 1000);
                } else {
                    console.error("FATAL: Could not associate user with a shop. Forcing logout.");
                    await handleLogout(); 
                    setUser(null);
                    setIsInitialLoading(false);
                }
                return;
            }
            
            // Adiciona cache buster à URL da imagem APENAS no final, se houver uma URL
            const finalImageUrl = imageUrl ? `${imageUrl.split('?')[0]}?t=${new Date().getTime()}` : `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${shopType === 'salao' ? '8A2BE2' : 'E5A00D'}&color=101012`;

            const finalUser: User = { name, imageUrl: finalImageUrl, shopName, shopId, shopType, country, currency }; // Inclui currency
            
            // console.log('👤 Setting user:', finalUser);

            setUser(finalUser);
            // console.log("User profile loaded:", finalUser); // LOG PARA DEBUG
            setProfileLoadAttempts(0);
            setIsInitialLoading(false);
        };
        
        fetchUserProfile();
    }, [session, dataVersion, profileLoadAttempts]);

    // Log para o estado atual do usuário
    useEffect(() => {
        // console.log('👤 Current user state:', user);
    }, [user]);
    
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
                return <Home user={user} dataVersion={dataVersion} setActiveView={setActiveView} openModal={openModal} onAppointmentSelect={handleAppointmentSelect} />;
            case 'agenda':
                return <Agenda onAppointmentSelect={handleAppointmentSelect} dataVersion={dataVersion} initialAppointment={editingAppointment} user={user} />;
            case 'clientes':
                return <Clients dataVersion={dataVersion} onClientSelect={handleClientSelect} user={user} />;
            case 'caixa':
                return <CashFlow dataVersion={dataVersion} refreshData={refreshData} user={user} />;
            case 'gestao':
                return <Management user={user} openModal={openModal} dataVersion={dataVersion} refreshData={refreshData} />;
            case 'analise':
                return <Analysis dataVersion={dataVersion} user={user} />;
            default:
                return <Home user={user} dataVersion={dataVersion} setActiveView={setActiveView} openModal={openModal} onAppointmentSelect={handleAppointmentSelect} />;
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
                return <AppointmentDetailsModal appointment={editingAppointment} onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} onEditClick={handleEditAppointment} user={user} />;
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
            case 'editSettlementDay':
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
        return <div className="flex justify-center items-center h-screen bg-background-dark text-white"><p>Carregando painel...</p></div>;
    }
    
    if (!user) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-white"><p>Erro ao carregar perfil. Tentando novamente...</p></div>;
    }

    return (
        <div className="flex min-h-screen w-full bg-background-dark">
            <Sidebar user={user} onLogout={handleLogout} items={navItems} activeView={activeView} setActiveView={setActiveView} openModal={() => openModal('editProfile')} />
            
            <div className="relative flex flex-col w-full md:ml-64">
                <Header activeViewLabel={navItems.find(item => item.id === activeView)?.label || 'FlowPro'}/>
                
                <div className="flex-grow overflow-y-auto pb-20 md:pb-4">
                    <Suspense fallback={<LoadingSpinner />}>
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
                    </Suspense>
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
                    <Suspense fallback={<LoadingSpinner />}>
                        {getModalContent()}
                    </Suspense>
                </Modal>
            </div>
        </div>
    );
};

export default App;