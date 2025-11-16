import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useShopLabels } from '../../hooks/useShopLabels'; // Importa o novo hook

interface NewTeamMemberFormProps {
    onClose: () => void;
    onSuccess: () => void;
    shopId: number; // Adicionado shopId
    user: User;
}

const NewTeamMemberForm: React.FC<NewTeamMemberFormProps> = ({ onClose, onSuccess, shopId, user }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const theme = useTheme(user);
    const shopLabels = useShopLabels(user.shopType); // Usa o novo hook

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setAvatarFile(null);
            setPreviewUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const role = formData.get('role') as string;

        // 1. Insere o membro da equipe sem a imagem inicialmente
        const { data: newMember, error: insertError } = await supabase
            .from('team_members')
            .insert([{ 
                name,
                role,
                shop_id: shopId,
                // image_url será atualizado depois se houver um avatarFile
            }])
            .select('id') // Seleciona o ID do novo membro
            .single();

        if (insertError) {
            console.error("Error saving team member:", insertError);
            setError("Falha ao adicionar membro. Tente novamente.");
            setIsSaving(false);
            return;
        }

        let imageUrl = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${theme.themeColor.substring(1)}&color=101012`;

        // 2. Se houver um arquivo de avatar, faz o upload
        if (avatarFile && newMember) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${newMember.id}/${new Date().getTime()}.${fileExt}`; // Usa o ID do novo membro
            
            const { error: uploadError } = await supabase.storage.from('team_avatars').upload(filePath, avatarFile, {
                cacheControl: '3600',
                upsert: true
            });
            
            if (uploadError) {
                console.error('Error uploading avatar:', uploadError);
                setError(`Erro ao enviar a imagem: ${uploadError.message}`);
                setIsSaving(false);
                return;
            }
            
            const { data: publicUrlData } = supabase.storage.from('team_avatars').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;

            // 3. Atualiza o membro da equipe com a URL da imagem
            const { error: updateError } = await supabase
                .from('team_members')
                .update({ image_url: imageUrl })
                .eq('id', newMember.id);

            if (updateError) {
                console.error('Error updating team member with image URL:', updateError);
                setError(`Membro adicionado, mas falha ao salvar a imagem: ${updateError.message}`);
                setIsSaving(false);
                return;
            }
        }

        onSuccess();
        setIsSaving(false);
    };

    return (
        <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-4"
        >
            <h2 className="text-xl font-bold text-center text-white">Novo Membro da Equipe</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex justify-center my-4">
                    <label htmlFor="avatar-upload" className="relative cursor-pointer group">
                        <img 
                            src={previewUrl || `https://ui-avatars.com/api/?name=${shopLabels.defaultAvatarName}&background=${theme.themeColor.substring(1)}&color=101012`} 
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
                    <input type="text" id="name" name="name" placeholder="Nome do profissional" required className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}/>
                </div>
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-text-secondary-dark mb-1">Função</label>
                    <input 
                        type="text" 
                        id="role" 
                        name="role" 
                        placeholder={shopLabels.rolePlaceholder} // Usando placeholder dinâmico
                        required 
                        className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewTeamMemberForm;