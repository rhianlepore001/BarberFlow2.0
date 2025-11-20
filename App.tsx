import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

import type { View, Appointment, User, TeamMember, Client } from './types';
import { navItems } from './data';
import { supabase } from './lib/supabaseClient';
import { useTheme } from './hooks/useTheme';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';

// Lazy load views
const Home = lazy(() => import('./views/Home'));
const Agenda = lazy(() => import('./views/Agenda'));
const Clients = lazy(() => import('./views/Clients'));
const CashFlow = lazy(() => import('./views/CashFlow'));
const Management = lazy(() => import('./management'));
const Analysis = lazy(() => import('./views/Analysis'));

// Lazy load forms
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
const ClientDetailsModal = lazy(() => import('./components/forms/ClientDetailsModal'));
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
    const [user, setUser] = useState<User | null>(null);
    const [dataVersion, setDataVersion] = useState(0);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [dailyGoal, setDailyGoal] = useState(500);

    const theme = useTheme(user);
    const refreshData = () => setDataVersion(v => v + 1);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    useEffect(() => {
        const fetchUserAndTenant = async () => {
            if (!session.user) {
                setIsInitialLoading(false);
                return;
            }

            // 1. Tenta buscar o tenant_id na tabela de membros (donos/funcionários)
            const { data: memberData, error: memberError } = await supabase
                .from('tenant_members')
                .select('tenant_id')
                .eq('user_id', session.user.id)
                .limit(1)
                .single();

            // Se houver um erro que não seja 'nenhuma linha encontrada', logamos e paramos.
            if (memberError && memberError.code !== 'PGRST116') {
                console.error("Error fetching tenant member data:", memberError);
                setIsInitialLoading(false);
                return;
            }
            
            // Se não encontrou o membro, este usuário não é um membro da equipe/dono.
            // Ele pode ser um cliente que logou. Neste caso, ele não deve acessar o dashboard.
            if (!memberData) {
                console.warn("User is not a shop member. Redirecting or blocking dashboard access.");
                // Força o logout ou redireciona para a tela pública se necessário.
                // Por enquanto, apenas paramos o carregamento e mostramos uma tela de erro/bloqueio.
                setUser(null);
                setIsInitialLoading(false);
                return;
            }

            // 2. Busca os detalhes da loja (tenant)
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', memberData.tenant_id)
                .single();
            
            if (tenantError || !tenantData) {
                console.error("Could not fetch tenant details.", tenantError);
                setIsInitialLoading(false);
                return;
            }

            // 3. Constrói o objeto User
            const finalUser: User = {
                name: session.user.user_metadata.full_name || session.user.email,
                imageUrl: session.user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${session.user.user_metadata.full_name}`,
                shopId: tenantData.id,
                shopName: tenantData.name,
                shopType: tenantData.business_type,
                country: tenantData.country,
                currency: tenantData.currency,
            };

            setUser(finalUser);
            setIsInitialLoading(false);
        };

        fetchUserAndTenant();
    }, [session, dataVersion]);

    const openModal = (content: ModalContentType, data: any = null) => {
        if (data) {
            if (content === 'editAppointment' || content === 'appointmentDetails') setEditingAppointment(data);
            if (content === 'editTeamMember' || content === 'editCommission') setEditingMember(data);
            if (content === 'clientDetails') setSelectedClient(data);
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
        openModal('appointmentDetails', appointment);
    };

    const handleClientSelect = (client: Client) => {
        openModal('clientDetails', client);
    };

    const handleEditAppointment = (appointment: Appointment) => {
        closeModal();
        setTimeout(() => {
            openModal('editAppointment', appointment);
        }, 300);
    };
    
    const renderView = () => {
        if (!user) return null;
        switch (activeView) {
            case 'inicio':
                return <Home user={user} dataVersion={dataVersion} setActiveView={setActiveView} openModal={openModal} onAppointmentSelect={handleAppointmentSelect} />;
            case 'agenda':
                return <Agenda user={user} dataVersion={dataVersion} onAppointmentSelect={handleAppointmentSelect} initialAppointment={editingAppointment} />;
            case 'clientes':
                return <Clients user={user} dataVersion={dataVersion} onClientSelect={handleClientSelect} />;
            case 'caixa':
                return <CashFlow user={user} dataVersion={dataVersion} refreshData={refreshData} />;
            case 'analise':
                return <Analysis user={user} dataVersion={dataVersion} />;
            case 'gestao':
                return <Management user={user} dataVersion={dataVersion} openModal={openModal} refreshData={refreshData} />;
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
            case 'editTeamMember':
                if (!editingMember) return null;
                return <EditTeamMemberForm member={editingMember} onClose={closeModal} onSuccess={handleSuccess} user={user} />;
            case 'newService':
                return <NewServiceForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'editProfile':
                return <EditProfileForm user={user} session={session} onClose={closeModal} onSuccess={handleSuccess} />;
            case 'editHours':
                return <EditWorkingHoursForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'editCommission':
                if (!editingMember) return null;
                return <EditCommissionForm member={editingMember} onClose={closeModal} onSuccess={handleSuccess} user={user} />;
            case 'editDailyGoal':
                return <EditDailyGoalForm currentGoal={dailyGoal} onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            case 'editSettlementDay':
                return <EditSettlementDayForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} user={user} />;
            default:
                return null;
        }
    };

    const handleFabClick = () => {
        switch (activeView) {
            case 'agenda': openModal('newAppointment'); break;
            case 'clientes': openModal('newClient'); break;
            case 'caixa': openModal('newTransaction'); break;
            default: openModal('newAppointment'); break;
        }
    };

    if (isInitialLoading) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-white"><p>Carregando seu negócio...</p></div>;
    }
    
    // Se o carregamento terminou, mas o usuário não foi definido (porque não é um membro da equipe),
    // podemos mostrar uma mensagem de erro ou forçar o logout.
    if (!user) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-background-dark text-white p-4 text-center">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Acesso Negado</h1>
                <p className="text-text-secondary-dark mb-6">Sua conta não está associada a um painel de gestão. Se você é um cliente, use o link de agendamento público.</p>
                <button onClick={handleLogout} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-full hover:bg-gray-600 transition-colors">
                    Sair
                </button>
            </div>
        );
    }
    
    const themeClass = `theme-${user.shopType}`;

    return (
        <div className={`flex min-h-screen w-full ${themeClass}`}>
            <Sidebar user={user} onLogout={handleLogout} items={navItems} activeView={activeView} setActiveView={setActiveView} openModal={() => openModal('editProfile')} />
            
            <div className="relative flex flex-col w-full md:ml-64 bg-background">
                <Header activeViewLabel={navItems.find(item => item.id === activeView)?.label || 'FlowPro'}/>
                
                <main className="flex-grow overflow-y-auto pb-20 md:pb-4 text-text-primary">
                    <Suspense fallback={<LoadingSpinner />}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeView}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderView()}
                            </motion.div>
                        </AnimatePresence>
                    </Suspense>
                </main>
                
                <button
                    onClick={handleFabClick}
                    className={`fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-300 hover:scale-105 md:hidden ${theme.bgPrimary}`}
                    aria-label="Adicionar Novo"
                >
                    <span className="material-symbols-outlined text-3xl text-background-dark">add</span>
                </button>
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