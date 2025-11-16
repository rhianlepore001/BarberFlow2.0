import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, Appointment } from '../types';
import { useTheme } from '../hooks/useTheme';

// Lazy load booking steps
const PublicAuth = lazy(() => import('../components/PublicAuth'));
const PublicProfileSetup = lazy(() => import('../components/PublicProfileSetup'));
const BookingBarberSelector = lazy(() => import('../components/BookingBarberSelector'));
const BookingServiceSelector = lazy(() => import('../components/BookingServiceSelector'));
const BookingCalendar = lazy(() => import('../components/BookingCalendar'));
const BookingConfirmation = lazy(() => import('../components/BookingConfirmation'));

type BookingStep = 'auth' | 'profileSetup' | 'selectBarber' | 'services' | 'calendar' | 'confirm';

interface PublicBookingProps {
    shopId: number;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-48 w-full">
        <p className="text-text-secondary-dark">Carregando...</p>
    </div>
);

const PublicBooking: React.FC<PublicBookingProps> = ({ shopId }) => {
    const [step, setStep] = useState<BookingStep>('auth');
    const [shopDetails, setShopDetails] = useState<{ name: string, type: 'barbearia' | 'salao' } | null>(null);
    const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
    const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientSession, setClientSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const theme = useTheme(null); 

    const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0), [selectedServices]);
    const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);

    const checkSessionAndSetStep = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
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

            if (isNaN(shopId) || shopId <= 0) {
                setError("ID da loja inválido na URL.");
                setLoading(false);
                return;
            }
            
            // 1. Fetch Shop Details
            const { data: shopData, error: shopError } = await supabase.from('shops').select('name, type').eq('id', shopId).limit(1).single();
            if (shopError) {
                setError(`Falha ao carregar a loja: ${shopError.message || 'Erro desconhecido'}.`);
                setLoading(false);
                return;
            }
            if (!shopData) {
                setError("Loja não encontrada.");
                setLoading(false);
                return;
            }
            setShopDetails(shopData);
            
            // 2. Fetch Team Members (agora com filtro direto no frontend)
            const { data: teamMembersData, error: teamMembersError } = await supabase.from('team_members').select('id, name, role, image_url, shop_id').eq('shop_id', shopId).order('name');
            if (teamMembersError) {
                setError(`Falha ao carregar a equipe: ${teamMembersError.message || 'Erro desconhecido'}.`);
                setLoading(false);
                return;
            }
            setAllTeamMembers(teamMembersData as TeamMember[]);
            
            // 3. Fetch Services (agora com filtro direto no frontend)
            const { data: servicesData, error: servicesError } = await supabase.from('services').select('*').eq('shop_id', shopId).order('name');
            if (servicesError) {
                setError(`Erro ao carregar serviços: ${servicesError.message}.`);
                setLoading(false);
                return;
            }
            setServices(servicesData as Service[]);
            
            await checkSessionAndSetStep();
            setLoading(false);
        };
        
        fetchShopDetailsAndData();
        
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                checkSessionAndSetStep();
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [shopId]);

    const handleAuthSuccess = (session: any) => {
        setClientSession(session);
        const name = session.user.user_metadata?.name;
        const phone = session.user.user_metadata?.phone;
        if (!name || !phone) setStep('profileSetup');
        else setStep('selectBarber');
    };
    
    const handleProfileSetupSuccess = () => {
        supabase.auth.refreshSession(); 
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
        
        switch (step) {
            case 'auth':
                return <PublicAuth onAuthSuccess={handleAuthSuccess} theme={theme} />;
            case 'profileSetup':
                if (!clientSession) return null;
                return <PublicProfileSetup session={clientSession} onSuccess={handleProfileSetupSuccess} theme={theme} />;
            case 'selectBarber':
                return <BookingBarberSelector teamMembers={allTeamMembers} onSelectBarber={handleSelectBarber} theme={theme} />;
            case 'services':
                if (!selectedBarber) return null; 
                return <BookingServiceSelector services={services} onNext={handleServiceSelect} theme={theme} />;
            case 'calendar':
                if (!selectedBarber || selectedServices.length === 0) return null;
                return <BookingCalendar selectedBarber={selectedBarber} selectedServices={selectedServices} totalDuration={totalDuration} onTimeSelect={handleTimeSelect} onBack={() => setStep('services')} theme={theme} />;
            case 'confirm':
                if (!selectedBarber || !clientSession || selectedServices.length === 0 || !selectedDate || !selectedTime) return null;
                return <BookingConfirmation selectedBarber={selectedBarber} clientSession={clientSession} selectedServices={selectedServices} totalDuration={totalDuration} totalPrice={totalPrice} selectedDate={selectedDate!} selectedTime={selectedTime!} onSuccess={handleBookingSuccess} onBack={() => setStep('calendar')} theme={theme} />;
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
    
    const shopEmoji = shopDetails?.type === 'barbearia' ? '💈' : '✂️';
    const profileImageUrl = selectedBarber?.image_url || clientSession?.user.user_metadata?.image_url || `https://ui-avatars.com/api/?name=${shopDetails?.name || 'FlowPro'}&background=${theme.themeColor}&color=101012`;
    const profileName = selectedBarber ? `Agende com ${selectedBarber.name}` : `Agende em ${shopDetails?.name}`;
    const profileSubtitle = selectedBarber ? `${selectedBarber.role} em ${shopDetails?.name}` : 'Seja bem-vindo(a)! Encontre o horário perfeito e faça seu agendamento.';

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