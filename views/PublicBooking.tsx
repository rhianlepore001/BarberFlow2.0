import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Service, TeamMember } from '../types';
import { useTheme } from '../hooks/useTheme';
import Modal from '../components/Modal';
import { getPublicBookingUrl } from '../utils/booking';

// Define a URL da Edge Function (usando o ID do projeto Supabase)
const BOOKING_FUNCTION_URL = 'https://avodqajneytxiarbjrcp.supabase.co/functions/v1/book-appointment';

interface PublicBookingProps {
    barberId: number;
}

interface BookingStepProps {
    barber: TeamMember;
    allServices: Service[];
    onBookingSuccess: () => void;
}

// --- Componente de Seleção de Serviços e Horário ---
const BookingForm: React.FC<BookingStepProps> = ({ barber, allServices, onBookingSuccess }) => {
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('10:00');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        if (selectedServices.length === 0) {
            setError("Selecione pelo menos um serviço.");
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
                    // Não precisa de Authorization header, pois a RLS permite anon insert
                },
                body: JSON.stringify(bookingData),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Erro desconhecido ao agendar.');
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
            <h2 className="text-2xl font-bold text-center text-white">Agendar com {barber.name.split(' ')[0]}</h2>
            <p className="text-sm text-text-secondary-dark text-center">Selecione os serviços e o horário desejado.</p>

            <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Serviços */}
                <div className="bg-card-dark border-2 border-gray-700 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <p className="text-sm font-medium text-text-secondary-dark mb-3">Serviços ({totalDuration} min | {totalPrice.toFixed(2).replace('.', ',')})</p>
                    {allServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                            <label htmlFor={`service-${s.id}`} className="flex items-center gap-2 text-white text-sm cursor-pointer flex-1">
                                <input 
                                    type="checkbox" 
                                    id={`service-${s.id}`} 
                                    checked={selectedServiceIds.includes(s.id)}
                                    onChange={() => handleServiceToggle(s.id)}
                                    className={`form-checkbox h-4 w-4 ${theme.primary} bg-background-dark border-gray-600 rounded ${theme.ringPrimary}`}
                                />
                                {s.name}
                            </label>
                            <span className="text-xs text-text-secondary-dark">R$ {s.price.toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {/* Data e Hora */}
                <div className="flex gap-3">
                    <input 
                        type="date" 
                        name="date" 
                        required 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`w-full bg-card-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                    <input 
                        type="time" 
                        name="time" 
                        required 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={`w-full bg-card-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>
                
                {/* Dados do Cliente */}
                <input 
                    type="text" 
                    placeholder="Seu Nome Completo" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    className={`w-full bg-card-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                />
                <input 
                    type="tel" 
                    placeholder="Seu Telefone (WhatsApp)" 
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className={`w-full bg-card-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                />
                <input 
                    type="email" 
                    placeholder="Seu Email (Opcional)" 
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className={`w-full bg-card-dark border-2 border-gray-700 rounded-lg py-3 px-3 text-white focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                />

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <button 
                    type="submit" 
                    disabled={isSaving || selectedServices.length === 0}
                    className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark hover:${theme.bgPrimary}/80 transition-colors disabled:opacity-50`}
                >
                    {isSaving ? 'Solicitando Agendamento...' : `Agendar (${totalPrice.toFixed(2).replace('.', ',')})`}
                </button>
            </form>
        </motion.div>
    );
};

// --- Componente Principal ---
const PublicBooking: React.FC = () => {
    const [barber, setBarber] = useState<TeamMember | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    
    // Extrai o barberId da URL (simulando a leitura de query params)
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
                
            if (memberError || !memberData) {
                console.error("Error fetching member:", memberError);
                setFetchError("Barbeiro não encontrado ou link inválido.");
                setLoading(false);
                return;
            }
            
            setBarber(memberData as TeamMember);
            const shopId = memberData.shop_id;
            
            // 2. Buscar Serviços do Shop
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