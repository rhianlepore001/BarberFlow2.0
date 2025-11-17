import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import App from './App';
import AuthScreen from './views/AuthScreen';
import PublicBooking from './views/PublicBooking'; // Importa a nova view

const AuthGate: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [publicShopId, setPublicShopId] = useState<number | null>(null); // Alterado de publicBarberId para publicShopId

    useEffect(() => {
        console.log("AuthGate useEffect triggered.");
        // Verifica a URL para a rota pública
        const path = window.location.pathname;
        // Nova regex para /public-booking/:shopId
        const match = path.match(/^\/public-booking\/(\d+)$/);
        const isPublicRoute = !!match;
        
        if (isPublicRoute) {
            setPublicShopId(parseInt(match[1]));
            console.log("AuthGate: Public route detected, shopId:", match[1]);
        } else {
            setPublicShopId(null);
            console.log("AuthGate: Not a public route.");
        }
        
        const getSession = async () => {
            console.log("AuthGate: Attempting to get session...");
            const { data: { session } } = await supabase.auth.getSession();
            console.log("AuthGate: Session retrieved:", session);
            setSession(session);
            setLoading(false);
        };

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("AuthGate: Auth state changed. Event:", event, "Session:", session);
            setSession(session);
            // Se estiver em uma rota pública, não faz nada além de atualizar a sessão.
            // Se não estiver em uma rota pública, o App.tsx ou AuthScreen reagirão à sessão.
        });

        return () => {
            console.log("AuthGate: Unsubscribing from auth listener.");
            authListener?.subscription.unsubscribe();
        };
    }, []); // Dependência vazia para rodar apenas uma vez na montagem

    console.log("AuthGate render: loading =", loading, "session =", session ? "present" : "null", "publicShopId =", publicShopId);

    if (loading) {
        return (
             <div className="flex justify-center items-center h-screen bg-background-dark text-white">
                <p>Carregando...</p>
            </div>
        );
    }
    
    // Se for uma rota pública, renderiza o PublicBooking
    if (publicShopId !== null) {
        return <PublicBooking shopId={publicShopId} />; // Passa shopId para PublicBooking
    }

    // Se não for rota pública, segue o fluxo normal de autenticação do dashboard
    return session ? <App session={session} /> : <AuthScreen />;
};

export default AuthGate;