import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { TeamMember, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useShopLabels } from '../../hooks/useShopLabels'; // Importa o novo hook

interface EditTeamMemberFormProps {
    member: TeamMember;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

const EditTeamMemberForm: React.FC<EditTeamMemberFormProps> = ({ member, onClose, onSuccess, user }) => {
    const [name, setName] = useState(member.name);
    const [role, setRole] = useState(member.role);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(member.image_url);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);
    const shopLabels = useShopLabels(user.shopType); // Usa o novo hook

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setAvatarFile(null);
            setPreviewUrl(member.image_url); // Volta para a imagem original se o arquivo for limpo
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        let imageUrl = member.image_url; // Mantém a URL existente por padrão

        // Se um novo arquivo de avatar foi selecionado
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${member.id}/${new Date().getTime()}.${fileExt}`; // Usa o ID do membro existente
            
            const { error: uploadError } = await supabase.storage.from('team_avatars').upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true // Sobrescreve se já existir um arquivo com o mesmo nome
            });
            
            if (uploadError) {
                console.error('Error uploading avatar:', uploadError);
                setError(`Erro ao enviar a imagem: ${uploadError.message}`);
                setIsSaving(false);
                return;
            }
            
            const { data: publicUrlData } = supabase.storage.from('team_avatars').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
        } else if (previewUrl === null && member.image_url) {
            // Se o usuário removeu a imagem (previewUrl se tornou null e havia uma imagem original)
            // Opcional: Deletar a imagem antiga do storage. Por simplicidade, vamos apenas remover a URL do DB.
            imageUrl = null;
        }

        const memberData = { name, role, image_url: imageUrl };

        const { error: updateError } = await supabase.from('team_members').update(memberData).eq('id', member.id);
        if (updateError) {
            console.error("Error updating team member:", updateError);
            setError(`Erro ao atualizar: ${updateError.message}`);
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-4"
        >
            <h2 className="text-xl font-bold text-center text-white">Editar Membro</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex justify-center my-4">
                    <label htmlFor="avatar-upload" className="relative cursor-pointer group">
                        <img 
                            src={previewUrl || `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${theme.themeColor.substring(1)}&color=101012`} 
                            alt="Avatar" 
                            className={`w-28 h-28 rounded-full object-cover border-2 border-card-dark group-hover:${theme.borderPrimary} transition-colors`} 
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                        </div>
                    </label>
                    <input id="avatar-upload" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="hidden" />
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome</label>
                    <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do profissional" 
                        required 
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-text-secondary-dark mb-1">Função</label>
                    <input 
                        type="text" 
                        id="role" 
                        name="role" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder={shopLabels.rolePlaceholder} 
                        required 
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>
                
                {error && <p className="text-red-400 text-xs text-center -mt-2 mb-2">{error}</p>}

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

export default EditTeamMemberForm;