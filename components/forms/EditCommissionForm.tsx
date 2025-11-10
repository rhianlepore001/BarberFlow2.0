import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { TeamMember, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface EditCommissionFormProps {
    member: TeamMember;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

const EditCommissionForm: React.FC<EditCommissionFormProps> = ({ member, onClose, onSuccess, user }) => {
    // Converte a taxa de 0.5 (50%) para 50 para exibição no input
    const [commissionRate, setCommissionRate] = useState((member.commissionRate * 100).toString());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        const ratePercentage = parseFloat(commissionRate);
        if (isNaN(ratePercentage) || ratePercentage < 0 || ratePercentage > 100) {
            setError("A comissão deve ser um valor entre 0 e 100.");
            setIsSaving(false);
            return;
        }
        
        // Converte de volta para o formato decimal (ex: 50 -> 0.5)
        const rateDecimal = ratePercentage / 100;

        const { error: updateError } = await supabase
            .from('team_members')
            .update({ commission_rate: rateDecimal })
            .eq('id', member.id);
            
        if (updateError) {
            console.error("Error updating commission rate:", updateError);
            setError(`Erro ao atualizar a comissão: ${updateError.message}`);
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
            <h2 className="text-xl font-bold text-center text-white">Comissão de {member.name}</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <label htmlFor="commission" className="block text-sm font-medium text-text-secondary-dark mb-1">Taxa de Comissão (%)</label>
                        <input 
                            type="number" 
                            id="commission" 
                            name="commission" 
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(e.target.value)}
                            placeholder="Ex: 50" 
                            min="0"
                            max="100"
                            required 
                            className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                        />
                    </div>
                    <span className={`text-3xl font-bold ${theme.primary}`}>%</span>
                </div>
                
                {error && <p className="text-red-400 text-xs text-center -mt-2 mb-2">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Comissão'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditCommissionForm;