import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { User } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface EditWorkingHoursFormProps {
    onClose: () => void;
    onSuccess: () => void;
    shopId: number; // Adicionado shopId
    user: User;
}

const ALL_DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const DAY_LABELS: Record<string, string> = { seg: 'S', ter: 'T', qua: 'Q', qui: 'Q', sex: 'S', sab: 'S', dom: 'D' };

const EditWorkingHoursForm: React.FC<EditWorkingHoursFormProps> = ({ onClose, onSuccess, shopId, user }) => {
    const [openDays, setOpenDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('20:00');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    useEffect(() => {
        const fetchSettings = async () => {
            // Busca as configurações para o shopId atual
            const { data, error } = await supabase.from('shop_settings').select('*').eq('shop_id', shopId).limit(1).single();
            if (data) {
                setOpenDays(data.open_days || []);
                setStartTime(data.start_time || '09:00');
                setEndTime(data.end_time || '20:00');
            }
            if (error && error.code !== 'PGRST116') { // Ignore "exact one row was not found"
                console.error("Error fetching settings:", error);
            }
            setLoading(false);
        };
        fetchSettings();
    }, [shopId]);
    
    const handleDayToggle = (day: string) => {
        setOpenDays(prev => {
            const newDays = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
            return newDays.sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        // Tenta buscar o ID da linha de settings existente para o shopId
        const { data: existingSettings } = await supabase.from('shop_settings').select('id').eq('shop_id', shopId).limit(1).single();
        
        const settingsData = {
            id: existingSettings ? existingSettings.id : undefined, // Se existir, usa o ID para UPDATE
            shop_id: shopId, // Garante que o shop_id está sempre presente
            open_days: openDays,
            start_time: startTime,
            end_time: endTime
        };

        const { error: dbError } = await supabase.from('shop_settings').upsert(settingsData, { onConflict: 'shop_id' });
        
        if (dbError) {
            console.error("Error saving settings:", dbError);
            setError(`Falha ao salvar: ${dbError.message}`);
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };

    if (loading) {
        return <div className="text-center p-8">Carregando configurações...</div>;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">Horário de Funcionamento</h2>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-text-secondary-dark mb-2 text-center">Dias da semana</label>
                    <div className="flex justify-between items-center bg-background-dark p-1 rounded-full">
                        {ALL_DAYS.map(day => (
                            <button 
                                type="button" 
                                key={day} 
                                onClick={() => handleDayToggle(day)}
                                className={`w-10 h-10 flex items-center justify-center font-bold rounded-full transition-colors text-sm ${openDays.includes(day) ? `${theme.bgPrimary} text-background-dark` : 'text-text-secondary-dark hover:bg-gray-700'}`}
                                aria-pressed={openDays.includes(day)}
                            >
                                {DAY_LABELS[day]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="w-1/2">
                        <label htmlFor="start-time" className="block text-sm font-medium text-text-secondary-dark mb-1">Início</label>
                        <input type="time" id="start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}/>
                    </div>
                    <div className="w-1/2">
                        <label htmlFor="end-time" className="block text-sm font-medium text-text-secondary-dark mb-1">Fim</label>
                        <input type="time" id="end-time" value={endTime} onChange={e => setEndTime(e.target.value)} className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}/>
                    </div>
                </div>

                {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditWorkingHoursForm;