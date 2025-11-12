import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, Appointment } from '../types';
import { useTheme } from '../hooks/useTheme';
import PublicAuth from '../components/PublicAuth';
import BookingCalendar from '../components/BookingCalendar';
import BookingServiceSelector from '../components/BookingServiceSelector';
import BookingConfirmation from '../components/BookingConfirmation';

// Define os passos do fluxo de agendamento
type BookingStep = 'auth' | 'services' | 'calendar' | 'confirm';

interface PublicBookingProps {
    barberId: number;
}

const PublicBooking: React.FC<PublicBookingProps> = ({ barberId }) => {
    const [step, setStep] = useState<BookingStep>('auth');
    const [barber, setBarber] = useState<TeamMember | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientSession, setClientSession] = useState<any>(null); // Supabase Session
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Usamos um tema padrão para a tela pública, pois o shopType ainda não está carregado
    const theme = useTheme(null); 

    const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0), [selectedServices]);
    const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);

    // Função para verificar a sessão e definir o passo inicial
    const checkSessionAndSetStep = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setClientSession(session);
            // Se já estiver logado, pula para a seleção de serviços
            setStep('services');
        } else {
            setClientSession(null);
            setStep('auth');
        }
    };

    useEffect(() => {
        const fetchBarberAndServices = async () => {
            setLoading(true);
            
            // 1. Fetch Barber details (including shop_id and shop name)
            // Ajuste: Selecionar apenas campos públicos para segurança RLS
            const { data: barberData, error: barberError } = await supabase
                .from('team_members')
                .select('id, name, role, image_url, shop_id, shops(name, type)') // Seleção explícita
                .eq('id', barberId)
                .limit(1)
                .single();

            if (barberError || !barberData) {
                console.error("Barber fetch error:", barberError);
                setError("Barbeiro não encontrado ou link inválido.");
                setLoading(false);
                return;
            }
            
            // Mapeia o nome e tipo da loja para o objeto barber
            const shopName = (barberData.shops as { name: string } | null)?.name || 'Barbearia';
            const shopType = (barberData.shops as { type: 'barbearia' | 'salao' } | null)?.type || 'barbearia';
            
            const fullBarberData: TeamMember = {
                ...(barberData as TeamMember),
                shopName: shopName, 
                shopType: shopType, // Adiciona shopType ao objeto barber
                // Garantir que commissionRate exista, mesmo que não seja lido aqui (RLS anon não permite ler)
                commissionRate: 0.5, 
            };
            
            setBarber(fullBarberData);
            
            // 2. Fetch Services for the shop
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('shop_id', barberData.shop_id)
                .order('name');
                
            if (servicesError) {
                setError("Erro ao carregar serviços.");
                setLoading(false);
                return;
            }
            
            setServices(servicesData as Service[]);
            
            // 3. Check client session
            await checkSessionAndSetStep();
            
            setLoading(false);
        };
        
        fetchBarberAndServices();
        
        // 4. Listener para mudanças de autenticação (para reagir a logins/logouts)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                // Quando o estado muda, reavalia a sessão e o passo
                checkSessionAndSetStep();
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [barberId]);
    
    const handleAuthSuccess = (session: any) => {
        setClientSession(session);
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
        // Redirecionar ou mostrar mensagem de sucesso
        alert("Agendamento realizado com sucesso!");
        setStep('services'); // Volta para o início do fluxo de agendamento
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedTime(null);
    };
    
    const renderStep = () => {
        if (!barber) return null;
        
        switch (step) {
            case 'auth':
                return <PublicAuth onAuthSuccess={handleAuthSuccess} theme={theme} />;
            case 'services':
                return <BookingServiceSelector 
                            services={services} 
                            onNext={handleServiceSelect} 
                            theme={theme}
                        />;
            case 'calendar':
                return <BookingCalendar 
                            barber={barber}
                            selectedServices={selectedServices}
                            totalDuration={totalDuration}
                            onTimeSelect={handleTimeSelect}
                            onBack={() => setStep('services')}
                            theme={theme}
                        />;
            case 'confirm':
                return <BookingConfirmation 
                            barber={barber}
                            clientSession={clientSession}
                            selectedServices={selectedServices}
                            totalDuration={totalDuration}
                            totalPrice={totalPrice}
                            selectedDate={selectedDate!}
                            selectedTime={selectedTime!}
                            onSuccess={handleBookingSuccess}
                            onBack={() => setStep('calendar')}
                            theme={theme}
                        />;
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-white">Carregando...</div>;
    }
    
    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-400">{error}</div>;
    }
    
    // Determina o emoji com base no shopType (agora disponível no objeto barber)
    const shopEmoji = barber?.shopType === 'barbearia' ? '💈' : '✂️';

    return (
        <div className="min-h-screen bg-background-dark p-4 flex flex-col items-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-card-dark rounded-xl shadow-2xl p-6 space-y-6"
            >
                <div className="text-center">
                    <img src={barber?.image_url} alt={barber?.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-2 border-white/10" />
                    <h1 className="text-2xl font-extrabold text-white">Agende com {barber?.name}</h1>
                    <p className="text-sm text-text-secondary-dark">{barber?.role} em {barber?.shopName || 'Barbearia'}</p>
                    
                    {/* NOVO: Nome da Barbearia e Frase de Impacto */}
                    <h2 className={`text-xl font-bold mt-4 ${theme.primary}`}>{barber?.shopName} {shopEmoji}</h2>
                    <p className="text-sm text-text-secondary-dark">Seja bem-vindo(a)! Encontre o horário perfeito e faça seu agendamento.</p>
                </div>
                
                {renderStep()}
            </motion.div>
        </div>
    );
};

export default PublicBooking;