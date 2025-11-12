export interface User {
  name: string;
  imageUrl: string;
  shopName: string;
  shopId: number; // Adicionado shopId
  shopType: 'barbearia' | 'salao'; // Adicionado shopType
}

export type View = 'inicio' | 'agenda' | 'clientes' | 'caixa' | 'gestao' | 'analise';

export interface Stat {
  icon: string;
  value: string;
  label: string;
}

export interface Client {
  id: number;
  name: string;
  lastVisit: string; // Display value (e.g., "Há 3 dias")
  lastVisitRaw: string | null; // Raw DB value (ISO string)
  image_url: string; // Corresponde ao BD
  totalSpent?: number;
  phone?: string;
}

export interface Service {
    id: number;
    name: string;
    price: number;
    duration_minutes: number; // in minutes
    timesPerformed?: number;
}

export interface TeamMember {
    id: number;
    name: string;
    role: string;
    image_url: string; // Corresponde ao BD
    commissionRate: number; // Taxa de comissão (0.0 a 1.0)
    shop_id: number; // Adicionado shop_id para uso no agendamento público
    shopName?: string; // NOVO: Nome da loja para a tela pública
}

// O tipo Appointment agora reflete os dados obtidos com JOINs do Supabase.
export interface Appointment {
  id: number;
  startTime: string; // Deve ser uma string ISO completa
  duration_minutes: number; // em minutos
  barberId: number;
  clientId?: number;
  // services_json armazena os detalhes dos serviços selecionados
  services_json: Service[] | null; 
  // Propriedades aninhadas que virão da query com JOIN
  clients: Pick<Client, 'id' | 'name' | 'image_url'> | null;
  team_members: Pick<TeamMember, 'id' | 'name'> | null;
}


export interface CashFlowDay {
  day: string;
  revenue: number;
  isCurrent: boolean;
}

export interface NavItemData {
  id: View;
  icon: string;
  label: string;
}

export interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    barberName?: string; // Novo campo
}

export interface BarberFinancials {
    barberId: number;
    monthRevenue: number;
    commissionRate: number; // e.g., 0.4 for 40%
}

// Tipos para a nova tela de Análise
export interface PeriodData {
  totalRevenue: number;
  previousTotalRevenue: number;
  avgTicket: number;
  newClients: number;
  retentionRate: number;
  revenueTrend: number[];
  xAxisLabels: string[]; // NOVO: Rótulos para o eixo X (dias, semanas, meses)
  topServices: { name: string; value: string }[];
  topClients: { name: string; value: string }[];
}

export interface PerformanceData {
  week: PeriodData;
  month: PeriodData;
  year: PeriodData;
}