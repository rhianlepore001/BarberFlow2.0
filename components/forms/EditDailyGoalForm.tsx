import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// import { supabase } from '../../lib/supabaseClient'; // Removido
import type { User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { mockUpdateSettings } from '../../lib/mockData'; // Usaremos para simular

interface EditDailyGoalFormProps {
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    currentGoal: number;
    user: User;
}

const EditDailyGoalForm: React.FC<EditDailyGoalFormProps> = ({ onClose, onSuccess, shopId, currentGoal, user }) => {
    const [dailyGoal, setDailyGoal] = useState(currentGoal.toString());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        const goalValue = parseFloat(dailyGoal);
        if (isNaN(goalValue) || goalValue < 0) {
            setError("A meta diária deve ser um valor numérico positivo.");
            setIsSaving(false);
            return;
        }
        
        // Simulação de salvamento de configurações
        mockUpdateSettings({ tenant_id: shopId, daily_goal: goalValue });
        
        // Simulação de sucesso
        setTimeout(() => {
            onSuccess();
        }, 500);
        setIsSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Definir Meta Diária</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="daily-goal" className="block text-sm font-medium text-text-secondary-dark mb-1">Valor da Meta (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        id="daily-goal" 
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(e.target.value)}
                        placeholder="Ex: 500.00" 
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
                        {isSaving ? 'Salvando...' : 'Salvar Meta'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditDailyGoalForm;