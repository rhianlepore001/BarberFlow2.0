import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useShopLabels } from '../hooks/useShopLabels';

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
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-48 w-full">
        <p className="text-text-secondary-dark">Carregando...</p>
    </div>
);

const PublicBooking: React.FC<PublicBookingProps> = ({ shopId }) => {
    const [step, setStep] = useState<BookingStep>('auth');
    const [shopDetails, setShopDetails] = useState<{ name: string, business_type: 'barbearia' | 'salao', country: 'BR' | 'PT', currency: 'BRL' | 'EUR' } | null>(null);
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
            id: clientSession?.user.id || '',
            name: clientSession?.user.user_metadata?.name || shopDetails.name,
            image_url: clientSession?.user.user_metadata?.image_url || '',
            tenant_id: shopId,
            tenant_name: shopDetails.name,
            business_type: shopDetails.business_type,
            country: shopDetails.country,
            currency: shopDetails.currency,
        };
    }, [shopDetails, shopId, clientSession]);

    const theme = useTheme(themeUser); 
    const shopLabels = useShopLabels(shopDetails?.business_type);

    const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0), [selectedServices]);
    const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);

    useEffect(() => {
        const fetchShopDetailsAndData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const { data: tenantData, error: tenantError } = await supabase
                    .from('tenants')
                    .select('name, business_type, country, currency')
                    .eq('id', shopId)
                    .single();

                if (tenantError) throw new Error("Não foi possível encontrar o estabelecimento.");
                setShopDetails(tenantData);

                const { data: teamData, error: teamError } = await supabase
                    .from('team_members')
                    .select('*')
                    .eq('tenant_id', shopId);
                if (teamError) throw new Error("Erro ao carregar a equipe.");
                setAllTeamMembers(teamData);

                const { data: servicesData, error: servicesError } = await supabase
                    .from('services')
                    .select('*')
                    .eq('tenant_id', shopId)
                    .eq('active', true);
                if (servicesError) throw new Error("Erro ao carregar os serviços.");
                setServices(servicesData);

            } catch (err: any) {
                setError(err.message || 'Erro inesperado ao carregar dados da loja');
            } finally {
                setLoading(false);
            }
        };
        
        fetchShopDetailsAndData();

        supabase.auth.getSession().then(({ data: { session } }) => {
            setClientSession(session);
            if (session) {
                const { name, phone } = session.user.user_metadata;
                setStep(name && phone ? 'selectBarber' : 'profileSetup');
            } else {
                setStep('auth');
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setClientSession(session);
            if (session) {
                const { name, phone } = session.user.user_metadata;
                setStep(name && phone ? 'selectBarber' : 'profileSetup');
            } else {
                setStep('auth');
            }
        });

        return () => subscription.unsubscribe();
    }, [shopId]);

    const handleAuthSuccess = (session: any) => {
        setClientSession(session);
        const { name, phone } = session.user.user_metadata;
        setStep(name && phone ? 'selectBarber' : 'profileSetup');
    };
    
    const handleProfileSetupSuccess = (updatedUserMetadata: any) => {
        if (clientSession) {
            const newSession = { ...clientSession, user: { ...clientSession.user, user_metadata: { ...clientSession.user.user_metadata, ...updatedUserMetadata } } };
            setClientSession(newSession);
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
        if (!shopDetails || !themeUser) return null;

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
                return <BookingServiceSelector services={services} onNext={handleServiceSelect} theme={theme} user={themeUser} />;
            case 'calendar':
                if (!selectedBarber || selectedServices.length === 0) return null;
                return <BookingCalendar tenantId={shopId} selectedBarber={selectedBarber} selectedServices={selectedServices} totalDuration={totalDuration} onTimeSelect={handleTimeSelect} onBack={() => setStep('services')} theme={theme} user={themeUser} />;
            case 'confirm':
                if (!selectedBarber || !clientSession || selectedServices.length === 0 || !selectedDate || !selectedTime) return null;
                return <BookingConfirmation selectedBarber={selectedBarber} clientSession={clientSession} selectedServices={selectedServices} totalDuration={totalDuration} totalPrice={totalPrice} selectedDate={selectedDate!} selectedTime={selectedTime!} onSuccess={handleBookingSuccess} onBack={() => setStep('calendar')} theme={theme} user={themeUser} />;
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