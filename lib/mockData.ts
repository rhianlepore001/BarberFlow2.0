import type { Appointment, Client, Service, TeamMember, CashFlowDay, PeriodData } from '../types';

// --- Mock Data ---

const BARBER_THEME_COLOR = 'EAB308';
const BEAUTY_THEME_COLOR = 'DB2777';

const mockServices: Service[] = [
    { id: 's1', tenant_id: 'mock-tenant-id', name: 'Corte Masculino', price: 50, duration_minutes: 45, active: true },
    { id: 's2', tenant_id: 'mock-tenant-id', name: 'Barba Completa', price: 40, duration_minutes: 30, active: true },
    { id: 's3', tenant_id: 'mock-tenant-id', name: 'Mechas', price: 250, duration_minutes: 120, active: true },
    { id: 's4', tenant_id: 'mock-tenant-id', name: 'Manicure', price: 35, duration_minutes: 60, active: true },
];

const mockTeamMembers: TeamMember[] = [
    { id: 't1', name: 'João Barbeiro', role: 'Barbeiro', image_url: `https://ui-avatars.com/api/?name=Joao+Barbeiro&background=${BARBER_THEME_COLOR}&color=101012`, commissionRate: 0.5, shop_id: 'mock-tenant-id' },
    { id: 't2', name: 'Maria Estilista', role: 'Estilista', image_url: `https://ui-avatars.com/api/?name=Maria+Estilista&background=${BEAUTY_THEME_COLOR}&color=101012`, commissionRate: 0.6, shop_id: 'mock-tenant-id' },
    { id: 't3', name: 'Pedro Tatuador', role: 'Tatuador', image_url: `https://ui-avatars.com/api/?name=Pedro+Tatuador&background=${BARBER_THEME_COLOR}&color=101012`, commissionRate: 0.4, shop_id: 'mock-tenant-id' },
];

const mockClients: Client[] = [
    { id: 'c1', tenant_id: 'mock-tenant-id', name: 'Lucas Silva', phone: '11987654321', lastVisit: 'Há 3 dias', lastVisitRaw: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), totalSpent: 1200, imageUrl: `https://ui-avatars.com/api/?name=Lucas+Silva&background=${BARBER_THEME_COLOR}&color=101012` },
    { id: 'c2', tenant_id: 'mock-tenant-id', name: 'Ana Souza', phone: '11999998888', lastVisit: 'Há 45 dias', lastVisitRaw: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), totalSpent: 80, imageUrl: `https://ui-avatars.com/api/?name=Ana+Souza&background=${BEAUTY_THEME_COLOR}&color=101012` },
    { id: 'c3', tenant_id: 'mock-tenant-id', name: 'Rafaela Costa', phone: '11911112222', lastVisit: 'Hoje', lastVisitRaw: new Date().toISOString(), totalSpent: 150, imageUrl: `https://ui-avatars.com/api/?name=Rafaela+Costa&background=${BEAUTY_THEME_COLOR}&color=101012` },
    { id: 'c4', tenant_id: 'mock-tenant-id', name: 'Bruno Mendes', phone: '11933334444', lastVisit: 'Há 10 dias', lastVisitRaw: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), totalSpent: 1500, imageUrl: `https://ui-avatars.com/api/?name=Bruno+Mendes&background=${BARBER_THEME_COLOR}&color=101012` },
];

const mockAppointments: Appointment[] = [
    {
        id: 'a1', tenant_id: 'mock-tenant-id', clientId: 'c1', service_id: 's1', barberId: 't1', startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), duration_minutes: 45, status: 'confirmed',
        services_json: [mockServices[0]],
        clients: mockClients[0],
        team_members: mockTeamMembers[0],
    },
    {
        id: 'a2', tenant_id: 'mock-tenant-id', clientId: 'c3', service_id: 's3', barberId: 't2', startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), duration_minutes: 120, status: 'confirmed',
        services_json: [mockServices[2]],
        clients: mockClients[2],
        team_members: mockTeamMembers[1],
    },
    {
        id: 'a3', tenant_id: 'mock-tenant-id', clientId: 'c4', service_id: 's2', barberId: 't1', startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), duration_minutes: 30, status: 'confirmed',
        services_json: [mockServices[1]],
        clients: mockClients[3],
        team_members: mockTeamMembers[0],
    },
];

