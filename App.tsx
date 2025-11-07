import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

import type { View, Appointment, User, TeamMember } from './types';
import { navItems } from './data';
import { supabase } from './lib/supabaseClient';

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

type ModalContentType = 'newAppointment' | 'editAppointment' | 'newClient' | 'newTransaction' | 'newTeamMember' | 'newService' | 'editProfile' | 'editHours' | 'editTeamMember';

interface AppProps {
    session: Session;
}

const App: React.FC<AppProps> = ({ session }) => {
    const [activeView, setActiveView] = useState<View>('inicio');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContentType | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [dataVersion, setDataVersion] = useState(0);
    const [profileLoadAttempts, setProfileLoadAttempts] = useState(0);

    const refreshData = () => setDataVersion(v => v + 1);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    useEffect(() => {
        const MAX_ATTEMPTS = 5;
        
        const fetchUserProfile = async () => {
            if (!session.user) return;

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

            if (memberError) {
                console.error("Error fetching user profile from DB (will fallback):", memberError.message);
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
            
            // 2. Fetch shop name if shopId exists
            if (shopId) {
                const { data: shopData, error: shopError } = await supabase
                    .from('shops')
                    .select('name')
                    .eq('id', shopId)
                    .limit(1)
                    .single();
                
                if (shopError) {
                    console.error("Error fetching shop name:", shopError.message);
                }
                if (shopData) {
                    shopName = shopData.name;
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
                }
                return;
            }

            const finalUser: User = { name, imageUrl, shopName, shopId };
            setUser(finalUser);
            setProfileLoadAttempts(0); // Reset attempts on success
        };
        
        // Inicia a busca ou repetição
        fetchUserProfile();
    }, [session, dataVersion, profileLoadAttempts]);
    
    const openModal = (content: ModalContentType, data: any = null) => {
        if (!user) return; // Previne abertura de modal se o usuário não estiver carregado
        
        if (content === 'editTeamMember' && data) {
            setEditingMember(data as TeamMember);
        } else if (content === 'editProfile' && user) {
            // No need to pass data, component will get it from props
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
        }, 300);
    };

    const handleSuccess = () => {
        refreshData();
        closeModal();
    };
    
    const handleAppointmentSelect = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setModalContent('editAppointment');
        setIsModalOpen(true);
    };

    const renderView = () => {
        if (!user) return null;
        switch (activeView) {
            case 'inicio':
                return <Home user={user} dataVersion={dataVersion} />;
            case 'agenda':
                return <Agenda onAppointmentSelect={handleAppointmentSelect} dataVersion={dataVersion} />;
            case 'clientes':
                return <Clients dataVersion={dataVersion} />;
            case 'caixa':
                return <CashFlow dataVersion={dataVersion} />;
            case 'gestao':
                return <Management user={user} openModal={openModal} dataVersion={dataVersion} refreshData={refreshData} />;
            case 'analise':
                return <Analysis dataVersion={dataVersion} />;
            default:
                return <Home user={user} dataVersion={dataVersion} />;
        }
    };
    
    const getModalContent = () => {
        if (!user) return null;
        
        switch (modalContent) {
            case 'newAppointment':
                return <NewAppointmentForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} />;
            case 'editAppointment':
                return <NewAppointmentForm onClose={closeModal} onSuccess={handleSuccess} appointment={editingAppointment} shopId={user.shopId} />;
             case 'newClient':
                return <NewClientForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} />;
            case 'newTransaction':
                return <NewTransactionForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} />;
            case 'newTeamMember':
                return <NewTeamMemberForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} />;
            case 'newService':
                return <NewServiceForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} />;
            case 'editProfile':
                return <EditProfileForm user={user} session={session} onClose={closeModal} onSuccess={handleSuccess} />;
            case 'editHours':
                return <EditWorkingHoursForm onClose={closeModal} onSuccess={handleSuccess} shopId={user.shopId} />;
            case 'editTeamMember':
                return <EditTeamMemberForm member={editingMember!} onClose={closeModal} onSuccess={handleSuccess} />;
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

    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen bg-background-dark text-white">
                <p>Carregando painel...</p>
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
                <Header activeViewLabel={navItems.find(item => item.id === activeView)?.label || 'BarberFlow'}/>
                
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
                            className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary text-background-dark shadow-lg shadow-primary/30"
                            aria-label="Adicionar novo item"
                        >
                            <span className="material-symbols-outlined text-4xl">add</span>
                        </button>
                    </motion.div>
                )}
                </AnimatePresence>
                
                <BottomNav items={navItems} activeView={activeView} setActiveView={setActiveView} />

                <Modal isOpen={isModalOpen} onClose={closeModal}>
                    {getModalContent()}
                </Modal>
            </div>
        </div>
    );
};

export default App;