// types.ts
export interface User {
  name: string;
  imageUrl: string;
  shopId: string; // UUID from tenants.id
  shopName: string; // from tenants.name
  shopType: 'barber' | 'beauty'; // from tenants.business_type
  currency: 'BRL' | 'EUR'; // Adicionado para internacionalização
  country: 'BR' | 'PT'; // Adicionado para internacionalização
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
    id: string;
    tenant_id: string;
    name: string;
    price: number;
    duration_minutes: number;
    category?: 'corte' | 'quimica' | 'tratamento' | 'barba' | 'outro';
    active: boolean;
}

export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    phone?: string;
    last_visit?: string; // Date
    lastVisitRaw?: string;
    lastVisit: string;
    total_spent?: number;
    totalSpent: number;
    tags?: string[];
    anamnese_data?: any; // JSONB
    visagism_data?: any; // JSONB
    imageUrl?: string;
}

export interface Appointment {
    id: string;
    tenant_id: string;
    clientId: string;
    service_id: string;
    barberId: string;
    startTime: string; // Timestamp
    end_time: string; // Timestamp
    status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'noshow';
    revenue_generated?: number;
    duration_minutes: number;
    services_json: Service[];
    // Propriedades aninhadas que virão da query com JOIN
    clients?: Pick<Client, 'id' | 'name' | 'imageUrl'>;
    team_members?: Pick<TeamMember, 'id' | 'name'>;
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
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    barberName?: string;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    image_url: string;
    commissionRate: number;
    shop_id: string;
    shopName?: string;
    shopType?: 'barber' | 'beauty';
}

export interface BarberFinancials {
    barberId: string;
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