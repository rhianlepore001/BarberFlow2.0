import React from 'react';
import type { PeriodData, User } from '../types';
import Tooltip from './Tooltip';
import { useTheme } from '../hooks/useTheme';

interface PerformanceChartProps {
    data: PeriodData;
    user: User; // Adiciona user para obter o tema
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, user }) => {
    const theme = useTheme(user);
    const trendData = data.revenueTrend;
    const maxVal = Math.max(...trendData, 1);
    
    const points = trendData.map((value, index) => {
        const x = (index / (trendData.length - 1)) * 100;
        const y = 100 - (value / maxVal) * 80; // 80% of height to leave space at top/bottom
        return `${x},${y}`;
    }).join(' ');

    const previousPeriodAverage = data.previousTotalRevenue / trendData.length;
    const previousLineY = 100 - (previousPeriodAverage / maxVal) * 80;
    
    const tooltipContent = "Este gráfico mostra a evolução da sua receita ao longo do período selecionado (linha primária) e compara com a média de receita do período anterior (linha tracejada). O objetivo é identificar tendências de crescimento ou queda.";

    return (
        <div className="bg-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-text-primary">Performance do Faturamento</h3>
                <Tooltip content={tooltipContent}>
                    <span className="material-symbols-outlined text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">info</span>
                </Tooltip>
            </div>
            <p className="text-xs text-text-secondary mb-4">Comparativo com período anterior</p>
            <div className="h-40 w-full">
                 <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Linha do período anterior (tracejada) */}
                    <line 
                        x1="0" y1={previousLineY} 
                        x2="100" y2={previousLineY} 
                        stroke="#A0A0A0" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                    />
                    {/* Gradiente para a área sob a curva */}
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: theme.themeColor, stopOpacity: 0.4 }} />
                            <stop offset="100%" style={{ stopColor: theme.themeColor, stopOpacity: 0 }} />
                        </linearGradient>
                    </defs>
                    {/* Área sob a curva */}
                    <polygon points={`0,100 ${points} 100,100`} fill="url(#gradient)" />

                    {/* Linha do período atual */}
                    <polyline
                        fill="none"
                        stroke={theme.themeColor}
                        strokeWidth="2"
                        points={points}
                    />
                </svg>
            </div>
            
            {/* Rótulos do Eixo X */}
            <div className="flex justify-between items-center mt-2 text-xs text-text-secondary">
                {data.xAxisLabels.map((label, index) => (
                    <span key={index} className="w-1/7 text-center truncate">
                        {label}
                    </span>
                ))}
            </div>
            
             <div className="flex justify-center items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-0.5 ${theme.bgPrimary} rounded-full`}></div>
                    <span className="text-text-secondary">Período Atual</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-text-secondary border-dashed border-t-2 border-text-secondary"></div>
                    <span className="text-text-secondary">Média Anterior</span>
                </div>
            </div>
        </div>
    );
};

export default PerformanceChart;