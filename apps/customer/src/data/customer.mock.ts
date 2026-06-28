import { CustomerDashboard } from '../types/customer';

export const mockDashboard: CustomerDashboard = {
  qrToken: 'mock-token',
  shortCode: 'MC-DEMO',
  progress: { business: 'Café Central', current: 7, goal: 10, reward: '1 café a elección' },
  rewards: [
    { id: 'r1', title: 'Café americano gratis', business: 'Café Central', status: 'available', expiresAt: '30 jul 2026' },
    { id: 'r2', title: '20% en tu próxima compra', business: 'Panadería Sur', status: 'available', expiresAt: '15 ago 2026' },
    { id: 'r3', title: 'Pastel individual', business: 'Dulce Barrio', status: 'used', usedAt: '18 jun 2026' },
    { id: 'r4', title: 'Jugo natural', business: 'Mercado Verde', status: 'expired', expiresAt: '01 jun 2026' },
  ],
  history: [
    { id: 'h1', business: 'Café Central', date: 'Hoy, 09:42', action: 'Compra registrada', progress: '+1 compra' },
    { id: 'h2', business: 'Panadería Sur', date: '26 jun, 18:10', action: 'Puntos acumulados', progress: '+120 puntos' },
    { id: 'h3', business: 'Dulce Barrio', date: '18 jun, 12:25', action: 'Recompensa utilizada', progress: 'Pastel individual' },
    { id: 'h4', business: 'Café Central', date: '12 jun, 08:55', action: 'Compra registrada', progress: '+1 compra' },
  ],
};
