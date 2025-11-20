import React from 'react';
import type { Stat, User } from '../types';
import { useTheme } from '../hooks/useTheme';

interface StatCardProps {
    stat: Stat;
    theme: ReturnType<typeof useTheme>;
}

const StatCard: React.FC<StatCardProps> = ({ stat, theme }) => (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-card p-3 text-center">
        <i className={`fa-solid fa-${stat.icon} text-3xl ${theme.primary}`}></i>
        <p className="text-lg font-bold text-text-primary">{stat.value}</p>
        <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
    </div>
);


interface StatsGridProps {
    stats: Stat[];
    user: User; // Adiciona user para obter o tema
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, user }) => {
    const theme = useTheme(user);
    
    return (
        <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => (
                <StatCard key={index} stat={stat} theme={theme} />
            ))}
        </div>
    );
};

export default StatsGrid;