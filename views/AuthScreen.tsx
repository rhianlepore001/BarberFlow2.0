import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import AuthInput from '../components/AuthInput';

type AuthMode = 'login' | 'signup';

const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [shopName, setShopName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Novo estado para confirmação de senha

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (mode === 'signup') {
            if (password !== confirmPassword) {
                setError("As senhas não coincidem.");
                setLoading(false);
                return;
            }
            
            // Passamos o nome da barbearia e o nome do usuário nos metadados
            const { error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        name: name,
                        shop_name: shopName,
                        image_url: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=E5A00D&color=101012`
                    }
                }
            });
            if (error) {
                setError(error.message);
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
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
                        <span className="material-symbols-outlined text-primary text-4xl transform -scale-x-100 rotate-45">content_cut</span>
                        <h1 className="text-4xl font-extrabold text-white">Barber<span className="text-primary">Flow</span></h1>
                    </div>
                    <p className="text-text-secondary-dark mt-2">Gestão de primeira para sua barbearia.</p>
                </div>
                
                <div className="bg-card-dark p-2 rounded-full flex items-center gap-2 mb-6">
                    <button onClick={() => setMode('login')} className="w-full relative py-2 rounded-full text-sm font-bold">
                        {mode === 'login' && <motion.div layoutId="auth-mode" className="absolute inset-0 bg-primary rounded-full z-0" />}
                        <span className={`relative z-10 transition-colors ${mode === 'login' ? 'text-background-dark' : 'text-text-secondary-dark'}`}>Entrar</span>
                    </button>
                    <button onClick={() => setMode('signup')} className="w-full relative py-2 rounded-full text-sm font-bold">
                        {mode === 'signup' && <motion.div layoutId="auth-mode" className="absolute inset-0 bg-primary rounded-full z-0" />}
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
                                <AuthInput icon="store" type="text" placeholder="Nome da Barbearia" value={shopName} onChange={e => setShopName(e.target.value)} required />
                                <AuthInput icon="person" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
                            </>
                        )}
                        <AuthInput icon="mail" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                        <AuthInput icon="lock" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
                        
                        {mode === 'signup' && (
                            <AuthInput icon="lock" type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        )}
                        
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                        <button type="submit" disabled={loading} className="w-full bg-primary text-background-dark font-bold py-3 rounded-full hover:bg-yellow-400 transition-colors disabled:opacity-50">
                            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </motion.form>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AuthScreen;