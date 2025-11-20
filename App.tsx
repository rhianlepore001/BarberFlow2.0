import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

import type { View, Appointment, User, TeamMember, Client, Tenant } from './types';
import { navItems } from './data';
import { supabase } from './lib/supabaseClient';

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

// Forms... (mantendo os imports existentes)
const NewAppointmentForm = lazy(() => import('./components/forms/NewAppointmentForm'));
// ... outros forms

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
    
    // Mantendo outros estados...
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [dailyGoal, setDailyGoal] = useState(500);


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

            // 1. Obter o tenant_id do usuário
            const { data: memberData, error: memberError } = await supabase
                .from('tenant_members')
                .select('tenant_id')
                .eq('user_id', session.user.id)
                .single();

            if (memberError || !memberData) {
                console.error("Could not find tenant for user.", memberError);
                // Idealmente, teríamos um fluxo de erro aqui, talvez deslogar
                setIsInitialLoading(false);
                return;
            }

            // 2. Obter os detalhes do tenant
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

            const tenant: Tenant = {
                id: tenantData.id,
                name: tenantData.name,
                slug: tenantData.slug,
                business_type: tenantData.business_type,
            };

            const finalUser: User = {
                name: session.user.user_metadata.full_name || session.user.email,
                imageUrl: session.user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${session.user.user_metadata.full_name}`,
                tenant: tenant,
            };

            setUser(finalUser);
            setIsInitialLoading(false);
        };

        fetchUserAndTenant();
    }, [session, dataVersion]);

    // ... (resto das funções openModal, closeModal, handleSuccess, etc. permanecem as mesmas)
    const openModal = (content: ModalContentType, data: any = null) => {
        // ...
    };
    const closeModal = () => {
        // ...
    };
    const handleSuccess = () => {
        // ...
    };
    const handleAppointmentSelect = (appointment: Appointment) => {
        // ...
    };
    const handleClientSelect = (client: Client) => {
        // ...
    };
    const handleEditAppointment = (appointment: Appointment) => {
        // ...
    };
    const renderView = () => {
        // ...
    };
    const getModalContent = () => {
        // ...
    };
    const handleFabClick = () => {
        // ...
    };


    if (isInitialLoading || !user) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-white"><p>Carregando seu império...</p></div>;
    }
    
    const themeClass = `theme-${user.tenant.business_type}`;

    return (
        <div className={`flex min-h-screen w-full ${themeClass}`}>
            {/* O Sidebar e o BottomNav precisarão ser adaptados para receber o tema via props ou contexto */}
            <Sidebar user={user} onLogout={handleLogout} items={navItems} activeView={activeView} setActiveView={setActiveView} openModal={() => openModal('editProfile')} />
            
            <div className="relative flex flex-col w-full md:ml-64 bg-background">
                <Header activeViewLabel={navItems.find(item => item.id === activeView)?.label || 'AlphaCore'}/>
                
                <div className="flex-grow overflow-y-auto pb-20 md:pb-4 text-text-primary">
                    <Suspense fallback={<LoadingSpinner />}>
                        <AnimatePresence mode="wait">
                            <motion.main
                                key={activeView}
                                // ... (animações)
                            >
                                {/* {renderView()} */}
                                <p className="p-4">View: {activeView}</p>
                            </motion.main>
                        </AnimatePresence>
                    </Suspense>
                </div>
                
                {/* ... (FAB e BottomNav) */}
                
                <Modal isOpen={isModalOpen} onClose={closeModal}>
                    <Suspense fallback={<LoadingSpinner />}>
                        {/* {getModalContent()} */}
                    </Suspense>
                </Modal>
            </div>
        </div>
    );
};

export default App;