const mockTransactions: CashFlowDay[] = [
    { day: 'SEG', revenue: 450, isCurrent: false },
    { day: 'TER', revenue: 620, isCurrent: false },
    { day: 'QUA', revenue: 300, isCurrent: false },
    { day: 'QUI', revenue: 780, isCurrent: true },
    { day: 'SEX', revenue: 0, isCurrent: false },
    { day: 'SAB', revenue: 0, isCurrent: false },
    { day: 'DOM', revenue: 0, isCurrent: false },
];

const mockAnalysisData: PeriodData = {
    totalRevenue: 2500,
    previousTotalRevenue: 2200,
    avgTicket: 85.5,
    newClients: 15,
    retentionRate: 78,
    revenueTrend: [300, 450, 600, 550, 600],
    xAxisLabels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'],
    topServices: [{ name: 'Corte', value: '50x' }, { name: 'Barba', value: '30x' }, { name: 'Mechas', value: '5x' }],
    topClients: [{ name: 'Lucas Silva', value: 'R$ 1.200,00' }, { name: 'Bruno Mendes', value: 'R$ 1.500,00' }],
};

// --- Funções de Acesso (Simulando Supabase) ---

export const getMockAppointments = () => mockAppointments;
export const getMockClients = () => mockClients;
export const getMockTeamMembers = () => mockTeamMembers;
export const getMockServices = () => mockServices;
export const getMockCashFlow = () => mockTransactions;
export const getMockAnalysisData = () => mockAnalysisData;

// Simulação de CRUD (apenas para que os formulários funcionem)
export const mockCreateAppointment = (data: any) => {
    console.log("Mock: Novo Agendamento Criado", data);
    // Adiciona um novo agendamento mockado para simular a atualização da lista
    const newAppt: Appointment = {
        id: `a${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        clientId: 'c1',
        service_id: 's1',
        barberId: 't1',
        startTime: new Date().toISOString(),
        duration_minutes: 60,
        status: 'confirmed',
        services_json: [{ id: 's1', tenant_id: 'mock-tenant-id', name: 'Novo Serviço', price: 50, duration_minutes: 60, active: true }],
        clients: mockClients[0],
        team_members: mockTeamMembers[0],
    };
    mockAppointments.unshift(newAppt);
};

export const mockCreateClient = (data: any) => {
    console.log("Mock: Novo Cliente Criado", data);
    const newClient: Client = {
        id: `c${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        name: data.name,
        phone: data.phone,
        lastVisit: 'Hoje',
        lastVisitRaw: new Date().toISOString(),
        totalSpent: 0,
        imageUrl: `https://ui-avatars.com/api/?name=${data.name.replace(' ', '+')}&background=${BARBER_THEME_COLOR}&color=101012`,
    };
    mockClients.unshift(newClient);
};

export const mockCreateTransaction = (data: any) => {
    console.log("Mock: Nova Transação Criada", data);
};

export const mockDeleteTransaction = (id: string) => {
    console.log("Mock: Transação Deletada", id);
};

export const mockDeleteClient = (id: string) => {
    console.log("Mock: Cliente Deletado", id);
};

export const mockUpdateClient = (id: string, data: any) => {
    console.log("Mock: Cliente Atualizado", id, data);
};

export const mockDeleteAppointment = (id: string) => {
    console.log("Mock: Agendamento Deletado", id);
};

export const mockUpdateAppointment = (id: string, data: any) => {
    console.log("Mock: Agendamento Atualizado", id, data);
};

export const mockUpdateTeamMember = (id: string, data: any) => {
    console.log("Mock: Membro da Equipe Atualizado", id, data);
};

export const mockCreateTeamMember = (data: any) => {
    console.log("Mock: Novo Membro da Equipe Criado", data);
};

export const mockCreateService = (data: any) => {
    console.log("Mock: Novo Serviço Criado", data);
};

export const mockUpdateSettings = (data: any) => {
    console.log("Mock: Configurações Atualizadas", data);
};