import React from 'react';
import type { Stat } from '../types';

interface StatCardProps {
    stat: Stat;
}

const StatCard: React.FC<StatCardProps> = ({ stat }) => (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-card-dark p-3 text-center">
        <span className="material-symbols-outlined text-3xl text-primary">{stat.icon}</span>
        <p className="text-lg font-bold">{stat.value}</p>
        <p className="text-xs font-medium text-text-secondary-dark">{stat.label}</p>
    </div>
);


interface StatsGridProps {
    stats: Stat[];
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => (
                <StatCard key={index} stat={stat} />
            ))}
        </div>
    );
};

export default StatsGrid;
