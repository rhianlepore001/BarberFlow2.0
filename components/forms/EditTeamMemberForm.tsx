import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import type { TeamMember } from '../../types';

interface EditTeamMemberFormProps {
    member: TeamMember;
    onClose: () => void;
    onSuccess: () => void;
}

const EditTeamMemberForm: React.FC<EditTeamMemberFormProps> = ({ member, onClose, onSuccess }) => {
    const [name, setName] = useState(member.name);
    const [role, setRole] = useState(member.role);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        const memberData = { name, role };

        const { error: updateError } = await supabase.from('team_members').update(memberData).eq('id', member.id);
        if (updateError) {
            console.error("Error updating team member:", updateError);
            setError(`Erro ao atualizar: ${updateError.message}`);
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
            <h2 className="text-xl font-bold text-center text-white">Editar Membro</h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary-dark mb-1">Nome</label>
                    <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do profissional" 
                        required 
                        className="w-full bg-background-dark border-2 border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-primary focus:border-primary"
                    />
                </div>
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-text-secondary-dark mb-1">Função</label>
                    <input 
                        type="text" 
                        id="role" 
                        name="role" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Ex: Barbeiro" 
                        required 
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
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditTeamMemberForm;