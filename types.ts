// types.ts
export interface User {
  name: string;
  imageUrl: string;
  tenant: Tenant; // Aninhando os detalhes do tenant
}

export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string;
  business_type: 'barber' | 'beauty';
  theme_config?: any; // JSONB
}

export type View = 'inicio' | 'agenda' | 'clientes' | 'caixa' | 'gestao' | 'analise';

export interface Service {
    id: string; // UUID
    tenant_id: string;
    name: string;
    price: number;
    duration_minutes: number;
    category?: 'corte' | 'quimica' | 'tratamento' | 'barba' | 'outro';
    active: boolean;
}

export interface Client {
    id: string; // UUID
    tenant_id: string;
    name: string;
    phone?: string;
    last_visit?: string; // Date
    total_spent?: number;
    tags?: string[];
    anamnese_data?: any; // JSONB
    visagism_data?: any; // JSONB
}

export interface Appointment {
    id: string; // UUID
    tenant_id: string;
    client_id: string;
    service_id: string;
    professional_id: string;
    start_time: string; // Timestamp
    end_time: string; // Timestamp
    status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'noshow';
    revenue_generated?: number;
    // Propriedades aninhadas que virão da query com JOIN
    clients?: Pick<Client, 'id' | 'name'>;
    services?: Pick<Service, 'id' | 'name'>;
}

export interface PortfolioPost {
    id: string; // UUID
    tenant_id: string;
    image_url: string;
    caption_ai?: string;
    likes_count: number;
    is_public_showcase: boolean;
}

// Tipos utilitários que podem ser mantidos/adaptados
export interface NavItemData {
  id: View;
  icon: string;
  label: string;
}

export interface Stat {
  icon: string;
  value: string;
  label: string;
}

export interface CashFlowDay {
  day: string;
  revenue: number;
  isCurrent: boolean;
}

export interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    barberName?: string;
}

export interface TeamMember {
    id: number;
    name: string;
    role: string;
    image_url: string;
    commissionRate: number;
    shop_id: number;
    shopName?: string;
    shopType?: 'barber' | 'beauty';
}

export interface BarberFinancials {
    barberId: number;
    monthRevenue: number;
    commissionRate: number;
}

export interface PeriodData {
  totalRevenue: number;
  previousTotalRevenue: number;
  avgTicket: number;
  newClients: number;
  retentionRate: number;
  revenueTrend: number[];
  xAxisLabels: string[];
  topServices: { name: string; value: string }[];
  topClients: { name: string; value: string }[];
}