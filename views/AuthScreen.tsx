import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AuthInput from '../components/AuthInput';

type AuthMode = 'login' | 'signup';
type ShopType = 'barbearia' | 'salao';
type Country = 'BR' | 'PT'; // Novo tipo para o país

const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [shopName, setShopName] = useState('');
    const [shopType, setShopType] = useState<ShopType>('barbearia');
    const [country, setCountry] = useState<Country>('BR'); // Novo estado para o país
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const themeClasses = { 
        primary: 'text-primary', 
        bgPrimary: 'bg-primary',
        focusRing: 'focus:ring-primary focus:border-primary'
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const avatarColor = shopType === 'salao' ? '8A2BE2' : '4169E1';
        const defaultImageUrl = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${avatarColor}&color=101012`;

        if (mode === 'signup') {
            if (password !== confirmPassword) {
                setError("As senhas não coincidem.");
                setLoading(false);
                return;
            }
            
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        name: name,
                        shop_name: shopName,
                        shop_type: shopType,
                        country: country, // Envia o país no cadastro
                        image_url: defaultImageUrl
                    }
                }
            });
            
            if (error) {
                setError(error.message);
            } else if (data.user && data.session === null) {
                setError("Confirmação de e-mail necessária. Verifique sua caixa de entrada.");
            }
            
        } else {
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="w-full max-w-sm"
            >
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3">
                        <span className={`material-symbols-outlined ${themeClasses.primary} text-4xl`}>auto_awesome</span>
                        <h1 className="text-4xl font-extrabold text-white">Flow<span className={themeClasses.primary}>Pro</span></h1>
                    </div>
                    <p className="text-text-secondary-dark mt-2">Gestão de primeira para seu negócio de beleza.</p>
                </div>
                
                <div className="bg-card-dark p-2 rounded-full flex items-center gap-2 mb-6">
                    <button onClick={() => setMode('login')} className="w-full relative py-2 rounded-full text-sm font-bold">
                        {mode === 'login' && <motion.div layoutId="auth-mode" className={`absolute inset-0 ${themeClasses.bgPrimary} rounded-full z-0`} />}
                        <span className={`relative z-10 transition-colors ${mode === 'login' ? 'text-background-dark' : 'text-text-secondary-dark'}`}>Entrar</span>
                    </button>
                    <button onClick={() => setMode('signup')} className="w-full relative py-2 rounded-full text-sm font-bold">
                        {mode === 'signup' && <motion.div layoutId="auth-mode" className={`absolute inset-0 ${themeClasses.bgPrimary} rounded-full z-0`} />}
                        <span className={`relative z-10 transition-colors ${mode === 'signup' ? 'text-background-dark' : 'text-text-secondary-dark'}`}>Cadastrar</span>
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
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-dark">public</span>
                                    <select
                                        value={country}
                                        onChange={e => setCountry(e.target.value as Country)}
                                        required
                                        className={`w-full bg-background-dark border-2 border-card-dark rounded-full py-3 pl-12 pr-4 text-white placeholder-text-secondary-dark focus:ring-2 ${themeClasses.focusRing} transition-all appearance-none`}
                                    >
                                        <option value="BR">Brasil (R$)</option>
                                        <option value="PT">Portugal (€)</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-dark pointer-events-none">expand_more</span>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-dark">store</span>
                                    <select
                                        value={shopType}
                                        onChange={e => setShopType(e.target.value as ShopType)}
                                        required
                                        className={`w-full bg-background-dark border-2 border-card-dark rounded-full py-3 pl-12 pr-4 text-white placeholder-text-secondary-dark focus:ring-2 ${themeClasses.focusRing} transition-all appearance-none`}
                                    >
                                        <option value="barbearia">Barbearia</option>
                                        <option value="salao">Salão de Beleza</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-dark pointer-events-none">expand_more</span>
                                </div>
                                
                                <AuthInput icon="store" type="text" placeholder="Nome do Negócio" value={shopName} onChange={e => setShopName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                                <AuthInput icon="person" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                            </>
                        )}
                        <AuthInput icon="mail" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        <AuthInput icon="lock" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        
                        {mode === 'signup' && (
                            <AuthInput icon="lock" type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        )}
                        
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                        <button type="submit" disabled={loading} className={`w-full ${themeClasses.bgPrimary} text-background-dark font-bold py-3 rounded-full hover:${themeClasses.bgPrimary}/80 transition-colors disabled:opacity-50`}>
                            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </motion.form>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AuthScreen;