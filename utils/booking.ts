// A URL base deve ser a URL onde o aplicativo está hospedado (será o iframe do AI Studio)
const BASE_URL = window.location.origin;

/**
 * Gera a URL de agendamento público para um barbeiro específico.
 * @param barberId O ID do membro da equipe.
 * @returns A URL completa para a página de agendamento.
 */
export const getPublicBookingUrl = (barberId: number): string => {
    // Simula a navegação para a view 'public-booking' com o ID do barbeiro
    return `${BASE_URL}/?view=public-booking&barberId=${barberId}`;
};