import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AuthInput from '../components/AuthInput';

type AuthMode = 'login' | 'signup';
type BusinessType = 'barber' | 'beauty';

const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Campos de Signup
    const [name, setName] = useState('');
    const [tenantName, setTenantName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('barber');
    
    // Campos Comuns
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const themeClasses = businessType === 'barber' 
        ? { primary: 'text-yellow-400', bgPrimary: 'bg-yellow-400', focusRing: 'focus:ring-yellow-400 focus:border-yellow-400' }
        : { primary: 'text-pink-500', bgPrimary: 'bg-pink-500', focusRing: 'focus:ring-pink-500 focus:border-pink-500' };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (mode === 'signup') {
            // Lógica de Onboarding
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        full_name: name,
                        // Estes dados serão usados por uma Edge Function/Trigger para criar o tenant
                        tenant_name: tenantName,
                        business_type: businessType,
                    }
                }
            });
            
            if (error) {
                setError(error.message);
            } else if (data.user && data.session === null) {
                setError("Confirmação de e-mail necessária. Verifique sua caixa de entrada.");
            }
            
        } else {
            // Lógica de Login
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            }
        }
        setLoading(false);
    };
    
    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    };

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen p-4 ${businessType === 'barber' ? 'theme-barber' : 'theme-beauty'}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="w-full max-w-sm"
            >
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3">
                        <span className={`material-symbols-outlined ${themeClasses.primary} text-4xl`}>auto_awesome</span>
                        <h1 className="text-4xl font-extrabold text-text-primary">Alpha<span className={themeClasses.primary}>Core</span></h1>
                    </div>
                    <p className="text-text-secondary mt-2">A plataforma definitiva para seu negócio.</p>
                </div>
                
                <div className="bg-card p-2 rounded-full flex items-center gap-2 mb-6">
                    <button onClick={() => setMode('login')} className="w-full relative py-2 rounded-full text-sm font-bold">
                        {mode === 'login' && <motion.div layoutId="auth-mode" className={`absolute inset-0 ${themeClasses.bgPrimary} rounded-full z-0`} />}
                        <span className={`relative z-10 transition-colors ${mode === 'login' ? 'text-card' : 'text-text-secondary'}`}>Entrar</span>
                    </button>
                    <button onClick={() => setMode('signup')} className="w-full relative py-2 rounded-full text-sm font-bold">
                        {mode === 'signup' && <motion.div layoutId="auth-mode" className={`absolute inset-0 ${themeClasses.bgPrimary} rounded-full z-0`} />}
                        <span className={`relative z-10 transition-colors ${mode === 'signup' ? 'text-card' : 'text-text-secondary'}`}>Cadastrar</span>
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.form
                        key={mode}
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        onSubmit={handleAuth}
                        className="space-y-4"
                    >
                        {mode === 'signup' && (
                            <>
                                <div className="text-text-primary text-center">
                                    <label className="text-lg font-bold">Qual o seu império?</label>
                                    <div className="flex gap-4 mt-2">
                                        <button type="button" onClick={() => setBusinessType('barber')} className={`flex-1 p-4 rounded-lg border-2 ${businessType === 'barber' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <span className="text-4xl">💈</span>
                                            <p className="font-bold mt-1">Barbearia</p>
                                        </button>
                                        <button type="button" onClick={() => setBusinessType('beauty')} className={`flex-1 p-4 rounded-lg border-2 ${businessType === 'beauty' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <span className="text-4xl">✂️</span>
                                            <p className="font-bold mt-1">Salão/Studio</p>
                                        </button>
                                    </div>
                                </div>
                                <AuthInput icon="store" type="text" placeholder="Nome do Negócio" value={tenantName} onChange={e => setTenantName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                                <AuthInput icon="person" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                            </>
                        )}
                        <AuthInput icon="mail" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        <AuthInput icon="lock" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        
                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                        <button type="submit" disabled={loading} className={`w-full ${themeClasses.bgPrimary} text-background font-bold py-3 rounded-full transition-colors disabled:opacity-50`}>
                            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar Império')}
                        </button>
                    </motion.form>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AuthScreen;