import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { useShopLabels } from '../../hooks/useShopLabels';
import { formatCurrency } from '../../lib/utils';
import { mockCreateService } from '../../lib/mockData';

interface NewServiceFormProps {
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    user: User;
}

const NewServiceForm: React.FC<NewServiceFormProps> = ({ onClose, onSuccess, shopId, user }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);
    const shopLabels = useShopLabels(user.shopType);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const serviceData = {
            name: formData.get('service-name') as string,
            price: parseFloat(formData.get('price') as string),
            duration_minutes: parseInt(formData.get('duration') as string),
            tenant_id: shopId,
            currency: user.currency,
        };

        // Simulação de salvamento
        mockCreateService(serviceData);
        
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
            <h2 className="text-xl font-bold text-center text-text-primary">Novo Serviço</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                 <div>
                    <label htmlFor="service-name" className="block text-sm font-medium text-text-secondary mb-1">Nome do Serviço</label>
                    <input 
                        type="text" 
                        id="service-name" 
                        name="service-name" 
                        placeholder={shopLabels.serviceNamePlaceholder}
                        required 
                        className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                    />
                </div>
                <div className="flex gap-3">
                    <div className="w-1/2">
                        <label htmlFor="price" className="block text-sm font-medium text-text-secondary mb-1">Preço</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            id="price" 
                            name="price" 
                            placeholder={formatCurrency(0, user.currency)}
                            required 
                            className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                        />
                    </div>
                    <div className="w-1/2">
                         <label htmlFor="duration" className="block text-sm font-medium text-text-secondary mb-1">Duração (min)</label>
                        <input type="number" id="duration" name="duration" placeholder="Ex: 60" required className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}/>
                    </div>
                </div>

                {error && <p className="text-red-500 text-xs text-center -mt-2 mb-2">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background disabled:${theme.bgPrimary}/50`}>{isSaving ? 'Adicionando...' : 'Adicionar'}</button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewServiceForm;