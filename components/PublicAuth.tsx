import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AuthInput from './AuthInput';
import type { User } from '../types';
import { useTheme } from '../hooks/useTheme';

interface PublicAuthProps {
    onAuthSuccess: (session: any) => void;
    theme: ReturnType<typeof useTheme>;
}

const PublicAuth: React.FC<PublicAuthProps> = ({ onAuthSuccess, theme }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Nome e telefone não são mais necessários aqui, pois serão coletados no PublicProfileSetup
    // const [name, setName] = useState('');
    // const [phone, setPhone] = useState('');

    const handleSocialAuth = async (provider: 'google' | 'facebook') => {
        setLoading(true);
        setError(null);
        
        // Redireciona para a página atual após o login social
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.href,
            }
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
        // Se for bem-sucedido, o listener no AuthGate/PublicBooking cuidará da sessão.
    };
    
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        if (mode === 'signup') {
            // A coleta de nome/telefone foi movida para o passo 'profileSetup'
            
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
                // Não passamos mais 'name' e 'phone' aqui, pois o trigger handle_client_signup
                // usará o email como fallback e o passo 'profileSetup' atualizará os dados.
            });
            
            if (error) {
                setError(error.message);
            } else if (data.user && data.session === null) {
                setError("Confirmação de e-mail necessária. Verifique sua caixa de entrada.");
            } else if (data.session) {
                onAuthSuccess(data.session);
            }
            
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            } else if (data.session) {
                onAuthSuccess(data.session);
            }
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
                {/* Campos de Nome e Telefone removidos daqui, serão coletados no passo 'profileSetup' */}
                <AuthInput icon="mail" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required focusRingClass={theme.ringPrimary} />
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