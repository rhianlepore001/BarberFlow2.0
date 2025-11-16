import { useMemo } from 'react';
import type { User } from '../types';

interface ShopLabels {
    rolePlaceholder: string;
    serviceNamePlaceholder: string;
    defaultTeamMemberRole: string;
    defaultServiceName: string;
    defaultAvatarName: string;
    shopTypeLabel: string;
    shopTypeEmoji: string;
}

export const useShopLabels = (shopType: User['shopType'] | null | undefined): ShopLabels => {
    return useMemo(() => {
        if (shopType === 'salao') {
            return {
                rolePlaceholder: 'Ex: Estilista, Manicure',
                serviceNamePlaceholder: 'Ex: Corte Feminino, Manicure',
                defaultTeamMemberRole: 'Estilista',
                defaultServiceName: 'Serviço de Beleza',
                defaultAvatarName: 'Salão',
                shopTypeLabel: 'Salão de Beleza',
                shopTypeEmoji: '✂️',
            };
        } else { // 'barbearia' or null/undefined
            return {
                rolePlaceholder: 'Ex: Barbeiro, Tatuador',
                serviceNamePlaceholder: 'Ex: Corte Masculino, Barba',
                defaultTeamMemberRole: 'Barbeiro',
                defaultServiceName: 'Serviço de Barbearia',
                defaultAvatarName: 'Barbearia',
                shopTypeLabel: 'Barbearia',
                shopTypeEmoji: '💈',
            };
        }
    }, [shopType]);
};