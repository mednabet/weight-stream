// Production Line Management Types

export type UserRole = 'admin' | 'supervisor' | 'operator';

export type LineState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'CAPTURING' | 'COOLDOWN' | 'ERROR';

export type WeightStatus = 'stable' | 'unstable' | 'error' | 'offline';

export type PhotocellState = 0 | 1;

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Terminal {
  id: string;
  deviceUid: string;
  name: string;
  lineId: string;
  lastPing?: string;
  isOnline: boolean;
}

export interface Balance {
  id: string;
  name: string;
  lineId: string;
  url: string;
  isConnected: boolean;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  targetWeight: number;
  minWeight: number;
  maxWeight: number;
  unit: string;
  tolerancePercent: number;
}

export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  balanceUrl: string;
  photocellUrl: string;
  state: LineState;
  isActive: boolean;
}

export interface WeightReading {
  value: number;
  status: WeightStatus;
  timestamp: number;
}

export interface ProductionTask {
  id: string;
  lineId: string;
  productId: string;
  product: Product;
  operatorId: string;
  operator: User;
  state: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: string;
  pausedAt?: string;
  completedAt?: string;
  targetQuantity?: number;
  completedQuantity: number;
  items: ProductionItem[];
}

export interface ProductionItem {
  id: string;
  taskId: string;
  weight: number;
  status: 'ok' | 'underweight' | 'overweight';
  capturedAt: string;
  sequence: number;
}

export interface LineStatus {
  line: ProductionLine;
  balance: Balance;
  terminal?: Terminal;
  currentWeight: WeightReading;
  photocellState: PhotocellState;
  activeTask?: ProductionTask;
  lastItems: ProductionItem[];
  captureState: 'idle' | 'armed' | 'capturing' | 'cooldown';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

// WebSocket message types
export interface WSMessage {
  type: 'weight_update' | 'photocell_update' | 'capture_event' | 'task_update' | 'line_state_change';
  lineId: string;
  payload: unknown;
  timestamp: number;
}

export interface WeightUpdatePayload {
  weight: number;
  status: WeightStatus;
}

export interface PhotocellUpdatePayload {
  state: PhotocellState;
}

export interface CaptureEventPayload {
  item: ProductionItem;
  newQuantity: number;
}
