import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { TeamMember, User } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../lib/utils';

interface NewTransactionFormProps {
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

const NewTransactionForm: React.FC<NewTransactionFormProps> = ({ onClose, onSuccess, user }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            const { data } = await supabase.from('team_members').select('*').eq('tenant_id', user.tenant_id);
            setTeamMembers(data || []);
            setLoadingMembers(false);
        };
        fetchTeamMembers();
    }, [user.tenant_id]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        
        const type = formData.get('type') as 'income' | 'expense';
        const professionalId = type === 'income' ? (formData.get('barber') as string) : null;
        
        if (type === 'income' && !professionalId) {
            setError("Selecione um profissional para registrar a entrada.");
            setIsSaving(false);
            return;
        }

        const { error } = await supabase.from('transactions').insert({
            description: formData.get('description') as string,
            amount: parseFloat(formData.get('amount') as string),
            type: type,
            transaction_date: new Date().toISOString(),
            tenant_id: user.tenant_id,
            professional_id: professionalId,
        });

        if (error) {
            setError("Erro ao salvar a transação.");
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
            <h2 className="text-xl font-bold text-center text-text-primary">Nova Transação</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                 <div>
                    <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                    <input type="text" id="description" name="description" placeholder="Ex: Compra de produtos" required className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}/>
                </div>
                <div className="flex gap-3">
                    <div className="w-2/3">
                        <label htmlFor="amount" className="block text-sm font-medium text-text-secondary mb-1">Valor</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            id="amount" 
                            name="amount" 
                            placeholder={formatCurrency(0, user.currency)}
                            required 
                            className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary`}
                        />
                    </div>
                    <div className="w-1/3">
                        <label htmlFor="type" className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
                        <select 
                            id="type" 
                            name="type" 
                            value={transactionType}
                            onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
                            className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary h-[48px]`}
                        >
                            <option value="income">Entrada</option>
                            <option value="expense">Saída</option>
                        </select>
                    </div>
                </div>
                
                {transactionType === 'income' && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <label htmlFor="barber" className="block text-sm font-medium text-text-secondary mb-1">Profissional Responsável</label>
                        <select 
                            id="barber" 
                            name="barber" 
                            required={transactionType === 'income'}
                            disabled={loadingMembers}
                            className={`w-full bg-background border-2 border-card rounded-full py-3 px-4 text-text-primary focus:ring-2 ${theme.ringPrimary} focus:border-primary disabled:opacity-50`}
                        >
                            <option value="" disabled>Selecione o profissional</option>
                            {teamMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </motion.div>
                )}

                {error && <p className="text-red-500 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button type="submit" disabled={isSaving} className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background disabled:${theme.bgPrimary}/50`}>{isSaving ? 'Adicionando...' : 'Adicionar'}</button>
                </div>
            </form>
        </motion.div>
    );
};

export default NewTransactionForm;