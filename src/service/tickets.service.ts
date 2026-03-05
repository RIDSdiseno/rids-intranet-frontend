const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000/api';

export interface TicketData {
  subject: string;
  description: string;
  email: string;
}

export async function createTicket(data: TicketData) {
  const res = await fetch(`${API_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) throw new Error('Falló la creación del ticket');
  return res.json();
}

export async function listTickets() {
  const res = await fetch(`${API_URL}/tickets`);
  
  if (!res.ok) throw new Error('Falló la obtención de tickets');
  return res.json();
}