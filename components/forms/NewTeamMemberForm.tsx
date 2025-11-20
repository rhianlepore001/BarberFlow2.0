import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useShopLabels } from '../../hooks/useShopLabels';
import { mockCreateTeamMember } from '../../lib/mockData';

interface NewTeamMemberFormProps {
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    user: User;
}

const NewTeamMemberForm: React.FC<NewTeamMemberFormProps> = ({ onClose, onSuccess, shopId, user }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);
    const shopLabels = useShopLabels(user.shopType);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const memberData = {
            name,
            role: formData.get('role') as string,
            image_url: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=${theme.themeColor.substring(1)}`,
            tenant_id: shopId,
        };

        // Simulação de salvamento
        mockCreateTeamMember(memberData);
        
        // Simulação de sucesso
        setTimeout(() => {
            onSuccess();
        }, 500);
    };

    return (
        <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-4"
        >
            <h2 className="text-xl font-bold text-center text-text-primary">Novo Membro da Equipe</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Nome</label>
                    <input type="text" id="name" name="name" placeholder="Nome do profissional" required className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}/>
                </div>
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-1">Função</label>
                    <input 
                        type="text" 
                        id="role" 
                        name="role" 
                        placeholder={shopLabels.rolePlaceholder}
                        required 
                        className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>

                {error && <p className="text-red-500 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background disabled:${theme.bgPrimary}/50`}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewTeamMemberForm;