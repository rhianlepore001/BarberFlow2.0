import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
// import { supabase } from '../lib/supabaseClient'; // Removido
import type { TeamMember, Service, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useShopLabels } from '../hooks/useShopLabels';
import { getMockClients, getMockServices, getMockTeamMembers, mockCreateAppointment, mockUpdateClient } from '../lib/mockData';

// Lazy load booking steps
const PublicAuth = lazy(() => import('../components/PublicAuth'));
const PublicProfileSetup = lazy(() => import('../components/PublicProfileSetup'));
const BookingBarberSelector = lazy(() => import('../components/BookingBarberSelector'));
const BookingServiceSelector = lazy(() => import('../components/BookingServiceSelector'));
const BookingCalendar = lazy(() => import('../components/BookingCalendar'));
const BookingConfirmation = lazy(() => import('../components/BookingConfirmation'));

type BookingStep = 'auth' | 'profileSetup' | 'selectBarber' | 'services' | 'calendar' | 'confirm';

interface PublicBookingProps {
    shopId: string;
    setSession: (session: any | null) => void; // Adicionado para logout/login
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-48 w-full">
        <p className="text-text-secondary-dark">Carregando...</p>
    </div>
);

const PublicBooking: React.FC<PublicBookingProps> = ({ shopId, setSession }) => {
    const [step, setStep] = useState<BookingStep>('auth');
    const [shopDetails, setShopDetails] = useState<{ name: string, type: 'barber' | 'beauty', country: 'BR' | 'PT', currency: 'BRL' | 'EUR' } | null>(null);
    const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
    const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientSession, setClientSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const themeUser = useMemo(() => {
        if (!shopDetails) return null;
        return {
            name: clientSession?.user.user_metadata?.name || shopDetails.name,
            imageUrl: clientSession?.user.user_metadata?.image_url || '',
            shopId: shopId,
            shopName: shopDetails.name,
            shopType: shopDetails.type === 'barber' ? 'barbearia' : 'salao', // Mapear para o tipo User
            country: shopDetails.country,
            currency: shopDetails.currency,
        };
    }, [shopDetails, shopId, clientSession]);

    const theme = useTheme(themeUser); 
    const shopLabels = useShopLabels(shopDetails?.type === 'barber' ? 'barbearia' : 'salao'); // Mapear para o tipo User

    const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0), [selectedServices]);
    const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);

    const checkSessionAndSetStep = () => {
        const storedSession = localStorage.getItem('user_session');
        const session = storedSession ? JSON.parse(storedSession) : null;
        
        if (session) {
            setClientSession(session);
            const name = session.user.user_metadata?.name;
            const phone = session.user.user_metadata?.phone;
            
            if (!name || !phone) {
                setStep('profileSetup');
            } else {
                setStep('selectBarber');
            }
        } else {
            setClientSession(null);
            setStep('auth');
        }
    };

    useEffect(() => {
        const fetchShopDetailsAndData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Simulação de dados da loja pública
                const mockShopDetails = { 
                    name: "BarberFlow Public", 
                    type: 'barber' as 'barber' | 'beauty', 
                    country: 'BR' as 'BR' | 'PT', 
                    currency: 'BRL' as 'BRL' | 'EUR' 
                };
                const mockTeamMembers = getMockTeamMembers();
                const mockServices = getMockServices();

                setShopDetails(mockShopDetails);
                setAllTeamMembers(mockTeamMembers);
                setServices(mockServices);
                
                if (mockTeamMembers.length > 0) {
                    setSelectedBarber(mockTeamMembers[0]);
                }

            } catch (err) {
                setError('Erro inesperado ao carregar dados da loja');
            } finally {
                setLoading(false);
            }
            
            checkSessionAndSetStep();
        };
        
        fetchShopDetailsAndData();
        
        // Para fins de protótipo, não há listener de auth real aqui.
        // A sessão será atualizada via setSession passado do AuthGate.
    }, [shopId]);

    const handleAuthSuccess = (session: any) => {
        setClientSession(session);
        const name = session.user.user_metadata?.name;
        const phone = session.user.user_metadata?.phone;
        if (!name || !phone) setStep('profileSetup');
        else setStep('selectBarber');
    };
    
    const handleProfileSetupSuccess = (updatedUserMetadata: any) => {
        // Atualiza a sessão localmente com os novos metadados
        if (clientSession) {
            const newSession = {
                ...clientSession,
                user: {
                    ...clientSession.user,
                    user_metadata: {
                        ...clientSession.user.user_metadata,
                        ...updatedUserMetadata,
                    },
                },
            };
            setClientSession(newSession);
            localStorage.setItem('user_session', JSON.stringify(newSession));
        }
        setStep('selectBarber');
    };
    
    const handleSelectBarber = (barber: TeamMember) => {
        setSelectedBarber(barber);
        setStep('services');
    };

    const handleServiceSelect = (services: Service[]) => {
        setSelectedServices(services);
        setStep('calendar');
    };
    
    const handleTimeSelect = (date: Date, time: string) => {
        setSelectedDate(date);
        setSelectedTime(time);
        setStep('confirm');
    };
    
    const handleBookingSuccess = () => {
        alert("Agendamento realizado com sucesso!");
        setStep('selectBarber');
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedBarber(null);
    };
    
    const renderStep = () => {
        if (!shopDetails) return null;
        
        const simulatedUser: User = {
            name: clientSession?.user.user_metadata?.name || 'Cliente',
            imageUrl: clientSession?.user.user_metadata?.image_url || '',
            shopName: shopDetails.name,
            shopId: shopId,
            shopType: shopDetails.type === 'barber' ? 'barbearia' : 'salao',
            country: shopDetails.country,
            currency: shopDetails.currency,
        };

        switch (step) {
            case 'auth':
                return <PublicAuth onAuthSuccess={handleAuthSuccess} theme={theme} setSession={setSession} />;
            case 'profileSetup':
                if (!clientSession) return null;
                return <PublicProfileSetup session={clientSession} onSuccess={handleProfileSetupSuccess} theme={theme} />;
            case 'selectBarber':
                return <BookingBarberSelector teamMembers={allTeamMembers} onSelectBarber={handleSelectBarber} theme={theme} />;
            case 'services':
                if (!selectedBarber) return null; 
                return <BookingServiceSelector services={services} onNext={handleServiceSelect} theme={theme} user={simulatedUser} />;
            case 'calendar':
                if (!selectedBarber || selectedServices.length === 0) return null;
                return <BookingCalendar selectedBarber={selectedBarber} selectedServices={selectedServices} totalDuration={totalDuration} onTimeSelect={handleTimeSelect} onBack={() => setStep('services')} theme={theme} user={simulatedUser} />;
            case 'confirm':
                if (!selectedBarber || !clientSession || selectedServices.length === 0 || !selectedDate || !selectedTime) return null;
                return <BookingConfirmation selectedBarber={selectedBarber} clientSession={clientSession} selectedServices={selectedServices} totalDuration={totalDuration} totalPrice={totalPrice} selectedDate={selectedDate!} selectedTime={selectedTime!} onSuccess={handleBookingSuccess} onBack={() => setStep('calendar')} theme={theme} user={simulatedUser} />;
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-white">Carregando...</div>;
    }
    
    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-400 text-center p-4">{error}</div>;
    }
    
    const shopEmoji = shopLabels.shopTypeEmoji;
    const profileImageUrl = selectedBarber?.image_url || clientSession?.user.user_metadata?.image_url || `https://ui-avatars.com/api/?name=${shopDetails?.name || shopLabels.defaultAvatarName}&background=${theme.themeColor}&color=101012`;
    const profileName = selectedBarber ? `Agende com ${selectedBarber.name}` : `Agende em ${shopDetails?.name}`;
    const profileSubtitle = selectedBarber ? `${selectedBarber.role} em ${shopDetails?.name}` : `Seja bem-vindo(a)! Encontre o horário perfeito e faça seu agendamento em ${shopLabels.shopTypeLabel}.`;

    return (
        <div className="min-h-screen bg-background-dark p-4 flex flex-col items-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-card-dark rounded-xl shadow-2xl p-6 space-y-6"
            >
                <div className="text-center">
                    <img src={profileImageUrl} alt={profileName} className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-2 border-white/10" />
                    <h1 className="text-2xl font-extrabold text-white">{profileName}</h1>
                    <p className="text-sm text-text-secondary-dark">{profileSubtitle}</p>
                    {!selectedBarber && <h2 className={`text-xl font-bold mt-4 ${theme.primary}`}>{shopDetails?.name} {shopEmoji}</h2>}
                </div>
                
                <Suspense fallback={<LoadingSpinner />}>
                    {renderStep()}
                </Suspense>
            </motion.div>
        </div>
    );
};

export default PublicBooking;