import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import App from './App';
import AuthScreen from './views/AuthScreen';
import PublicBooking from './views/PublicBooking'; // Importa a nova view

const AuthGate: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [publicBarberId, setPublicBarberId] = useState<number | null>(null);

    useEffect(() => {
        // Verifica a URL para a rota pública
        const path = window.location.pathname;
        const match = path.match(/^\/book\/(\d+)$/);
        const isPublicRoute = !!match;
        
        if (isPublicRoute) {
            setPublicBarberId(parseInt(match[1]));
        } else {
            setPublicBarberId(null);
        }
        
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            // Se estiver em uma rota pública, não faz nada além de atualizar a sessão.
            // Se não estiver em uma rota pública, o App.tsx ou AuthScreen reagirão à sessão.
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []); // Dependência vazia para rodar apenas uma vez na montagem

    if (loading) {
        return (
             <div className="flex justify-center items-center h-screen bg-background-dark text-white">
                <p>Carregando...</p>
            </div>
        );
    }
    
    // Se for uma rota pública, renderiza o PublicBooking
    if (publicBarberId !== null) {
        return <PublicBooking barberId={publicBarberId} />;
    }

    // Se não for rota pública, segue o fluxo normal de autenticação do dashboard
    return session ? <App session={session} /> : <AuthScreen />;
};

export default AuthGate;