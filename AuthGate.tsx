import React, { useState, useEffect } from 'react';
import App from './App';
import AuthScreen from './views/AuthScreen';
import PublicBooking from './views/PublicBooking';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

const AuthGate: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [publicShopId, setPublicShopId] = useState<string | null>(null);
    const [authScreenThemeClass, setAuthScreenThemeClass] = useState<string | null>(null);

    useEffect(() => {
        // Verifica a URL para a rota pública
        const path = window.location.pathname;
        const match = path.match(/^\/public-booking\/([0-9a-fA-F-]+)$/);
        
        if (match) {
            setPublicShopId(match[1]);
            setLoading(false);
        } else {
            setPublicShopId(null);
            // Se não for rota pública, verifica a sessão do admin
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setLoading(false);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
            });

            return () => subscription.unsubscribe();
        }
    }, []);

    // Effect to apply theme class to body for AuthScreen
    useEffect(() => {
        if (!session && !publicShopId && authScreenThemeClass) {
            document.body.className = authScreenThemeClass;
        } else if (session) {
            // When authenticated, App.tsx will handle the theme
            document.body.className = ''; 
        }
    }, [session, publicShopId, authScreenThemeClass]);


    if (loading) {
        return (
             <div className="flex justify-center items-center h-screen bg-background text-white">
                <p>Carregando...</p>
            </div>
        );
    }
    
    if (publicShopId) {
        return <PublicBooking shopId={publicShopId} />;
    }

    return session ? <App session={session} /> : <AuthScreen onThemeChange={setAuthScreenThemeClass} />;
};

export default AuthGate;