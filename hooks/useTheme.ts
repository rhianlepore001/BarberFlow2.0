import { useMemo } from 'react';
import type { User } from '../types';

// Define as classes de tema para Barbearia (Laranja) e Salão (Violeta)
const THEMES = {
    barbearia: {
        // Classes de texto e borda
        primary: 'text-primary',
        borderPrimary: 'border-primary',
        ringPrimary: 'focus:ring-primary',
        // Classes de fundo
        bgPrimary: 'bg-primary',
        // Classes de gradiente (para o Saldo)
        gradientPrimary: 'from-primary/80 to-primary',
        // Classes de sombra
        shadowPrimary: 'shadow-primary/30',
        // Cor bruta (para UI Avatars)
        themeColor: '#E5A00D',
    },
    salao: {
        // Classes de texto e borda
        primary: 'text-salon-primary',
        borderPrimary: 'border-salon-primary',
        ringPrimary: 'focus:ring-salon-primary',
        // Classes de fundo
        bgPrimary: 'bg-salon-primary',
        // Classes de gradiente (para o Saldo)
        gradientPrimary: 'from-salon-primary/80 to-salon-primary',
        // Classes de sombra
        shadowPrimary: 'shadow-salon-primary/30',
        // Cor bruta (para UI Avatars)
        themeColor: '#8A2BE2',
    },
};

/**
 * Hook para obter as classes de tema dinâmico com base no tipo de loja do usuário.
 * @param user O objeto User, que contém shopType.
 * @returns Um objeto com classes Tailwind dinâmicas.
 */
export const useTheme = (user: User | null) => {
    return useMemo(() => {
        const shopType = user?.shopType || 'barbearia';
        return THEMES[shopType];
    }, [user?.shopType]);
};