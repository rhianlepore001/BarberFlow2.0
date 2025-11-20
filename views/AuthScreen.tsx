import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthInput from '../components/AuthInput';

type AuthMode = 'login' | 'signup';
type BusinessType = 'barbearia' | 'salao'; // Usando os valores do enum do DB

interface AuthScreenProps {
    setSession: (session: any | null) => void; // Adicionado para atualizar a sessão
}

const AuthScreen: React.FC<AuthScreenProps> = ({ setSession }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [name, setName] = useState('');
    const [tenantName, setTenantName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('barbearia');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const themeClasses = businessType === 'barbearia' 
        ? { primary: 'text-primary', bgPrimary: 'bg-primary', focusRing: 'focus:ring-primary focus:border-primary', themeClass: 'theme-barber' }
        : { primary: 'text-primary', bgPrimary: 'bg-primary', focusRing: 'focus:ring-primary focus:border-primary', themeClass: 'theme-beauty' };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Simulação de login/signup
        if (mode === 'signup') {
            const mockSession = {
                user: {
                    id: `user-${Date.now()}`,
                    email: email,
                    user_metadata: {
                        full_name: name,
                        tenant_name: tenantName,
                        business_type: businessType,
                        avatar_url: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${themeClasses.primary.substring(1)}`,
                    }
                }
            };
            setSession(mockSession); // Atualiza a sessão no AuthGate
            localStorage.setItem('user_session', JSON.stringify(mockSession));
            window.location.reload(); // Recarrega para ir para o App
            
        } else {
            const mockSession = {
                user: {
                    id: 'mock-user-id',
                    email: email,
                    user_metadata: {
                        full_name: 'Mestre Barbeiro',
                        tenant_name: 'BarberFlow Central',
                        business_type: 'barbearia',
                        avatar_url: `https://ui-avatars.com/api/?name=Mestre+Barbeiro&background=EAB308`,
                    }
                }
            };
            setSession(mockSession); // Atualiza a sessão no AuthGate
            localStorage.setItem('user_session', JSON.stringify(mockSession));
            window.location.reload(); // Recarrega para ir para o App
        }
        setLoading(false);
    };
    
    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    };

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen p-4 ${themeClasses.themeClass}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="w-full max-w-sm"
            >
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3">
                        <i className={`fa-solid fa-wand-magic-sparkles ${themeClasses.primary} text-4xl`}></i>
                        <h1 className="text-4xl font-extrabold text-text-primary">Flow<span className={themeClasses.primary}>Pro</span></h1>
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
                                    <label className="text-lg font-bold">Qual é o seu negócio?</label>
                                    <div className="flex gap-4 mt-2">
                                        <button type="button" onClick={() => setBusinessType('barbearia')} className={`flex-1 p-4 rounded-xl border-2 ${businessType === 'barbearia' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <i className="fa-solid fa-cut text-4xl"></i>
                                            <p className="font-bold mt-1">Barbearia</p>
                                            <p className="text-xs text-text-secondary mt-1">Quero agilidade e lucro</p>
                                        </button>
                                        <button type="button" onClick={() => setBusinessType('salao')} className={`flex-1 p-4 rounded-xl border-2 ${businessType === 'salao' ? `border-primary bg-primary/10` : 'border-card hover:border-primary/50'}`}>
                                            <i className="fa-solid fa-spa text-4xl"></i>
                                            <p className="font-bold mt-1">Salão/Estúdio</p>
                                            <p className="text-xs text-text-secondary mt-1">Quero gestão e fidelidade</p>
                                        </button>
                                    </div>
                                </div>
                                <AuthInput icon="store" type="text" placeholder="Nome do Negócio" value={tenantName} onChange={e => setTenantName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                                <AuthInput icon="user" type="text" placeholder="Seu Nome" value={name} onChange={e => setName(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                            </>
                        )}
                        <AuthInput icon="envelope" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        <AuthInput icon="lock" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required focusRingClass={themeClasses.focusRing} />
                        
                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                        <button type="submit" disabled={loading} className={`w-full ${themeClasses.bgPrimary} text-background font-bold py-3 rounded-full transition-colors disabled:opacity-50`}>
                            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </motion.form>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AuthScreen;