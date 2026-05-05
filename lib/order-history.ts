const STORAGE_KEY = 'nimbus_order_history';
const MAX_ENTRIES = 20;

export interface OrderHistoryEntry {
  orderId: string;
  titleNumber: string;
  customerReference?: string;
  createdAt: string; // ISO string
}

function read(): OrderHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function write(entries: OrderHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addOrderToHistory(entry: OrderHistoryEntry): void {
  const existing = read().filter((e) => e.orderId !== entry.orderId);
  write([entry, ...existing].slice(0, MAX_ENTRIES));
}

export function getOrderHistory(): OrderHistoryEntry[] {
  return read();
}

export function removeOrderFromHistory(orderId: string): void {
  write(read().filter((e) => e.orderId !== orderId));
}
