import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import App from './App';
import AuthScreen from './views/AuthScreen';

// Função para verificar se a view solicitada é a pública
const isPublicView = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'public-booking';
};

const AuthGate: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
             <div className="flex justify-center items-center h-screen bg-background-dark text-white">
                <p>Carregando...</p>
            </div>
        );
    }
    
    // Se houver sessão, sempre carrega o App (dashboard)
    if (session) {
        return <App session={session} />;
    }

    // Se não houver sessão, verifica se é a view pública
    if (isPublicView()) {
        // Renderiza o App, que internamente irá renderizar a view PublicBooking
        // Passamos uma sessão nula, mas o App.tsx já está preparado para lidar com isso na view 'public-booking'
        return <App session={null as any} />; 
    }

    // Caso contrário, mostra a tela de autenticação
    return <AuthScreen />;
};

export default AuthGate;