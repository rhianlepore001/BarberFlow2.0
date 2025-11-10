import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { User } from '../../types';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../../hooks/useTheme';

interface EditProfileFormProps {
    user: User;
    session: Session;
    onClose: () => void;
    onSuccess: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ user, session, onClose, onSuccess }) => {
    const [name, setName] = useState(user.name);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.imageUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

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
        let avatarUrl = user.imageUrl.split('?t=')[0]; // Remove o cache buster se não houver novo upload
        
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${session.user.id}/${new Date().getTime()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true
            });
            
            if (uploadError) {
                console.error('Error uploading avatar:', uploadError);
                setError(`Erro ao enviar a imagem: ${uploadError.message}`);
                setIsSaving(false);
                return;
            }
            
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = data.publicUrl;
        }

        // Usar 'upsert' é mais robusto: cria o perfil se não existir, atualiza se existir.
        const { error: dbError } = await supabase
            .from('team_members')
            .upsert({ 
                auth_user_id: session.user.id, 
                name, 
                image_url: avatarUrl 
            }, { 
                onConflict: 'auth_user_id' 
            });
            
        if (dbError) {
            console.error('Error updating profile:', dbError);
            setError(`Erro ao atualizar o perfil: ${dbError.message}`);
        } else {
            onSuccess();
        }
        
        setIsSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Editar Perfil</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex justify-center my-4">
                    <label htmlFor="avatar-upload" className="relative cursor-pointer group">
                        <img src={previewUrl || `https://ui-avatars.com/api/?name=${name}&background=${theme.themeColor.substring(1)}&color=101012`} alt="Avatar" className={`w-28 h-28 rounded-full object-cover border-2 border-card-dark group-hover:${theme.borderPrimary} transition-colors`} />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-3xl">edit</span>
                        </div>
                    </label>
                    <input id="avatar-upload" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="hidden" />
                </div>
                
                <div>
                    <label htmlFor="profile-name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome</label>
                    <input 
                        type="text" 
                        id="profile-name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome" 
                        required
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditProfileForm;