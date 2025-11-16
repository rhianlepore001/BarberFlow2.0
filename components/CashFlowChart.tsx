import React from 'react';
import type { CashFlowDay, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../lib/utils'; // Importa a nova função

interface BarProps {
    day: CashFlowDay;
    maxRevenue: number;
    theme: ReturnType<typeof useTheme>;
    user: User; // Adicionado para passar para formatCurrency
}

const Bar: React.FC<BarProps> = ({ day, maxRevenue, theme, user }) => {
    const barHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

    return (
        <div className="group relative flex h-full w-full flex-col items-center justify-end gap-1.5">
            <div className="absolute -top-7 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 bg-background-dark px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                {formatCurrency(day.revenue, user.currency)}
            </div>
            <div
                className={`w-full rounded-t transition-colors duration-300 ${day.isCurrent ? theme.bgPrimary : `${theme.bgPrimary}/30 group-hover:${theme.bgPrimary}/60`}`}
                style={{ height: `${barHeight}%` }}
                aria-label={`Faturamento de ${day.revenue.toFixed(2)}`}
            ></div>
            <p className={`text-xs font-bold ${day.isCurrent ? theme.primary : 'text-text-secondary-dark'}`}>
                {day.day}
            </p>
        </div>
    );
};

interface CashFlowChartProps {
    data: CashFlowDay[];
    onDetailsClick: () => void;
    user: User;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, onDetailsClick, user }) => {
    const theme = useTheme(user);
    const totalRevenue = data.reduce((acc, day) => acc + day.revenue, 0);
    const maxRevenue = Math.max(...data.map(day => day.revenue), 1);

    return (
        <div className="px-4">
            <div className="rounded-xl bg-card-dark p-4">
                 <div className="flex items-center justify-between pb-3">
                    <div>
                        <p className="text-sm font-medium text-text-secondary-dark">Faturamento Total</p>
                        <p className="text-2xl font-extrabold text-white">{formatCurrency(totalRevenue, user.currency)}</p>
                    </div>
                    <button onClick={onDetailsClick} className={`text-sm font-semibold ${theme.primary} hover:text-yellow-400 transition-colors`}>Detalhes</button>
                </div>
                <div className="mt-4 flex h-40 w-full items-end justify-between gap-2">
                    {data.map((day, index) => (
                        <Bar key={index} day={day} maxRevenue={maxRevenue} theme={theme} user={user} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CashFlowChart;