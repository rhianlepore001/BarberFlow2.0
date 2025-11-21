// types.ts

// Tipo derivado para uso na UI, montado após o login
export interface User {
  id: string; // auth.users.id
  name: string;
  image_url: string;
  tenant_id: string;
  tenant_name: string;
  business_type: 'barbearia' | 'salao';
  currency: 'BRL' | 'EUR';
  country: 'BR' | 'PT';
}

export type View = 'inicio' | 'agenda' | 'clientes' | 'caixa' | 'gestao' | 'analise';

export interface Service {
    id: string;
    tenant_id: string;
    name: string;
    price: number;
    duration_minutes: number;
    active: boolean;
}

export interface Client {
    id: string;
    tenant_id: string;
    auth_user_id?: string;
    name: string;
    phone?: string;
    image_url?: string;
    last_visit?: string; // Date
    total_spent?: number;
    created_at: string;
}

export interface Appointment {
    id: string;
    tenant_id: string;
    client_id: string;
    professional_id: string;
    start_time: string; // Timestamp
    duration_minutes: number;
    services_json: Service[];
    status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'noshow';
    // Propriedades aninhadas que virão da query com JOIN
    clients?: Pick<Client, 'id' | 'name' | 'image_url'>;
    team_members?: Pick<TeamMember, 'id' | 'name'>;
}

export interface PortfolioPost {
    id: string;
    tenant_id: string;
    image_url: string;
    caption_ai?: string;
    likes_count: number;
    is_public_showcase: boolean;
}

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
    id: string;
    tenant_id: string;
    professional_id?: string;
    client_id?: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    transaction_date: string;
    team_members?: { name: string };
}

export interface TeamMember {
    id: string;
    tenant_id: string;
    auth_user_id?: string;
    name: string;
    role: string;
    image_url: string;
    commission_rate: number;
}

export interface BarberFinancials {
    professional_id: string;
    monthRevenue: number;
    commission_rate: number;
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

export interface ShopSettings {
    id: string;
    tenant_id: string;
    daily_goal: number;
    open_days: string[];
    start_time: string;
    end_time: string;
    settlement_day: number;
}