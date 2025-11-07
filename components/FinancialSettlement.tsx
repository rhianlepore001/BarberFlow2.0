import React from 'react';
import type { BarberFinancials, TeamMember } from '../types';

interface FinancialSettlementProps {
    financials: BarberFinancials[];
    team: TeamMember[];
}

const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const FinancialSettlement: React.FC<FinancialSettlementProps> = ({ financials, team }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h4 className="text-lg font-bold">Acerto Mensal</h4>
                {/* Ação 'Ver Histórico' sem funcionalidade por enquanto, mantendo o placeholder */}
                <a className="text-sm font-semibold text-primary" href="#">Ver Histórico</a>
            </div>
            <div className="space-y-3">
                {financials.length === 0 ? (
                    <div className="rounded-xl bg-card-dark p-4 text-center text-text-secondary-dark">
                        Nenhum faturamento registrado este mês para acerto.
                    </div>
                ) : (
                    financials.map(fin => {
                        const barber = team.find(t => t.id === fin.barberId);
                        if (!barber) return null;

                        const shopCommission = fin.monthRevenue * (1 - fin.commissionRate);
                        const barberPayment = fin.monthRevenue * fin.commissionRate;
                        const shopPercentage = (100 - fin.commissionRate * 100).toFixed(0);
                        const barberPercentage = (fin.commissionRate * 100).toFixed(0);

                        return (
                            <div key={fin.barberId} className="rounded-xl bg-card-dark p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={barber.imageUrl} alt={barber.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-bold text-white">{barber.name}</p>
                                        <p className="text-sm text-text-secondary-dark">Faturamento Total: {formatCurrency(fin.monthRevenue)}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
                                    <div className="flex justify-between">
                                        <p className="text-text-secondary-dark">Comissão da Barbearia ({shopPercentage}%)</p>
                                        <p className="font-semibold text-red-400">-{formatCurrency(shopCommission)}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-text-secondary-dark">Valor a Pagar ({barberPercentage}%)</p>
                                        <p className="font-bold text-lg text-green-400">{formatCurrency(barberPayment)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default FinancialSettlement;