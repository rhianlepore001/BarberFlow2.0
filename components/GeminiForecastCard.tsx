import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import type { PeriodData } from '../types';

interface GeminiForecastCardProps {
    data: PeriodData;
    period: 'week' | 'month' | 'year';
}

const periodMap = {
    week: { current: 'semanal', next: 'próxima semana' },
    month: { current: 'mensal', next: 'próximo mês' },
    year: { current: 'anual', next: 'próximo ano' },
};

const GeminiForecastCard: React.FC<GeminiForecastCardProps> = ({ data, period }) => {
    const [forecast, setForecast] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateForecast = async () => {
        setIsLoading(true);
        setError(null);
        setForecast('');

        try {
            // O process.env.API_KEY é definido no vite.config.ts
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                Você é um analista financeiro sênior especializado em pequenos negócios como barbearias.
                Sua função é analisar os dados de faturamento ${periodMap[period].current} e fornecer uma previsão de faturamento para o(a) ${periodMap[period].next}.

                Dados de Faturamento:
                - Faturamento Total do Período Atual: R$ ${data.totalRevenue.toFixed(2)}
                - Faturamento Total do Período Anterior: R$ ${data.previousTotalRevenue.toFixed(2)}
                - Tendência de Receita (valores sequenciais): ${data.revenueTrend.join(', ')}

                Sua resposta DEVE seguir estritamente o seguinte formato, com duas linhas separadas por quebra de linha:
                1. Na primeira linha, apresente a previsão como um intervalo de valores. Exemplo: R$ X.XXX,XX - R$ Y.YYY,YY
                2. Na segunda linha, forneça uma justificativa curta e clara (1-2 frases) baseada na tendência observada e na comparação com o período anterior.

                Seja direto, use um tom profissional e encorajador. Forneça a análise em português do Brasil.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setForecast(response.text);

        } catch (err) {
            console.error("Error generating forecast:", err);
            setError("Não foi possível gerar a previsão. Verifique sua chave de API ou tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    // Divide a resposta em intervalo e texto, garantindo que não falhe se a IA retornar apenas uma linha
    const [forecastRange, ...rest] = forecast.split('\n');
    const forecastText = rest.join(' ').trim();

    return (
        <div className="bg-card-dark p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                 <span className="material-symbols-outlined text-primary text-xl">query_stats</span>
                 <h3 className="font-bold text-white">Previsão com IA</h3>
            </div>
            
            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-24">
                       <div className="flex items-center gap-2 text-sm text-text-secondary-dark">
                           <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           Analisando os números...
                       </div>
                    </motion.div>
                )}

                {error && (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center h-24 flex flex-col justify-center items-center">
                        <p className="text-sm text-red-400 mb-2">{error}</p>
                         <button 
                            onClick={handleGenerateForecast}
                            className="bg-primary/20 text-primary font-bold py-1 px-4 rounded-full hover:bg-primary/30 transition-colors text-sm"
                        >
                            Tentar Novamente
                        </button>
                    </motion.div>
                )}

                {forecast && !isLoading && (
                    <motion.div key="forecast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                        <p className="text-xs text-text-secondary-dark">Previsão para {periodMap[period].next}</p>
                        <p className="text-2xl font-extrabold text-primary my-1">{forecastRange}</p>
                        <p className="text-sm text-text-secondary-dark leading-relaxed whitespace-pre-wrap">{forecastText}</p>
                    </motion.div>
                )}

                {!forecast && !isLoading && !error && (
                    <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                        <p className="text-sm text-text-secondary-dark mb-4">Veja uma projeção do seu faturamento para o próximo período com base nos dados atuais.</p>
                        <button 
                            onClick={handleGenerateForecast}
                            className="bg-primary/20 text-primary font-bold py-2 px-5 rounded-full hover:bg-primary/30 transition-colors"
                        >
                            Gerar Previsão
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GeminiForecastCard;