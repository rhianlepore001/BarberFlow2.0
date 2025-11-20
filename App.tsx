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

// Forms...
const NewAppointmentForm = lazy(() => import('./components/forms/NewAppointmentForm'));
// ... other forms will be lazy loaded as needed

type ModalContentType = 'newAppointment' | 'editAppointment' | 'newClient' | 'newTransaction' | 'newTeamMember' | 'newService' | 'editProfile' | 'editHours' | 'editTeamMember' | 'editCommission' | 'appointmentDetails' | 'editDailyGoal' | 'clientDetails' | 'editSettlementDay';

interface AppProps {
    session: Session;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <p>Loading...</p>
    </div>
);

const App: React.FC<AppProps> = ({ session }) => {
    const [activeView, setActiveView] = useState<View>('inicio');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContentType | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [dataVersion, setDataVersion] = useState(0);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    // State for modal data
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

            // 1. Get the user's tenant_id
            const { data: memberData, error: memberError } = await supabase
                .from('tenant_members')
                .select('tenant_id')
                .eq('user_id', session.user.id)
                .single();

            if (memberError || !memberData) {
                console.error("Could not find tenant for user.", memberError);
                setIsInitialLoading(false);
                return;
            }

            // 2. Get the tenant details
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

    const openModal = (content: ModalContentType, data: any = null) => { /* ... implementation ... */ };
    const closeModal = () => { /* ... implementation ... */ };
    const handleSuccess = () => { /* ... implementation ... */ };
    const handleAppointmentSelect = (appointment: Appointment) => { /* ... implementation ... */ };
    const handleClientSelect = (client: Client) => { /* ... implementation ... */ };
    const handleEditAppointment = (appointment: Appointment) => { /* ... implementation ... */ };
    
    const renderView = () => {
        if (!user) return null;
        // This will be expanded to render the correct view component
        return <p className="p-4">Current View: {activeView}</p>;
    };

    const getModalContent = () => {
        if (!user) return null;
        // This will be expanded to render the correct form in the modal
        return null;
    };

    const handleFabClick = () => { /* ... implementation ... */ };


    if (isInitialLoading || !user) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-white"><p>Loading your empire...</p></div>;
    }
    
    const themeClass = `theme-${user.tenant.business_type}`;

    return (
        <div className={`flex min-h-screen w-full ${themeClass}`}>
            <Sidebar user={user} onLogout={handleLogout} items={navItems} activeView={activeView} setActiveView={setActiveView} openModal={() => openModal('editProfile')} />
            
            <div className="relative flex flex-col w-full md:ml-64 bg-background">
                <Header activeViewLabel={navItems.find(item => item.id === activeView)?.label || 'AlphaCore'}/>
                
                <div className="flex-grow overflow-y-auto pb-20 md:pb-4 text-text-primary">
                    <Suspense fallback={<LoadingSpinner />}>
                        <AnimatePresence mode="wait">
                            <motion.main
                                key={activeView}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderView()}
                            </motion.main>
                        </AnimatePresence>
                    </Suspense>
                </div>
                
                {/* FAB and BottomNav will be added here */}
                
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