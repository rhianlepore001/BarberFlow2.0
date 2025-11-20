import React from 'react';
import { motion } from 'framer-motion';
import type { NavItemData, View, User } from '../types';
import { useTheme } from '../hooks/useTheme'; // Importa o hook
import { useShopLabels } from '../hooks/useShopLabels'; // Importa o novo hook

interface SidebarNavItemProps {
    item: NavItemData;
    isActive: boolean;
    onClick: () => void;
    theme: ReturnType<typeof useTheme>; // Adiciona theme
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ item, isActive, onClick, theme }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full text-left gap-3 px-4 py-3 rounded-lg transition-colors duration-200 relative ${
            isActive ? `${theme.bgPrimary} text-background-dark` : 'text-text-secondary-dark hover:bg-card-dark hover:text-white'
        }`}
        aria-current={isActive ? 'page' : undefined}
    >
        <span className="material-symbols-outlined">{item.icon}</span>
        <span className="font-semibold capitalize">{item.label}</span>
    </button>
);


interface SidebarProps {
    user: User;
    onLogout: () => void;
    openModal: (content: 'editProfile') => void;
    items: NavItemData[];
    activeView: View;
    setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, openModal, items, activeView, setActiveView }) => {
    const theme = useTheme(user); // Usa o hook de tema
    const shopLabels = useShopLabels(user.shopType); // Usa o novo hook
    
    return (
        <aside className="hidden md:flex flex-col w-64 bg-background-dark border-r border-card-dark fixed h-full p-4">
            <div className="flex items-center gap-3 mb-10 px-2">
                {/* Ícone neutro para FlowPro, cor dinâmica */}
                <span className={`material-symbols-outlined ${theme.primary} text-3xl`}>auto_awesome</span>
                <h1 className="text-2xl font-extrabold text-white">Flow<span className={theme.primary}>Pro</span></h1>
            </div>

            <nav className="flex-grow flex flex-col gap-2">
                {items.map((item) => (
                    <SidebarNavItem
                        key={item.id}
                        item={item}
                        isActive={activeView === item.id}
                        onClick={() => setActiveView(item.id)}
                        theme={theme} // Passa o tema para o item
                    />
                ))}
            </nav>
            
            <div className="mt-auto border-t border-card-dark pt-4">
                 <div className="group relative">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-dark transition-colors">
                        <img className="h-10 w-10 rounded-full object-cover" alt={user.name} src={user.imageUrl} />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{user.name}</p>
                            <p className="text-xs text-text-secondary-dark">{shopLabels.defaultTeamMemberRole}</p> {/* Usando rótulo dinâmico */}
                        </div>
                         <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                               <span className="material-symbols-outlined text-text-secondary-dark">more_vert</span>
                            </motion.div>
                        </div>
                    </div>
                    {/* Popover Menu */}
                    <div className="absolute bottom-full left-0 mb-2 w-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <div className="bg-card-dark rounded-lg shadow-lg border border-white/10 p-1">
                             <button 
                                onClick={() => openModal('editProfile')}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-background-dark rounded-md flex items-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                                Editar Perfil
                            </button>
                            <button 
                                onClick={onLogout}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-background-dark rounded-md flex items-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined text-base">logout</span>
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;