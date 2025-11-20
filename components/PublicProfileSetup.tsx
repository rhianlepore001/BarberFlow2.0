import React, { useState } from 'react';
import { motion } from 'framer-motion';
// import { supabase } from '../lib/supabaseClient'; // Removido
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../hooks/useTheme';
import AuthInput from './AuthInput';
import { mockUpdateClient } from '../lib/mockData'; // Usaremos para simular a atualização do cliente

interface PublicProfileSetupProps {
    session: Session;
    onSuccess: (updatedUserMetadata: any) => void; // Retorna os metadados atualizados
    theme: ReturnType<typeof useTheme>;
}

const PublicProfileSetup: React.FC<PublicProfileSetupProps> = ({ session, onSuccess, theme }) => {
    const user = session.user;
    
    // Inicializa com dados existentes ou vazios
    const initialName = user.user_metadata?.name || '';
    const initialPhone = user.user_metadata?.phone || '';
    const initialImageUrl = user.user_metadata?.image_url || '';

    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState(initialPhone);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        if (!name.trim() || !phone.trim()) {
            setError("Apelido e Telefone são obrigatórios.");
            setIsSaving(false);
            return;
        }

        let avatarUrl = initialImageUrl.split('?t=')[0];
        
        // 1. Simulação de Upload da Imagem (se houver)
        if (avatarFile) {
            // Em um protótipo, não fazemos upload real. Apenas geramos uma URL mock.
            avatarUrl = URL.createObjectURL(avatarFile);
        }
        
        // 2. Simular atualização de metadados do usuário
        const updatedUserMetadata = {
            name: name,
            phone: phone,
            image_url: avatarUrl,
        };
        
        // Simular atualização na tabela 'clients' (se existir)
        mockUpdateClient(user.id, { name, phone, image_url: avatarUrl });

        // Simulação de sucesso
        setTimeout(() => {
            onSuccess(updatedUserMetadata); // Retorna os metadados atualizados
        }, 500);
        setIsSaving(false);
    };

    const isProfileComplete = name.trim() && phone.trim() && (avatarFile || initialImageUrl);
    
    // Cor de fallback para o avatar (usando a cor primária do tema)
    const fallbackColor = theme.themeColor;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Complete seu Perfil</h2>
            <p className="text-sm text-text-secondary-dark text-center">Precisamos de seu apelido e telefone para confirmar o agendamento.</p>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex justify-center my-4">
                    <label htmlFor="avatar-upload" className="relative cursor-pointer group">
                        <img 
                            src={previewUrl || `https://ui-avatars.com/api/?name=${name || 'Cliente'}&background=${fallbackColor}&color=101012`} 
                            alt="Avatar" 
                            className={`w-28 h-28 rounded-full object-cover border-2 border-card-dark group-hover:${theme.borderPrimary} transition-colors`} 
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="fa-solid fa-camera text-white text-3xl"></span>
                        </div>
                    </label>
                    <input id="avatar-upload" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="hidden" />
                </div>
                
                <AuthInput 
                    icon="user" 
                    type="text" 
                    placeholder="Seu Apelido" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    focusRingClass={theme.ringPrimary} 
                />
                <AuthInput 
                    icon="phone" 
                    type="tel" 
                    placeholder="Telefone (Ex: 11999998888)" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    required 
                    focusRingClass={theme.ringPrimary} 
                />

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}
                >
                    {isSaving ? 'Salvando...' : 'Continuar Agendamento'}
                </button>
            </form>
        </motion.div>
    );
};

export default PublicProfileSetup;