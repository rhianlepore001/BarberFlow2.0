import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Client, User } from '../types'; // Adicionado User
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils'; // Importa a nova função

interface ClientDetailsModalProps {
    client: Client;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, onClose, onSuccess, user }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(client.name);
    const [phone, setPhone] = useState(client.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        const { error: updateError } = await supabase
            .from('clients')
            .update({ name, phone })
            .eq('id', client.id);

        if (updateError) {
            console.error('Error updating client:', updateError);
            setError(`Erro ao salvar: ${updateError.message}`);
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };
    
    const handleDelete = async () => {
        if (!window.confirm(`Tem certeza que deseja remover o cliente ${client.name}? Todos os dados associados serão perdidos.`)) return;
        
        setIsSaving(true);
        setError(null);
        
        const { error: deleteError } = await supabase.from('clients').delete().eq('id', client.id);
        
        if (deleteError) {
            console.error('Error deleting client:', deleteError);
            setError(`Erro ao excluir: ${deleteError.message}`);
            setIsSaving(false);
        } else {
            onSuccess();
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-white">{isEditing ? 'Editar Cliente' : 'Detalhes do Cliente'}</h2>
            
            <div className="flex justify-center my-4">
                <img src={client.imageUrl || `https://ui-avatars.com/api/?name=${client.name}&background=${theme.themeColor}&color=101012`} alt={client.name} className="w-24 h-24 rounded-full object-cover border-2 border-card-dark" />
            </div>

            {isEditing ? (
                <form className="space-y-4" onSubmit={handleSave}>
                    <div>
                        <label htmlFor="client-name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome</label>
                        <input 
                            type="text" 
                            id="client-name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                        />
                    </div>
                    <div>
                        <label htmlFor="client-phone" className="block text-sm font-medium text-text-secondary-dark mb-1">Telefone</label>
                        <input 
                            type="tel" 
                            id="client-phone" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary ${theme.ringPrimary} focus:border-primary`}
                        />
                    </div>
                    
                    {error && <p className="text-red-400 text-xs text-center pt-1">{error}</p>}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditing(false)} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-full rounded-full ${theme.bgPrimary} py-3 text-center font-bold text-background-dark disabled:${theme.bgPrimary}/50`}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-background-dark p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-text-secondary-dark">Última Visita</p>
                        <p className="font-bold text-white">{client.lastVisit}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-text-secondary-dark">Total Gasto</p>
                        <p className={`font-bold ${theme.primary}`}>{formatCurrency(client.totalSpent || 0, user.country)}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-text-secondary-dark">Telefone</p>
                        <p className="font-bold text-white">{client.phone || 'Não informado'}</p>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditing(true)} className={`w-full rounded-full ${theme.bgPrimary}/20 py-3 text-center font-bold ${theme.primary} hover:${theme.bgPrimary}/30 transition-colors`}>
                            Editar
                        </button>
                        <button type="button" onClick={onClose} className="w-full rounded-full bg-gray-700 py-3 text-center font-bold text-white hover:bg-gray-600 transition-colors">
                            Fechar
                        </button>
                    </div>
                    <div className="!mt-2">
                        <button type="button" onClick={handleDelete} disabled={isSaving} className="w-full py-2 text-center font-semibold text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">Excluir Cliente</button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ClientDetailsModal;