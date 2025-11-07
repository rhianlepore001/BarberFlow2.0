import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface SetupShopFormProps {
    session: Session;
    onClose: () => void;
    onSuccess: () => void;
}

const SetupShopForm: React.FC<SetupShopFormProps> = ({ session, onClose, onSuccess }) => {
    const [shopName, setShopName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const userId = session.user.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopName.trim()) return;
        setIsSaving(true);
        setError(null);

        try {
            // 1. Insert the new shop
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .insert([{ owner_id: userId, name: shopName }])
                .select('id')
                .single();

            if (shopError || !shopData) {
                throw new Error(shopError?.message || "Falha ao criar a barbearia.");
            }
            
            const shopId = shopData.id;

            // 2. Update the existing team_member entry with the new shop_id
            const { error: memberUpdateError } = await supabase
                .from('team_members')
                .update({ shop_id: shopId })
                .eq('auth_user_id', userId);

            if (memberUpdateError) {
                throw new Error(memberUpdateError.message);
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error setting up shop:', err);
            setError(`Erro ao configurar a barbearia: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-primary">Bem-vindo(a)!</h2>
            <p className="text-center text-sm text-text-secondary-dark">Parece que você fez login com Google. Para começar, precisamos do nome da sua barbearia.</p>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="shop-name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome da Barbearia</label>
                    <input 
                        type="text" 
                        id="shop-name" 
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="Ex: Corte Certo Barbershop" 
                        required
                        className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center -mt-2 mb-2">{error}</p>}

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full rounded-full bg-primary py-3 text-center font-bold text-background-dark disabled:bg-primary/50"
                    >
                        {isSaving ? 'Configurando...' : 'Salvar e Continuar'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default SetupShopForm;