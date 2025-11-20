import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import App from './App';
import AuthScreen from './views/AuthScreen';
import PublicBooking from './views/PublicBooking'; // Importa a nova view

const AuthGate: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [publicShopId, setPublicShopId] = useState<string | null>(null);

    useEffect(() => {
        // Verifica a URL para a rota pública
        const path = window.location.pathname;
        // Regex para /public-booking/:shopId (UUID)
        const match = path.match(/^\/public-booking\/([0-9a-fA-F-]+)$/);
        const isPublicRoute = !!match;
        
        if (isPublicRoute) {
            setPublicShopId(match[1]);
        } else {
            setPublicShopId(null);
        }
        
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
    
    if (publicShopId !== null) {
        return <PublicBooking shopId={publicShopId} />;
    }

    return session ? <App session={session} /> : <AuthScreen />;
};

export default AuthGate;