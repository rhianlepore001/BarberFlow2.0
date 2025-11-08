import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import type { PeriodData } from '../types';

interface GeminiInsightCardProps {
    data: PeriodData;
    period: 'week' | 'month' | 'year';
}

const periodMap = {
    week: 'semanal',
    month: 'mensal',
    year: 'anual'
};

const GeminiInsightCard: React.FC<GeminiInsightCardProps> = ({ data, period }) => {
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateInsight = async () => {
        setIsLoading(true);
        setError(null);
        setInsight('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                Você é um consultor de negócios especialista em barbearias. Analise os seguintes dados de performance ${periodMap[period]} e forneça um resumo conciso (máximo 3 parágrafos) com insights e uma recomendação prática. Seja direto e profissional.

                **CONTEXTO CRÍTICO:** Os dados fornecidos refletem apenas o período de registro no sistema (BarberFlow). Se o faturamento anterior for zero ou muito baixo, **não conclua que o negócio está falido ou em crise**, mas sim que ele está em fase de **migração ou inicialização de dados** no aplicativo. Baseie sua análise na **tendência de crescimento** observada e na comparação entre os períodos.

                Dados:
                - Faturamento Total: R$ ${data.totalRevenue.toFixed(2)}
                - Faturamento Período Anterior: R$ ${data.previousTotalRevenue.toFixed(2)}
                - Ticket Médio: R$ ${data.avgTicket.toFixed(2)}
                - Novos Clientes: ${data.newClients}
                - Taxa de Retenção: ${data.retentionRate}%
                - Serviços mais populares: ${data.topServices.map(s => `${s.name} (${s.value})`).join(', ')}
                - Principais clientes: ${data.topClients.map(c => c.name).join(', ')}

                Forneça a análise em português do Brasil.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setInsight(response.text);

        } catch (err) {
            console.error("Error generating insight:", err);
            setError("Não foi possível gerar a análise. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card-dark p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                 <span className="material-symbols-outlined text-primary text-xl">psychology</span>
                 <h3 className="font-bold text-white">Insight com IA</h3>
            </div>
            
            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                       <div className="space-y-2">
                            <div className="h-4 bg-background-dark rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-background-dark rounded w-5/6 animate-pulse"></div>
                            <div className="h-4 bg-background-dark rounded w-3/4 animate-pulse"></div>
                        </div>
                    </motion.div>
                )}

                {error && (
                    <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-red-400">{error}</motion.p>
                )}

                {insight && !isLoading && (
                    <motion.p key="insight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-text-secondary-dark whitespace-pre-wrap leading-relaxed">{insight}</motion.p>
                )}

                {!insight && !isLoading && !error && (
                    <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                        <p className="text-sm text-text-secondary-dark mb-4">Receba uma análise inteligente do seu desempenho e dicas para crescer seu negócio.</p>
                        <button 
                            onClick={handleGenerateInsight}
                            className="bg-primary/20 text-primary font-bold py-2 px-5 rounded-full hover:bg-primary/30 transition-colors"
                        >
                            Gerar Análise
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GeminiInsightCard;