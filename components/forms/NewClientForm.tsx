import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { User } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface NewClientFormProps {
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

const NewClientForm: React.FC<NewClientFormProps> = ({ onClose, onSuccess, user }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        setError(null);
        
        const { error } = await supabase.from('clients').insert({
            name,
            phone,
            tenant_id: user.tenant_id,
        });

        if (error) {
            setError("Erro ao salvar o cliente.");
            setIsSaving(false);
        } else {
            onSuccess();
        }
    };

    return (
        <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-4"
        >
            <h2 className="text-xl font-bold text-center text-text-primary">Novo Cliente</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Nome</label>
                    <input 
                        type="text" 
                        id="name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do cliente" 
                        required
                        className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>
                 <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">Telefone (Opcional)</label>
                    <input 
                        type="tel" 
                        id="phone" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(99) 99999-9999" 
                        className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>

                {error && <p className="text-red-500 text-xs text-center -mt-2 mb-2">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background disabled:${theme.bgPrimary}/50`}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewClientForm;