import React from 'react';
import type { CashFlowDay } from '../types';

interface BarProps {
    day: CashFlowDay;
    maxRevenue: number;
}

const Bar: React.FC<BarProps> = ({ day, maxRevenue }) => {
    const barHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

    return (
        <div className="group relative flex h-full w-full flex-col items-center justify-end gap-1.5">
            <div className="absolute -top-7 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 bg-background-dark px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                R${day.revenue.toFixed(2).replace('.',',')}
            </div>
            <div
                className={`w-full rounded-t transition-colors duration-300 ${day.isCurrent ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/60'}`}
                style={{ height: `${barHeight}%` }}
                aria-label={`Faturamento de ${day.revenue.toFixed(2)}`}
            ></div>
            <p className={`text-xs font-bold ${day.isCurrent ? 'text-primary' : 'text-text-secondary-dark'}`}>
                {day.day}
            </p>
        </div>
    );
};

interface CashFlowChartProps {
    data: CashFlowDay[];
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
    const totalRevenue = data.reduce((acc, day) => acc + day.revenue, 0);
    const maxRevenue = Math.max(...data.map(day => day.revenue), 1);

    return (
        <section>
            <div className="flex items-center justify-between px-4 pb-3 pt-6">
                <h3 className="text-xl font-bold tracking-tight text-white">Fluxo de Caixa da Semana</h3>
                <a className="text-sm font-semibold text-primary" href="#">Detalhes</a>
            </div>
            <div className="px-4">
                <div className="rounded-xl bg-card-dark p-4">
                     <div>
                        <p className="text-sm font-medium text-text-secondary-dark">Faturamento Total da Semana</p>
                        <p className="text-2xl font-extrabold text-white">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="mt-4 flex h-40 w-full items-end justify-between gap-2">
                        {data.map((day, index) => (
                            <Bar key={index} day={day} maxRevenue={maxRevenue} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CashFlowChart;