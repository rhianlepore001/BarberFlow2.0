import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

type AuthMode = 'login' | 'signup';

const AuthInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon: string }> = ({ icon, ...props }) => (
    <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-dark">{icon}</span>
        <input
            {...props}
            className="w-full bg-background-dark border-2 border-card-dark rounded-full py-3 pl-12 pr-4 text-white placeholder-text-secondary-dark focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
    </div>
);

const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [shopName, setShopName] = useState(''); // Novo estado para o nome da barbearia
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (mode === 'signup') {
            // Passamos o nome da barbearia e o nome do usuário nos metadados
            const { error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        name: name,
                        shop_name: shopName, // Novo metadado
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
    
    const handleGoogleLogin = async () => {
        // Para o Google OAuth, o usuário precisará completar o cadastro da barbearia após o primeiro login,
        // pois o Google não fornece o nome da barbearia.
        await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                redirectTo: window.location.origin, // Redireciona para a raiz após o login
            }
        });
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
                        
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                        <button type="submit" disabled={loading} className="w-full bg-primary text-background-dark font-bold py-3 rounded-full hover:bg-yellow-400 transition-colors disabled:opacity-50">
                            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </motion.form>
                </AnimatePresence>

                <div className="flex items-center my-6">
                    <hr className="flex-grow border-card-dark"/>
                    <span className="px-4 text-xs text-text-secondary-dark">OU</span>
                    <hr className="flex-grow border-card-dark"/>
                </div>

                <motion.button 
                    onClick={handleGoogleLogin}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 bg-card-dark text-white font-bold py-3 rounded-full hover:bg-gray-700/50 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691c-1.222 2.862-1.954 6.069-1.954 9.309s.732 6.447 1.954 9.309l-5.657 5.657C.223 34.69 0 29.584 0 24s.223-10.69 1.649-14.961l4.657 5.652z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-5.657-5.657C30.01 35.091 27.213 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-5.657 5.657C9.033 41.522 15.93 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.657 5.657C42.468 35.918 44 30.278 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
                    Continuar com Google
                </motion.button>

            </motion.div>
        </div>
    );
};

export default AuthScreen;