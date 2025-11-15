import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import type { Transaction, User } from '../types';
import { useTheme } from '../hooks/useTheme';

interface TransactionItemProps {
    transaction: Transaction;
    onDeleteSuccess: () => void;
    user: User;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onDeleteSuccess, user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme(user);

    const description = transaction.type === 'income' && transaction.barberName
        ? `${transaction.description} (${transaction.barberName.split(' ')[0]})`
        : transaction.description;
        
    const amountDisplay = transaction.type === 'income' 
        ? `+R$${transaction.amount.toFixed(2)}` 
        : `-R$${transaction.amount.toFixed(2)}`;
        
    const amountColor = transaction.type === 'income' ? 'text-green-400' : 'text-red-400';
    const iconBg = transaction.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500';
    const iconName = transaction.type === 'income' ? 'arrow_downward' : 'arrow_upward';

    const handleDelete = async () => {
        if (!window.confirm(`Tem certeza que deseja remover a transação: ${description} (${amountDisplay})?`)) {
            setIsMenuOpen(false);
            return;
        }
        
        setIsDeleting(true);
        setError(null);
        setIsMenuOpen(false);

        const { error: deleteError } = await supabase.from('transactions').delete().eq('id', transaction.id);

        if (deleteError) {
            console.error("Error deleting transaction:", deleteError);
            setError(`Falha ao remover: ${deleteError.message}`);
            setIsDeleting(false);
        } else {
            onDeleteSuccess();
        }
    };

    return (
        <motion.div 
            layout
            className="flex items-center gap-4 rounded-xl bg-card-dark p-3 relative"
        >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
               <span className="material-symbols-outlined">{iconName}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{description}</p>
                <p className="text-sm text-text-secondary-dark">{transaction.date}</p>
            </div>
            
            <div className="flex items-center gap-2">
                {isDeleting ? (
                    <span className="text-sm text-text-secondary-dark">Removendo...</span>
                ) : (
                    <p className={`font-bold ${amountColor}`}>{amountDisplay}</p>
                )}
                
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        className="text-text-secondary-dark hover:text-white transition-colors p-1 rounded-full"
                        aria-label="Opções da transação"
                        disabled={isDeleting}
                    >
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute top-full right-0 mt-1 w-40 bg-background-dark rounded-lg shadow-lg border border-white/10 z-20"
                            >
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                    Remover
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {error && <p className="absolute bottom-0 left-0 w-full text-red-400 text-xs text-center bg-card-dark/90 p-1 rounded-b-xl">{error}</p>}
        </motion.div>
    );
};

export default memo(TransactionItem);