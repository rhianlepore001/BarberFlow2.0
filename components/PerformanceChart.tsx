
import React from 'react';
import type { PeriodData } from '../types';

interface PerformanceChartProps {
    data: PeriodData;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
    const trendData = data.revenueTrend;
    const maxVal = Math.max(...trendData, 1);
    
    const points = trendData.map((value, index) => {
        const x = (index / (trendData.length - 1)) * 100;
        const y = 100 - (value / maxVal) * 80; // 80% of height to leave space at top/bottom
        return `${x},${y}`;
    }).join(' ');

    const previousPeriodAverage = data.previousTotalRevenue / trendData.length;
    const previousLineY = 100 - (previousPeriodAverage / maxVal) * 80;

    return (
        <div className="bg-card-dark p-4 rounded-xl">
            <h3 className="font-bold text-white mb-1">Performance do Faturamento</h3>
            <p className="text-xs text-text-secondary-dark mb-4">Comparativo com período anterior</p>
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
                            <stop offset="0%" style={{ stopColor: '#E5A00D', stopOpacity: 0.4 }} />
                            <stop offset="100%" style={{ stopColor: '#E5A00D', stopOpacity: 0 }} />
                        </linearGradient>
                    </defs>
                    {/* Área sob a curva */}
                    <polygon points={`0,100 ${points} 100,100`} fill="url(#gradient)" />

                    {/* Linha do período atual */}
                    <polyline
                        fill="none"
                        stroke="#E5A00D"
                        strokeWidth="2"
                        points={points}
                    />
                </svg>
            </div>
             <div className="flex justify-center items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-primary rounded-full"></div>
                    <span className="text-text-secondary-dark">Período Atual</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-text-secondary-dark border-dashed border-t-2 border-text-secondary-dark"></div>
                    <span className="text-text-secondary-dark">Período Anterior</span>
                </div>
            </div>
        </div>
    );
};

export default PerformanceChart;
