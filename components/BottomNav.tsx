import React from 'react';
import { motion } from 'framer-motion';
import type { NavItemData, View } from '../types';

interface NavItemProps {
    item: NavItemData;
    isActive: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, onClick }) => (
    <motion.button
        onClick={onClick}
        className={`flex flex-col items-center gap-1.5 transition-colors duration-200 relative pt-2 pb-1 w-1/5 ${isActive ? 'text-primary' : 'text-text-secondary-dark'}`}
        whileTap={{ scale: 0.9 }}
        aria-current={isActive ? 'page' : undefined}
    >
        <span className="material-symbols-outlined">{item.icon}</span>
        <span className="text-xs font-semibold capitalize">{item.label}</span>
        {isActive && (
            <motion.div
                layoutId="active-nav-indicator"
                className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
            />
        )}
    </motion.button>
);


interface BottomNavProps {
    items: NavItemData[];
    activeView: View;
    setActiveView: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ items, activeView, setActiveView }) => {
    return (
        <nav className="fixed bottom-0 left-0 z-30 w-full border-t border-card-dark bg-background-dark/80 backdrop-blur-sm md:hidden">
            <div className="flex h-20 items-center justify-around px-2">
                {items.map((item) => (
                    <NavItem 
                        key={item.id} 
                        item={item} 
                        isActive={activeView === item.id}
                        onClick={() => setActiveView(item.id)}
                    />
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
