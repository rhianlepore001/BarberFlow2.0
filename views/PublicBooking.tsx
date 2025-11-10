import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Service, TeamMember } from '../types';
import { useTheme } from '../hooks/useTheme';
import Modal from '../components/Modal';
import AvailableSlotsSelector from '../components/AvailableSlotsSelector'; // Importa o novo componente

// Define a URL da Edge Function (usando o ID do projeto Supabase)
const BOOKING_FUNCTION_URL = 'https://avodqajneytxiarbjrcp.supabase.co/functions/v1/book-appointment';

interface BookingStepProps {
    barber: TeamMember;
    allServices: Service[];
    shopName: string; // Novo: Nome da loja
    onBookingSuccess: () => void;
}

// --- Componente de Seleção de Serviços e Horário ---
const BookingForm: React.FC<BookingStepProps> = ({ barber, allServices, shopName, onBookingSuccess }) => {
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    
    // Estado para data e hora selecionadas (usadas pelo AvailableSlotsSelector)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(''); // Começa vazio, forçando a seleção
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Tema estático (Azul Royal)
    const theme = useTheme(null); 

    const handleServiceToggle = (serviceId: number) => {
        setSelectedServiceIds(prev => 
            prev.includes(serviceId) 
                ? prev.filter(id => id !== serviceId) 
                : [...prev, serviceId]
        );
    };

    const selectedServices = useMemo(() => {
        return allServices.filter(s => selectedServiceIds.includes(s.id));
    }, [selectedServiceIds, allServices]);

    const totalDuration = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
    }, [selectedServices]);
    
    const totalPrice = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + s.price, 0);
    }, [selectedServices]);
    
    const handleSlotSelection = (newDate: string, newTime: string) => {
        setDate(newDate);
        setTime(newTime);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        if (selectedServices.length === 0) {
            setError("Selecione pelo menos um serviço.");
            setIsSaving(false);
            return;
        }
        
        if (!time) {
            setError("Selecione um horário disponível.");
            setIsSaving(false);
            return;
        }
        
        const startTimeISO = new Date(`${date}T${time}:00`).toISOString();
        
        const servicesToSave = selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price,
            duration_minutes: s.duration_minutes
        }));

        const bookingData = {
            barberId: barber.id,
            clientName,
            clientPhone,
            clientEmail,
            startTime: startTimeISO,
            durationMinutes: totalDuration,
            services: servicesToSave,
        };

        try {
            const response = await fetch(BOOKING_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData),
            });

            const result = await response.json();

            if (!response.ok) {
                // Se houver conflito de horário (código 409 da Edge Function)
                if (response.status === 409) {
                    setError(result.error || 'Conflito de horário. Por favor, selecione outro slot.');
                } else {
                    setError(result.error || 'Falha ao registrar o agendamento.');
                }
            } else {
                onBookingSuccess();
            }
        } catch (err) {
            console.error('Network error:', err);
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
                <img src={barber.image_url} alt={barber.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-2 border-card-dark" />
                <h2 className="text-3xl font-extrabold text-white">Agendar com {barber.name.split(' ')[0]}</h2>
                <p className="text-sm text-text-secondary-dark mt-1">{barber.role} | {shopName}</p>
                <p className="text-base font-medium text-white mt-4">
                    Bem-vindo(a)! Preencha seus dados e escolha o melhor horário para o seu serviço.
                </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* 3. Dados do Cliente (Movido para o topo para registro) */}
                <div className="space-y-3 pt-4 bg-card-dark p-4 rounded-xl shadow-lg">
                    <h4 className="text-lg font-bold text-white">Seus Dados</h4>
                    <input 
                        type="text" 
                        placeholder="Seu Nome Completo" 
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white placeholder-text-secondary-dark focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                    <input 
                        type="tel" 
                        placeholder="Seu Telefone (WhatsApp)" 
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        required
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white placeholder-text-secondary-dark focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                    <input 
                        type="email" 
                        placeholder="Seu Email (Opcional)" 
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white placeholder-text-secondary-dark focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>
                
                {/* 1. Seleção de Serviços */}
                <div className="bg-card-dark rounded-xl p-4 shadow-lg">
                    <p className="text-lg font-bold text-white mb-3">Serviços ({totalDuration} min | R$ {totalPrice.toFixed(2).replace('.', ',')})</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {allServices.map(s => (
                            <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                                <label htmlFor={`service-${s.id}`} className="flex items-center gap-3 text-white text-base cursor-pointer flex-1">
                                    <input 
                                        type="checkbox" 
                                        id={`service-${s.id}`} 
                                        checked={selectedServiceIds.includes(s.id)}
                                        onChange={() => handleServiceToggle(s.id)}
                                        className={`form-checkbox h-5 w-5 ${theme.primary} bg-background-dark border-gray-600 rounded ${theme.ringPrimary}`}
                                    />
                                    {s.name}
                                </label>
                                <span className="text-sm font-semibold text-text-secondary-dark">R$ {s.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* 2. Seleção de Horário */}
                {totalDuration > 0 ? (
                    <AvailableSlotsSelector 
                        barberId={barber.id}
                        requiredDuration={totalDuration}
                        onSelectSlot={handleSlotSelection}
                        selectedDate={date}
                        selectedTime={time}
                    />
                ) : (
                    <div className="text-center text-text-secondary-dark p-4 bg-card-dark rounded-xl">Selecione um serviço para ver os horários.</div>
                )}

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <button 
                    type="submit" 
                    disabled={isSaving || selectedServices.length === 0 || !time || !clientName || !clientPhone}
                    className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark hover:${theme.bgPrimary}/80 transition-colors disabled:opacity-50`}
                >
                    {isSaving ? 'Solicitando Agendamento...' : `Agendar (R$ ${totalPrice.toFixed(2).replace('.', ',')})`}
                </button>
            </form>
        </motion.div>
    );
};

// --- Componente Principal ---
const PublicBooking: React.FC = () => {
    const [barber, setBarber] = useState<TeamMember | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [shopName, setShopName] = useState('Barbearia FlowPro'); // Novo estado
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    
    const urlParams = new URLSearchParams(window.location.search);
    const barberIdParam = urlParams.get('barberId');
    
    useEffect(() => {
        if (!barberIdParam) {
            setFetchError("ID do barbeiro não fornecido na URL.");
            setLoading(false);
            return;
        }
        
        const id = parseInt(barberIdParam);
        if (isNaN(id)) {
            setFetchError("ID do barbeiro inválido.");
            setLoading(false);
            return;
        }
        
        const fetchData = async () => {
            setLoading(true);
            setFetchError(null);
            
            // 1. Buscar dados do Barbeiro e Shop ID
            const { data: memberData, error: memberError } = await supabase
                .from('team_members')
                .select('*, shop_id')
                .eq('id', id)
                .single();
                
            if (memberError || !memberData || !memberData.shop_id) {
                console.error("Error fetching member:", memberError);
                setFetchError("Barbeiro não encontrado ou link inválido.");
                setLoading(false);
                return;
            }
            
            setBarber(memberData as TeamMember);
            const shopId = memberData.shop_id;
            
            // 2. Buscar Nome da Loja
            if (shopId) {
                const { data: shopData, error: shopError } = await supabase
                    .from('shops')
                    .select('name')
                    .eq('id', shopId)
                    .limit(1)
                    .single();
                
                if (shopError && shopError.code !== 'PGRST116') {
                    console.warn("Could not fetch shop name anonymously:", shopError);
                }
                
                if (shopData) {
                    setShopName(shopData.name);
                }
            }
            
            // 3. Buscar Serviços do Shop
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('shop_id', shopId)
                .order('name');
                
            if (servicesError) {
                console.error(servicesError);
                setFetchError("Falha ao carregar serviços.");
            } else {
                setServices(servicesData as Service[]);
            }
            
            setLoading(false);
        };
        
        fetchData();
    }, [barberIdParam]);
    
    const theme = useTheme(null); // Tema estático para a página pública

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-white">Carregando formulário...</div>;
    }
    
    if (fetchError) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-red-400 text-center p-4">{fetchError}</div>;
    }
    
    if (!barber || services.length === 0) {
        return <div className="flex justify-center items-center h-screen bg-background-dark text-text-secondary-dark text-center p-4">Nenhum serviço disponível para agendamento.</div>;
    }

    return (
        <div className="min-h-screen bg-background-dark p-4 flex justify-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md pt-8 pb-16"
            >
                <BookingForm 
                    barber={barber} 
                    allServices={services} 
                    shopName={shopName} // Passa o nome da loja
                    onBookingSuccess={() => setIsSuccessModalOpen(true)}
                />
            </motion.div>
            
            <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)}>
                <div className="text-center p-4 space-y-4">
                    <span className={`material-symbols-outlined text-6xl ${theme.primary}`}>check_circle</span>
                    <h3 className="text-xl font-bold text-white">Agendamento Solicitado!</h3>
                    <p className="text-text-secondary-dark">Sua solicitação foi enviada para a barbearia. Você receberá uma confirmação em breve.</p>
                    <button 
                        onClick={() => setIsSuccessModalOpen(false)}
                        className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark mt-4`}
                    >
                        Fechar
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default PublicBooking;