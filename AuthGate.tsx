import React, { useState, useEffect } from 'react';
import App from './App';
import AuthScreen from './views/AuthScreen';
import PublicBooking from './views/PublicBooking'; // Importa a nova view

// Tipo de sessão mockada para compatibilidade
interface MockSession {
    user: {
        id: string;
        email: string;
        user_metadata: {
            full_name?: string;
            avatar_url?: string;
            business_type?: 'barbearia' | 'salao';
            tenant_name?: string;
            name?: string; // Para PublicProfileSetup
            phone?: string; // Para PublicProfileSetup
            image_url?: string; // Para PublicProfileSetup
        };
    };
}

const AuthGate: React.FC = () => {
    const [session, setSession] = useState<MockSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [publicShopId, setPublicShopId] = useState<string | null>(null);

    // Função para simular a obtenção da sessão do localStorage
    const getMockSession = (): MockSession | null => {
        try {
            const storedSession = localStorage.getItem('user_session');
            return storedSession ? JSON.parse(storedSession) : null;
        } catch (e) {
            console.error("Failed to parse session from localStorage", e);
            return null;
        }
    };

    // Função para simular a atualização da sessão no localStorage
    const setMockSession = (newSession: MockSession | null) => {
        if (newSession) {
            localStorage.setItem('user_session', JSON.stringify(newSession));
        } else {
            localStorage.removeItem('user_session');
        }
        setSession(newSession);
    };

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
        
        // Simula a obtenção da sessão inicial
        setSession(getMockSession());
        setLoading(false);

        // Como não temos um listener de auth real, vamos apenas recarregar a sessão
        // ou confiar que o AuthScreen/PublicAuth irá chamar setMockSession
        // e o App irá reagir à mudança de estado 'session'.
        // Para fins de protótipo, um refresh da página após login/logout é suficiente.
    }, []);

    if (loading) {
        return (
             <div className="flex justify-center items-center h-screen bg-background text-white">
                <p>Carregando...</p>
            </div>
        );
    }
    
    if (publicShopId !== null) {
        // Passamos setMockSession para PublicBooking para que ele possa atualizar a sessão
        return <PublicBooking shopId={publicShopId} setSession={setMockSession} />;
    }

    // Passamos setMockSession para AuthScreen para que ele possa atualizar a sessão
    return session ? <App session={session} setSession={setMockSession} /> : <AuthScreen setSession={setMockSession} />;
};

export default AuthGate;