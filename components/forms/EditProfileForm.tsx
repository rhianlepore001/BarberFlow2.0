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
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.image_url);
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
        let avatarUrl = user.image_url.split('?t=')[0];
        
        if (avatarFile) {
            const filePath = `public/${user.id}/${Date.now()}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile);

            if (uploadError) {
                setError("Erro ao enviar a imagem.");
                setIsSaving(false);
                return;
            }
            
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
            avatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
        }

        const { error: userUpdateError } = await supabase.auth.updateUser({
            data: { full_name: name, avatar_url: avatarUrl }
        });

        if (userUpdateError) {
            setError(userUpdateError.message);
            setIsSaving(false);
            return;
        }

        const { error: teamUpdateError } = await supabase
            .from('team_members')
            .update({ name, image_url: avatarUrl })
            .eq('auth_user_id', session.user.id);

        if (teamUpdateError) {
            setError("Erro ao atualizar o perfil da equipe.");
            setIsSaving(false);
            return;
        }
        
        onSuccess();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Editar Perfil</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex justify-center my-4">
                    <label htmlFor="avatar-upload" className="relative cursor-pointer group">
                        <img src={previewUrl || `https://ui-avatars.com/api/?name=${name}&background=${theme.themeColor.substring(1)}&color=101012`} alt="Avatar" className={`w-28 h-28 rounded-full object-cover border-2 border-card-dark group-hover:${theme.borderPrimary} transition-colors`} />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
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