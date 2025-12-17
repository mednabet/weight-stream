import { User, Product, ProductionLine, Terminal, Balance, ProductionTask, ProductionItem, LineStatus, WeightReading } from '@/types/production';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-admin-1',
    username: 'admin',
    email: 'admin@factory.local',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-super-1',
    username: 'supervisor',
    email: 'supervisor@factory.local',
    role: 'supervisor',
    isActive: true,
    mustChangePassword: false,
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-op-1',
    username: 'operator1',
    email: 'op1@factory.local',
    role: 'operator',
    isActive: true,
    mustChangePassword: false,
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'user-op-2',
    username: 'operator2',
    email: 'op2@factory.local',
    role: 'operator',
    isActive: true,
    mustChangePassword: true,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'user-op-3',
    username: 'operator3',
    email: 'op3@factory.local',
    role: 'operator',
    isActive: false,
    mustChangePassword: false,
    createdAt: '2024-02-15T00:00:00Z',
  },
];

// Mock Products
export const mockProducts: Product[] = [
  { id: 'prod-1', name: 'Pièce Standard A', reference: 'PSA-001', code: 'PSA-001', target_weight: 250, targetWeight: 250, tolerance_min: 245, tolerance_max: 255, minWeight: 245, maxWeight: 255, unit: 'g', tolerancePercent: 2 },
  { id: 'prod-2', name: 'Pièce Standard B', reference: 'PSB-002', code: 'PSB-002', target_weight: 500, targetWeight: 500, tolerance_min: 490, tolerance_max: 510, minWeight: 490, maxWeight: 510, unit: 'g', tolerancePercent: 2 },
  { id: 'prod-3', name: 'Composant Lourd', reference: 'CL-003', code: 'CL-003', target_weight: 1500, targetWeight: 1500, tolerance_min: 1470, tolerance_max: 1530, minWeight: 1470, maxWeight: 1530, unit: 'g', tolerancePercent: 2 },
  { id: 'prod-4', name: 'Micro-Composant', reference: 'MC-004', code: 'MC-004', target_weight: 50, targetWeight: 50, tolerance_min: 48, tolerance_max: 52, minWeight: 48, maxWeight: 52, unit: 'g', tolerancePercent: 4 },
  { id: 'prod-5', name: 'Assemblage Final', reference: 'AF-005', code: 'AF-005', target_weight: 2500, targetWeight: 2.5, tolerance_min: 2450, tolerance_max: 2550, minWeight: 2.45, maxWeight: 2.55, unit: 'kg', tolerancePercent: 2 },
  { id: 'prod-6', name: 'Pièce Moulée X', reference: 'PMX-006', code: 'PMX-006', target_weight: 180, targetWeight: 180, tolerance_min: 175, tolerance_max: 185, minWeight: 175, maxWeight: 185, unit: 'g', tolerancePercent: 2.8 },
  { id: 'prod-7', name: 'Support Métallique', reference: 'SM-007', code: 'SM-007', target_weight: 750, targetWeight: 750, tolerance_min: 735, tolerance_max: 765, minWeight: 735, maxWeight: 765, unit: 'g', tolerancePercent: 2 },
  { id: 'prod-8', name: 'Plaque Plastique', reference: 'PP-008', code: 'PP-008', target_weight: 120, targetWeight: 120, tolerance_min: 115, tolerance_max: 125, minWeight: 115, maxWeight: 125, unit: 'g', tolerancePercent: 4.2 },
  { id: 'prod-9', name: 'Boîtier Aluminium', reference: 'BA-009', code: 'BA-009', target_weight: 320, targetWeight: 320, tolerance_min: 312, tolerance_max: 328, minWeight: 312, maxWeight: 328, unit: 'g', tolerancePercent: 2.5 },
  { id: 'prod-10', name: 'Kit Complet', reference: 'KC-010', code: 'KC-010', target_weight: 5000, targetWeight: 5, tolerance_min: 4900, tolerance_max: 5100, minWeight: 4.9, maxWeight: 5.1, unit: 'kg', tolerancePercent: 2 },
];

