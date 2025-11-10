import { useMemo } from 'react';
import type { User } from '../types';

// Define as classes de tema estático (Azul Royal)
const THEME = {
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
    // Cor bruta (para UI Avatars) - Usaremos um azul neutro para avatares se não houver imagem
    themeColor: '4169E1', // Azul Royal
};

/**
 * Hook para obter as classes de tema estático (Azul Royal).
 * @param user O objeto User (mantido para compatibilidade de props, mas não usado para lógica de cor).
 * @returns Um objeto com classes Tailwind estáticas.
 */
export const useTheme = (user: User | null) => {
    // O useMemo é mantido, mas o retorno é estático
    return useMemo(() => {
        return THEME;
    }, [user?.shopType]); // Mantemos user?.shopType na dependência para garantir que o componente que o usa seja re-renderizado se o user mudar, embora o valor retornado seja fixo.
};