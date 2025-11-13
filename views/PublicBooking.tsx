import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember, Service, Appointment } from '../types';
import { useTheme } from '../hooks/useTheme';
import PublicAuth from '../components/PublicAuth';
import BookingCalendar from '../components/BookingCalendar';
import BookingServiceSelector from '../components/BookingServiceSelector';
import BookingConfirmation from '../components/BookingConfirmation';
import BookingBarberSelector from '../components/BookingBarberSelector';
import PublicProfileSetup from '../components/PublicProfileSetup'; // Importa o novo componente

// Define os passos do fluxo de agendamento
type BookingStep = 'auth' | 'profileSetup' | 'selectBarber' | 'services' | 'calendar' | 'confirm'; // Adicionado 'profileSetup'

interface PublicBookingProps {
    shopId: number; // Alterado de barberId para shopId
}

const PublicBooking: React.FC<PublicBookingProps> = ({ shopId }) => {
    const [step, setStep] = useState<BookingStep>('auth');
    const [shopDetails, setShopDetails] = useState<{ name: string, type: 'barbearia' | 'salao' } | null>(null);
    const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]); // Todos os membros da equipe
    const [selectedBarber, setSelectedBarber] = useState<TeamMember | null>(null); // Barbeiro selecionado pelo cliente
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
            
            // Verifica se o perfil está completo (nome e telefone)
            const name = session.user.user_metadata?.name;
            const phone = session.user.user_metadata?.phone;
            
            if (!name || !phone) {
                // Se faltar nome ou telefone, vai para a configuração de perfil
                setStep('profileSetup');
            } else {
                // Se estiver completo, pula para a seleção de barbeiro
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
            setError(null); // Limpa erros anteriores

            if (isNaN(shopId) || shopId <= 0) {
                setError("ID da loja inválido na URL.");
                setLoading(false);
                return;
            }
            
            // 1. Buscar detalhes da loja
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .select('name, type')
                .eq('id', shopId)
                .limit(1)
                .single();
                
            if (shopError) {
                console.error("[PublicBooking] Erro ao buscar detalhes da loja:", shopError);
                setError(`Falha ao carregar a loja: ${shopError.message || 'Erro desconhecido'}.`);
                setLoading(false);
                return;
            }
            
            if (!shopData) {
                setError("Loja não encontrada. Verifique se o ID do link está correto ou se a loja foi removida.");
                setLoading(false);
                return;
            }
            
            setShopDetails(shopData);
            
            // 2. Fetch todos os membros da equipe para esta loja
            const { data: teamMembersData, error: teamMembersError } = await supabase
                .from('team_members')
                .select('id, name, role, image_url, shop_id')
                .eq('shop_id', shopId)
                .order('name');

            if (teamMembersError) {
                console.error("[PublicBooking] Erro ao buscar membros da equipe:", teamMembersError);
                setError(`Falha ao carregar a equipe: ${teamMembersError.message || 'Erro desconhecido'}.`);
                setLoading(false);
                return;
            }
            setAllTeamMembers(teamMembersData as TeamMember[]);
            
            // 3. Fetch Services para a loja
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('shop_id', shopId)
                .order('name');
                
            if (servicesError) {
                console.error("[PublicBooking] Erro ao carregar serviços:", servicesError);
                setError(`Erro ao carregar serviços: ${servicesError.message}.`);
                setLoading(false);
                return;
            }
            
            setServices(servicesData as Service[]);
            
            // 4. Check client session
            await checkSessionAndSetStep();
            
            setLoading(false);
        };
        
        fetchShopDetailsAndData();
        
        // 5. Listener para mudanças de autenticação (para reagir a logins/logouts)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                // Quando o estado muda, reavalia a sessão e o passo
                checkSessionAndSetStep();
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [shopId]); // Depende de shopId

    const handleAuthSuccess = (session: any) => {
        setClientSession(session);
        // Após o login, verifica se o perfil está completo
        const name = session.user.user_metadata?.name;
        const phone = session.user.user_metadata?.phone;
        
        if (!name || !phone) {
            setStep('profileSetup');
        } else {
            setStep('selectBarber');
        }
    };
    
    const handleProfileSetupSuccess = () => {
        // Força a atualização da sessão para garantir que os metadados estejam atualizados
        supabase.auth.refreshSession(); 
        setStep('selectBarber');
    };
    
    const handleSelectBarber = (barber: TeamMember) => {
        setSelectedBarber(barber);
        // Se já houver serviços selecionados, pula para o calendário
        if (selectedServices.length > 0) {
            setStep('calendar');
        } else {
            setStep('services');
        }
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
        setStep('selectBarber'); // Volta para a seleção de barbeiro para um novo agendamento
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedBarber(null); // Limpa o barbeiro selecionado
    };
    
    const renderStep = () => {
        if (!shopDetails) return null; // Garante que os detalhes da loja foram carregados
        
        switch (step) {
            case 'auth':
                return <PublicAuth onAuthSuccess={handleAuthSuccess} theme={theme} />;
            case 'profileSetup':
                if (!clientSession) return null;
                return <PublicProfileSetup session={clientSession} onSuccess={handleProfileSetupSuccess} theme={theme} />;
            case 'selectBarber':
                return <BookingBarberSelector 
                            teamMembers={allTeamMembers} 
                            onSelectBarber={handleSelectBarber} 
                            theme={theme} 
                        />;
            case 'services':
                // Se o barbeiro não estiver selecionado, volta para a seleção de barbeiro
                if (!selectedBarber) {
                    setStep('selectBarber');
                    return null;
                }
                return <BookingServiceSelector 
                            services={services} 
                            onNext={handleServiceSelect} 
                            theme={theme}
                        />;
            case 'calendar':
                // Só mostra o calendário se um barbeiro e serviços foram selecionados
                if (!selectedBarber || selectedServices.length === 0) {
                    // Se faltar algo, volta para a seleção de serviços
                    setStep('services');
                    return null;
                }
                return <BookingCalendar 
                            selectedBarber={selectedBarber} // Passa o barbeiro selecionado
                            selectedServices={selectedServices}
                            totalDuration={totalDuration}
                            onTimeSelect={handleTimeSelect}
                            onBack={() => setStep('services')}
                            theme={theme}
                        />;
            case 'confirm':
                // Só mostra a confirmação se todos os dados foram selecionados
                if (!selectedBarber || !clientSession || selectedServices.length === 0 || !selectedDate || !selectedTime) {
                    setStep('calendar');
                    return null;
                }
                return <BookingConfirmation 
                            selectedBarber={selectedBarber} // Passa o barbeiro selecionado
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
        return <div className="flex justify-center items-center h-screen text-red-400 text-center p-4">{error}</div>;
    }
    
    // Determina o emoji com base no shopType (agora disponível no objeto shopDetails)
    const shopEmoji = shopDetails?.type === 'barbearia' ? '💈' : '✂️';

    // Determina a imagem de perfil a ser exibida no topo
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
                    
                    <h1 className="text-2xl font-extrabold text-white">
                        {profileName}
                    </h1>
                    <p className="text-sm text-text-secondary-dark">
                        {profileSubtitle}
                    </p>
                    
                    {/* Nome da Barbearia e Frase de Impacto */}
                    {!selectedBarber && ( // Só mostra se nenhum barbeiro foi selecionado ainda
                        <h2 className={`text-xl font-bold mt-4 ${theme.primary}`}>{shopDetails?.name} {shopEmoji}</h2>
                    )}
                </div>
                
                {renderStep()}
            </motion.div>
        </div>
    );
};

export default PublicBooking;