// Mock Production Lines
export const mockLines: ProductionLine[] = [
  { id: 'line-1', name: 'Ligne 1 - Assemblage', code: 'L1', scale_url: 'http://pc-line1/poids/poids.txt', balanceUrl: 'http://pc-line1/poids/poids.txt', photocell_url: 'http://pc-line1/io/photocellule.txt', photocellUrl: 'http://pc-line1/io/photocellule.txt', state: 'RUNNING', is_active: true, isActive: true },
  { id: 'line-2', name: 'Ligne 2 - Moulage', code: 'L2', scale_url: 'http://pc-line2/poids/poids.txt', balanceUrl: 'http://pc-line2/poids/poids.txt', photocell_url: 'http://pc-line2/io/photocellule.txt', photocellUrl: 'http://pc-line2/io/photocellule.txt', state: 'PAUSED', is_active: true, isActive: true },
  { id: 'line-3', name: 'Ligne 3 - Finition', code: 'L3', scale_url: 'http://pc-line3/poids/poids.txt', balanceUrl: 'http://pc-line3/poids/poids.txt', photocell_url: 'http://pc-line3/io/photocellule.txt', photocellUrl: 'http://pc-line3/io/photocellule.txt', state: 'IDLE', is_active: true, isActive: true },
];

// Mock Terminals
export const mockTerminals: Terminal[] = [
  { id: 'term-1', device_uid: 'KIOSK-L1-001', deviceUid: 'KIOSK-L1-001', name: 'Terminal Ligne 1', line_id: 'line-1', lineId: 'line-1', last_ping: new Date().toISOString(), lastPing: new Date().toISOString(), is_online: true, isOnline: true },
  { id: 'term-2', device_uid: 'KIOSK-L2-001', deviceUid: 'KIOSK-L2-001', name: 'Terminal Ligne 2', line_id: 'line-2', lineId: 'line-2', last_ping: new Date().toISOString(), lastPing: new Date().toISOString(), is_online: true, isOnline: true },
  { id: 'term-3', device_uid: 'KIOSK-L3-001', deviceUid: 'KIOSK-L3-001', name: 'Terminal Ligne 3', line_id: 'line-3', lineId: 'line-3', last_ping: new Date(Date.now() - 300000).toISOString(), lastPing: new Date(Date.now() - 300000).toISOString(), is_online: false, isOnline: false },
];

// Mock Balances
export const mockBalances: Balance[] = [
  { id: 'bal-1', name: 'Balance Ligne 1', lineId: 'line-1', url: 'http://pc-line1/poids/poids.txt', isConnected: true },
  { id: 'bal-2', name: 'Balance Ligne 2', lineId: 'line-2', url: 'http://pc-line2/poids/poids.txt', isConnected: true },
  { id: 'bal-3', name: 'Balance Ligne 3', lineId: 'line-3', url: 'http://pc-line3/poids/poids.txt', isConnected: false },
];

// Generate mock production items
function generateMockItems(count: number, taskId: string, product: Product): ProductionItem[] {
  const items: ProductionItem[] = [];
  const now = Date.now();
  const targetWeight = product.targetWeight || product.target_weight || 0;
  const tolerance = product.tolerancePercent || 2;
  const minWeight = product.minWeight || product.tolerance_min || 0;
  const maxWeight = product.maxWeight || product.tolerance_max || 0;
  
  for (let i = 0; i < count; i++) {
    const variance = (Math.random() - 0.5) * 2 * (targetWeight * tolerance / 100);
    const weight = targetWeight + variance + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 20 : -20) : 0);
    
    let status: 'ok' | 'underweight' | 'overweight' = 'ok';
    if (weight < minWeight) status = 'underweight';
    else if (weight > maxWeight) status = 'overweight';
    
    const capturedAt = new Date(now - (count - i) * 5000).toISOString();
    
    items.push({
      id: `item-${taskId}-${i}`,
      task_id: taskId,
      taskId,
      weight: Math.round(weight * 10) / 10,
      status,
      captured_at: capturedAt,
      capturedAt,
      sequence: i + 1,
    });
  }
  
  return items;
}

