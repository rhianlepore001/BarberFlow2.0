import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

interface NewClientFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

const NewClientForm: React.FC<NewClientFormProps> = ({ onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        setError(null);
        
        const { error: insertError } = await supabase
            .from('clients')
            .insert([{ 
                name,
                phone,
                last_visit: new Date().toISOString(),
                image_url: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random` 
            }]);

        if (insertError) {
            console.error('Error saving client:', insertError);
            setError(`Erro ao salvar cliente: ${insertError.message}`);
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
            <h2 className="text-xl font-bold text-center text-white">Novo Cliente</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome</label>
                    <input 
                        type="text" 
                        id="name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do cliente" 
                        required
                        className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"
                    />
                </div>
                 <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-text-secondary-dark mb-1">Telefone (Opcional)</label>
                    <input 
                        type="tel" 
                        id="phone" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(99) 99999-9999" 
                        className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center -mt-2 mb-2">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full rounded-full bg-primary py-3 text-center font-bold text-background-dark disabled:bg-primary/50"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewClientForm;