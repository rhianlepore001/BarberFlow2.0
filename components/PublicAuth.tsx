import React, { useState } from 'react';
import { motion } from 'framer-motion';
// import { supabase } from '../lib/supabaseClient'; // Removido
import AuthInput from './AuthInput';
import type { User } from '../types';
import { useTheme } from '../hooks/useTheme';

interface PublicAuthProps {
    onAuthSuccess: (session: any) => void;
    theme: ReturnType<typeof useTheme>;
    setSession: (session: any | null) => void; // Adicionado para atualizar a sessão
}

const PublicAuth: React.FC<PublicAuthProps> = ({ onAuthSuccess, theme, setSession }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSocialAuth = async (provider: 'google' | 'facebook') => {
        setLoading(true);
        setError(null);
        
        // Simulação de login social
        const mockSession = {
            user: {
                id: `user-${provider}-${Date.now()}`,
                email: `${provider}@example.com`,
                user_metadata: {
                    name: `Cliente ${provider}`,
                    phone: '11987654321',
                    image_url: `https://ui-avatars.com/api/?name=Cliente+${provider}&background=${theme.themeColor}&color=101012`,
                }
            }
        };
        setSession(mockSession);
        localStorage.setItem('user_session', JSON.stringify(mockSession));
        onAuthSuccess(mockSession);
        setLoading(false);
    };
    
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        if (mode === 'signup') {
            const mockSession = {
                user: {
                    id: `user-${Date.now()}`,
                    email: email,
                    user_metadata: {
                        name: email.split('@')[0], // Nome inicial do email
                        phone: '', // Telefone vazio para forçar profileSetup
                        image_url: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=${theme.themeColor}&color=101012`,
                    }
                }
            };
            setSession(mockSession);
            localStorage.setItem('user_session', JSON.stringify(mockSession));
            onAuthSuccess(mockSession);
            
        } else {
            // Simulação de login
            const mockSession = {
                user: {
                    id: `user-${Date.now()}`,
                    email: email,
                    user_metadata: {
                        name: email.split('@')[0],
                        phone: '11987654321', // Telefone preenchido para simular perfil completo
                        image_url: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=${theme.themeColor}&color=101012`,
                    }
                }
            };
            setSession(mockSession);
            localStorage.setItem('user_session', JSON.stringify(mockSession));
            onAuthSuccess(mockSession);
        }
        setLoading(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-lg font-bold text-white text-center">
                {mode === 'login' ? 'Entre para Agendar' : 'Crie sua Conta'}
            </h2>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => handleSocialAuth('google')} 
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-background-dark py-3 rounded-full text-white font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                    Google
                </button>
                <button 
                    onClick={() => handleSocialAuth('facebook')} 
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-background-dark py-3 rounded-full text-white font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook" className="w-5 h-5" />
                    Facebook
                </button>
            </div>
            
            <div className="flex items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-sm text-text-secondary-dark">ou</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <AuthInput icon="envelope" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required focusRingClass={theme.ringPrimary} />
                <AuthInput icon="lock" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required focusRingClass={theme.ringPrimary} />
                
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <button type="submit" disabled={loading} className={`w-full ${theme.bgPrimary} text-background-dark font-bold py-3 rounded-full hover:${theme.bgPrimary}/80 transition-colors disabled:opacity-50`}>
                    {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Cadastrar e Continuar')}
                </button>
            </form>
            
            <button 
                onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError(null);
                }}
                className={`w-full text-sm font-semibold ${theme.primary} hover:text-yellow-400 transition-colors`}
            >
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já sou cliente'}
            </button>
        </motion.div>
    );
};

export default PublicAuth;