// Mock Active Tasks
const task1Items = generateMockItems(47, 'task-1', mockProducts[0]);
const task2Items = generateMockItems(12, 'task-2', mockProducts[2]);

export const mockTasks: ProductionTask[] = [
  {
    id: 'task-1',
    line_id: 'line-1',
    lineId: 'line-1',
    product_id: 'prod-1',
    productId: 'prod-1',
    product: mockProducts[0],
    operator_id: 'user-op-1',
    operatorId: 'user-op-1',
    operator: mockUsers[2],
    status: 'in_progress',
    state: 'active',
    started_at: new Date(Date.now() - 3600000).toISOString(),
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    target_quantity: 100,
    produced_quantity: 47,
    completedQuantity: 47,
    items: task1Items,
  },
  {
    id: 'task-2',
    line_id: 'line-2',
    lineId: 'line-2',
    product_id: 'prod-3',
    productId: 'prod-3',
    product: mockProducts[2],
    operator_id: 'user-op-2',
    operatorId: 'user-op-2',
    operator: mockUsers[3],
    status: 'paused',
    state: 'paused',
    started_at: new Date(Date.now() - 7200000).toISOString(),
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    paused_at: new Date(Date.now() - 1800000).toISOString(),
    pausedAt: new Date(Date.now() - 1800000).toISOString(),
    target_quantity: 50,
    produced_quantity: 12,
    completedQuantity: 12,
    items: task2Items,
  },
];

// Generate live weight simulation
export function simulateWeight(product?: Product): WeightReading {
  const statuses: Array<'stable' | 'unstable' | 'error'> = ['stable', 'stable', 'stable', 'stable', 'unstable', 'error'];
  const status = statuses[Math.floor(Math.random() * statuses.length)] as 'stable' | 'unstable' | 'error';
  
  let value = 0;
  const targetWeight = product?.targetWeight || product?.target_weight || 0;
  
  if (product && status !== 'error') {
    const variance = (Math.random() - 0.5) * 2 * (targetWeight * 0.15);
    value = Math.round((targetWeight + variance) * 10) / 10;
  } else if (status !== 'error') {
    value = Math.round((Math.random() * 500 + 50) * 10) / 10;
  }
  
  return {
    value,
    status,
    timestamp: Date.now(),
  };
}

// Generate line status
export function getLineStatus(lineId: string): LineStatus {
  const line = mockLines.find(l => l.id === lineId);
  const balance = mockBalances.find(b => b.lineId === lineId);
  const terminal = mockTerminals.find(t => t.line_id === lineId || t.lineId === lineId);
  const activeTask = mockTasks.find(t => (t.line_id === lineId || t.lineId === lineId) && (t.state === 'active' || t.state === 'paused'));
  
  // Create a default line if not found in mock data (for real database lines)
  const defaultLine: ProductionLine = line || {
    id: lineId,
    name: 'Ligne',
    code: lineId.substring(0, 8).toUpperCase(),
    scale_url: '',
    balanceUrl: '',
    photocell_url: '',
    photocellUrl: '',
    state: 'IDLE',
    is_active: true,
    isActive: true,
  };

  const defaultBalance: Balance = balance || {
    id: `bal-${lineId}`,
    name: 'Balance',
    lineId: lineId,
    url: '',
    isConnected: false,
  };
  
  return {
    line: defaultLine,
    balance: defaultBalance,
    terminal,
    currentWeight: simulateWeight(activeTask?.product),
    photocellState: Math.random() > 0.7 ? 1 : 0,
    activeTask,
    lastItems: activeTask?.items?.slice(-5).reverse() || [],
    captureState: defaultLine.state === 'RUNNING' ? 'armed' : 'idle',
  };
}

export function getAllLinesStatus(): LineStatus[] {
  return mockLines.map(line => getLineStatus(line.id));
}
