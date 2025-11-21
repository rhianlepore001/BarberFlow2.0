import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AuthInput from '../components/AuthInput';

type AuthMode = 'login' | 'signup';
type BusinessType = 'barbearia' | 'salao';
type Country = 'BR' | 'PT';

interface AuthScreenProps {
    onThemeChange: (themeClass: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onThemeChange }) => {
    // --- State Declarations ---
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Signup specific states
    const [country, setCountry] = useState<Country>('BR');
    const [tenantName, setTenantName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('barbearia'); // Explicitly declared here
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    
    // Auth credentials states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validation states
    const [passwordMismatch, setPasswordMismatch] = useState(false);
    const [passwordTooShort, setPasswordTooShort] = useState(false);

    // --- Memoized Values (derived from state) ---
    const { currencyCode, currencySymbol, locale, phoneMask, phonePlaceholder } = useMemo(() => {
        if (country === 'BR') {
            return {
                currencyCode: 'BRL',
                currencySymbol: 'R$',
                locale: 'pt-BR',
                phoneMask: '(99) 99999-9999',
                phonePlaceholder: '(XX) XXXXX-XXXX'
            };
        } else { // PT
            return {
                currencyCode: 'EUR',
                currencySymbol: '€',
                locale: 'pt-PT',
                phoneMask: '999 999 999',
                phonePlaceholder: 'XXX XXX XXX'
            };
        }
    }, [country]);

    const themeClasses = useMemo(() => {
        // console.log('Evaluating themeClasses useMemo, businessType:', businessType); // Debugging line
        if (businessType === 'barbearia') {
            return { 
                primary: 'text-primary', bgPrimary: 'bg-primary', focusRing: 'focus:ring-primary focus:border-primary', 
                themeClass: 'theme-barber',
                buttonText: 'Criar meu Império'
            };
        } else { // 'salao'
            return { 
                primary: 'text-primary', bgPrimary: 'bg-primary', focusRing: 'focus:ring-primary focus:border-primary', 
                themeClass: 'theme-beauty',
                buttonText: 'Começar Transformação'
            };
        }
    }, [businessType]);

    // --- Effects ---
    // Communicate theme class to parent (AuthGate)
    useEffect(() => {
        onThemeChange(themeClasses.themeClass);
    }, [themeClasses.themeClass, onThemeChange]);

    // Password validation effect
    useEffect(() => {
        if (mode === 'signup') {
            setPasswordTooShort(password.length > 0 && password.length < 6);
            setPasswordMismatch(confirmPassword.length > 0 && password !== confirmPassword);
        } else {
            setPasswordMismatch(false);
            setPasswordTooShort(false);
        }
    }, [password, confirmPassword, mode]);

    // Phone masking effect
    const applyPhoneMask = (value: string, mask: string) => {
        let i = 0;
        const v = value.replace(/\D/g, '');
        return mask.replace(/9/g, () => v[i++] || '');
    };

    useEffect(() => {
        setPhone(prevPhone => {
            const unmasked = prevPhone.replace(/\D/g, '');
            return applyPhoneMask(unmasked, phoneMask);
        });
    }, [phoneMask]);

    // --- Handlers ---
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const unmasked = e.target.value.replace(/\D/g, '');
        setPhone(applyPhoneMask(unmasked, phoneMask));
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (mode === 'signup') {
            if (password.length < 6) {
                setError("A senha deve ter pelo menos 6 caracteres.");
                setLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError("As senhas não coincidem.");
                setLoading(false);
                return;
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        tenant_name: tenantName,
                        business_type: businessType,
                        country: country,
                        currency: currencyCode,
                        phone: phone.replace(/\D/g, ''), // Save unmasked phone
                    }
                }
            });
            if (error) setError(error.message);
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) setError(error.message);
        }
        setLoading(false);
    };
    
    // --- Animation Variants ---
    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    };

    // --- Render ---
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen p-4 ${themeClasses.themeClass}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-6 space-y-6 backdrop-blur-lg bg-white/10 border border-white/20"
            >
                <div className="text-center mb-4">
                    <div className="flex justify-center items-center gap-3">
                        <span className={`material-symbols-outlined ${themeClasses.primary} text-4xl`}>auto_awesome</span>
                        <h1 className="text-4xl font-extrabold text-text-primary">Alpha<span className={themeClasses.primary}>Core</span></h1>
                    </div>
                    <p className="text-text-secondary mt-2">A plataforma definitiva para o seu negócio.</p>
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
                                    <label className="text-lg font-bold mb-2 block">Onde fica seu negócio?</label>
                                    <div className="flex gap-4 mt-2">
                                        <button type="button" onClick={() => setCountry('BR')} className={`flex-1 p-4 rounded-xl border-2 ${country === 'BR' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <span className="text-4xl">🇧🇷</span>
                                            <p className="font-bold mt-1">Brasil</p>
                                        </button>
                                        <button type="button" onClick={() => setCountry('PT')} className={`flex-1 p-4 rounded-xl border-2 ${country === 'PT' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <span className="text-4xl">🇵🇹</span>
                                            <p className="font-bold mt-1">Portugal</p>
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {country === 'PT' && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -10 }} 
                                                animate={{ opacity: 1, y: 0 }} 
                                                exit={{ opacity: 0, y: -10 }}
                                                className="text-sm text-text-secondary mt-2"
                                            >
                                                Moeda definida para Euro ({currencySymbol})
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="text-text-primary text-center">
                                    <label className="text-lg font-bold mb-2 block">Qual é o seu negócio?</label>
                                    <div className="flex gap-4 mt-2">
                                        <button type="button" onClick={() => setBusinessType('barbearia')} className={`flex-1 p-4 rounded-xl border-2 ${businessType === 'barbearia' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <span className="material-symbols-outlined text-4xl">content_cut</span>
                                            <p className="font-bold mt-1">Barbearia</p>
                                        </button>
                                        <button type="button" onClick={() => setBusinessType('salao')} className={`flex-1 p-4 rounded-xl border-2 ${businessType === 'salao' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <span className="material-symbols-outlined text-4xl">spa</span>
                                            <p className="font-bold mt-1">Salão/Estúdio</p>
                                        </button>
                                    </div>
                                </div>
                                <AuthInput id="tenant-name" icon="store" label="Nome do Estabelecimento" type="text" value={tenantName} onChange={e => setTenantName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                                <AuthInput id="full-name" icon="user" label="Seu Nome Completo" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                                <AuthInput id="phone" icon="phone" label="Telefone/WhatsApp" type="tel" value={phone} onChange={handlePhoneChange} required focusRingClass={themeClasses.focusRing} placeholder={phonePlaceholder} />
                            </>
                        )}
                        <AuthInput id="email" icon="envelope" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        <AuthInput 
                            id="password" 
                            icon="lock" 
                            label="Senha" 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            focusRingClass={themeClasses.focusRing} 
                            error={passwordTooShort}
                        />
                        {mode === 'signup' && (
                            <AuthInput 
                                id="confirm-password" 
                                icon="lock" 
                                label="Confirmar Senha" 
                                type="password" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                required 
                                focusRingClass={themeClasses.focusRing} 
                                error={passwordMismatch}
                            />
                        )}
                        
                        {passwordTooShort && <p className="text-red-500 text-xs text-center">A senha deve ter pelo menos 6 caracteres.</p>}
                        {passwordMismatch && <p className="text-red-500 text-xs text-center">As senhas não coincidem.</p>}
                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                        <button 
                            type="submit" 
                            disabled={loading || (mode === 'signup' && (passwordMismatch || passwordTooShort || !tenantName || !fullName || !phone))} 
                            className={`w-full ${themeClasses.bgPrimary} text-background font-bold py-3 rounded-full transition-colors disabled:opacity-50`}
                        >
                            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : themeClasses.buttonText)}
                        </button>
                    </motion.form>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AuthScreen;