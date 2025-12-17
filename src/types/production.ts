// Production Line Management Types

export type UserRole = 'admin' | 'supervisor' | 'operator';

export type LineState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'CAPTURING' | 'COOLDOWN' | 'ERROR';

export type WeightStatus = 'stable' | 'unstable' | 'error' | 'offline' | 'disconnected';

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
  device_uid: string;
  deviceUid?: string;
  name: string;
  line_id: string | null;
  lineId?: string | null;
  ip_address?: string | null;
  last_ping?: string | null;
  lastPing?: string | null;
  is_online: boolean;
  isOnline?: boolean;
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
  reference: string;
  code?: string;
  target_weight: number;
  targetWeight?: number;
  tolerance_min: number;
  tolerance_max: number;
  minWeight?: number;
  maxWeight?: number;
  weight_unit_id?: string | null;
  unit?: string;
  tolerancePercent?: number;
  is_active?: boolean;
}

export interface ProductionLine {
  id: string;
  name: string;
  description?: string | null;
  code?: string;
  scale_url?: string | null;
  balanceUrl?: string;
  photocell_url?: string | null;
  photocellUrl?: string;
  state?: LineState;
  is_active: boolean;
  isActive?: boolean;
  weight_unit_id?: string | null;
}

export interface WeightReading {
  value: number;
  status: WeightStatus;
  timestamp: number;
}

export interface ProductionTask {
  id: string;
  line_id: string;
  lineId?: string;
  product_id: string;
  productId?: string;
  product?: Product;
  line?: ProductionLine;
  operator_id?: string | null;
  operatorId?: string;
  operator?: User;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  state?: 'active' | 'paused' | 'completed' | 'cancelled';
  started_at?: string | null;
  startedAt?: string;
  paused_at?: string | null;
  pausedAt?: string;
  completed_at?: string | null;
  completedAt?: string;
  target_quantity: number;
  targetQuantity?: number;
  produced_quantity: number;
  completedQuantity?: number;
  items?: ProductionItem[];
}

export interface ProductionItem {
  id: string;
  task_id: string;
  taskId?: string;
  weight: number;
  status: 'ok' | 'underweight' | 'overweight';
  captured_at: string;
  capturedAt?: string;
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
