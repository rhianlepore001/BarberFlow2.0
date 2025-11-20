import React from 'react';
import { motion } from 'framer-motion';
import type { NavItemData, View, User } from '../types';
import { useTheme } from '../hooks/useTheme'; // Importa o hook

interface NavItemProps {
    item: NavItemData;
    isActive: boolean;
    onClick: () => void;
    theme: ReturnType<typeof useTheme>;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, onClick, theme }) => (
    <motion.button
        onClick={onClick}
        className={`flex flex-col items-center gap-1.5 transition-colors duration-200 relative pt-2 pb-1 w-1/5 ${isActive ? theme.primary : 'text-text-secondary'}`}
        whileTap={{ scale: 0.9 }}
        aria-current={isActive ? 'page' : undefined}
    >
        <span className="material-symbols-outlined">{item.icon}</span>
        <span className="text-xs font-semibold capitalize">{item.label}</span>
        {isActive && (
            <motion.div
                layoutId="active-nav-indicator"
                className={`absolute -top-0.5 h-1 w-8 rounded-full ${theme.bgPrimary}`}
            />
        )}
    </motion.button>
);


interface BottomNavProps {
    items: NavItemData[];
    activeView: View;
    setActiveView: (view: View) => void;
    user: User; // Adiciona user para obter o tema
}

const BottomNav: React.FC<BottomNavProps> = ({ items, activeView, setActiveView, user }) => {
    const theme = useTheme(user);
    
    return (
        <nav className="fixed bottom-0 left-0 z-30 w-full border-t border-card bg-background/80 backdrop-blur-sm md:hidden">
            <div className="flex h-20 items-center justify-around px-2">
                {items.map((item) => (
                    <NavItem 
                        key={item.id} 
                        item={item} 
                        isActive={activeView === item.id}
                        onClick={() => setActiveView(item.id)}
                        theme={theme}
                    />
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;