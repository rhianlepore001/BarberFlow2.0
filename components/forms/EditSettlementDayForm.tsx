import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

interface EditSettlementDayFormProps {
    onClose: () => void;
    onSuccess: () => void;
    shopId: number;
}

const EditSettlementDayForm: React.FC<EditSettlementDayFormProps> = ({ onClose, onSuccess, shopId }) => {
    const [settlementDay, setSettlementDay] = useState('1');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase.from('shop_settings').select('settlement_day').eq('shop_id', shopId).limit(1).single();
            if (data && data.settlement_day !== null) {
                setSettlementDay(data.settlement_day.toString());
            }
            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching settings:", error);
            }
            setLoading(false);
        };
        fetchSettings();
    }, [shopId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        const dayValue = parseInt(settlementDay);
        if (isNaN(dayValue) || dayValue < 1 || dayValue > 28) {
            setError("O dia de acerto deve ser um número entre 1 e 28.");
            setIsSaving(false);
            return;
        }
        
        const { data: existingSettings } = await supabase.from('shop_settings').select('id').eq('shop_id', shopId).limit(1).single();
        
        const settingsData = {
            id: existingSettings ? existingSettings.id : undefined,
            shop_id: shopId,
            settlement_day: dayValue,
        };

        const { error: dbError } = await supabase.from('shop_settings').upsert(settingsData, { onConflict: 'shop_id' });
        
        if (dbError) {
            console.error("Error saving settlement day:", dbError);
            setError(`Falha ao salvar o dia de acerto: ${dbError.message}`);
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };

    if (loading) {
        return <div className="text-center p-8">Carregando...</div>;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Dia de Fechamento do Acerto</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <p className="text-sm text-text-secondary-dark text-center">
                    Defina o dia do mês em que o ciclo de acerto mensal da comissão dos barbeiros é fechado.
                    <br/>(Recomendamos um dia entre 1 e 28).
                </p>
                <div>
                    <label htmlFor="settlement-day" className="block text-sm font-medium text-text-secondary-dark mb-1">Dia do Mês</label>
                    <input 
                        type="number" 
                        id="settlement-day" 
                        value={settlementDay}
                        onChange={(e) => setSettlementDay(e.target.value)}
                        placeholder="Ex: 25" 
                        min="1"
                        max="28"
                        required
                        className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"
                    />
                </div>

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full rounded-full bg-primary py-3 text-center font-bold text-background-dark disabled:bg-primary/50"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Dia'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditSettlementDayForm;