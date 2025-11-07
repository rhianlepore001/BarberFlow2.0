import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

interface NewServiceFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

const NewServiceForm: React.FC<NewServiceFormProps> = ({ onClose, onSuccess }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const serviceData = {
            name: formData.get('service-name') as string,
            price: parseFloat(formData.get('price') as string),
            duration_minutes: parseInt(formData.get('duration') as string),
        };

        const { error: insertError } = await supabase.from('services').insert([serviceData]);
        if (insertError) {
            console.error("Error saving service:", insertError);
            setError(`Erro ao salvar: ${insertError.message}`);
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
            <h2 className="text-xl font-bold text-center text-white">Novo Serviço</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                 <div>
                    <label htmlFor="service-name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome do Serviço</label>
                    <input type="text" id="service-name" name="service-name" placeholder="Ex: Corte & Barba" required className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"/>
                </div>
                <div className="flex gap-3">
                    <div className="w-1/2">
                        <label htmlFor="price" className="block text-sm font-medium text-text-secondary-dark mb-1">Preço</label>
                        <input type="number" step="0.01" id="price" name="price" placeholder="R$ 0,00" required className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"/>
                    </div>
                    <div className="w-1/2">
                         <label htmlFor="duration" className="block text-sm font-medium text-text-secondary-dark mb-1">Duração (min)</label>
                        <input type="number" id="duration" name="duration" placeholder="Ex: 60" required className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"/>
                    </div>
                </div>

                {error && <p className="text-red-400 text-xs text-center -mt-2 mb-2">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="w-full rounded-full bg-primary py-3 text-center font-bold text-background-dark disabled:bg-primary/50">{isSaving ? 'Adicionando...' : 'Adicionar'}</button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewServiceForm;