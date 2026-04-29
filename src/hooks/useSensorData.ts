import { useState, useEffect, useCallback, useRef } from 'react';
import { WeightReading, WeightStatus } from '@/types/production';


interface SensorConfig {
  scaleUrl?: string | null;
  pollingInterval?: number;
  /** Number of times the same stable value must appear to be confirmed (default: 3) */
  stableReadingsRequired?: number;
  /** Rounding precision (decimal places) used to group similar readings (default: 2) */
  stableRoundingDecimals?: number;
}

export interface StableFrequencyEntry {
  value: number;
  count: number;
}

export interface ConfirmedWeight {
  /** The confirmed weight — the stable value captured the most times */
  value: number;
  /** Whether the weight has been confirmed */
  isConfirmed: boolean;
  /** How many times the most-frequent stable value has been captured */
  stableCount: number;
  /** Number of captures required for confirmation */
  requiredCount: number;
  /** Progress percentage (0-100) toward confirmation */
  progress: number;
  /** Frequency breakdown of all captured stable values, sorted by count desc */
  stableFrequencies: StableFrequencyEntry[];
}

interface UseSensorDataResult {
  weight: WeightReading;
  confirmedWeight: ConfirmedWeight;
  isScaleConnected: boolean;
  errors: { scale?: string };
  /** Call this after recording a weighing to reset the confirmation cycle */
  resetConfirmation: () => void;
}

// Parse weight from text response
// Formats supported:
// - "s-100" or "S-100" -> stable, 100g
// - "i-1200" or "I-1200" -> unstable, 1200g
// - "error" -> disconnected/error
// - "1234.5" or "1234,5" -> stable (default), value
// - "1234.5 g" -> stable, value with unit
function parseWeight(text: string): { value: number; status: WeightStatus } {
  const trimmed = text.trim().toLowerCase();
  
  // Check for error/disconnected
  if (trimmed === 'error' || trimmed.includes('err') || trimmed === 'disconnect') {
    return { value: 0, status: 'error' };
  }
  
  // Format: s-XXX (stable) or i-XXX (unstable)
  const prefixMatch = trimmed.match(/^([si])-(.+)$/);
  if (prefixMatch) {
    const stabilityPrefix = prefixMatch[1];
    const valueStr = prefixMatch[2].replace(',', '.');
    const value = parseFloat(valueStr);
    
    if (isNaN(value)) {
      return { value: 0, status: 'error' };
    }
    
    return {
      value,
      status: stabilityPrefix === 's' ? 'stable' : 'unstable',
    };
  }
  
  // Fallback: extract numeric value (supports "1234.5", "1234,5", "1234.5 g")
  const numericMatch = trimmed.match(/^[\s]*([+-]?\d+[.,]?\d*)/);
  if (!numericMatch) {
    return { value: 0, status: 'error' };
  }
  
  const value = parseFloat(numericMatch[1].replace(',', '.'));
  
  // Check for stability indicators in remaining text
  const hasUnstableIndicator = trimmed.includes('u') || trimmed.includes('m') || trimmed.includes('instable');
  
  return {
    value,
    status: hasUnstableIndicator ? 'unstable' : 'stable',
  };
}

// Build the backend proxy URL for the scale
function buildProxyUrl(scaleUrl: string): string {
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  return `${apiBase}/scale-proxy?url=${encodeURIComponent(scaleUrl)}`;
}

// Fetch sensor data via backend proxy to avoid CORS issues
async function fetchSensorViaProxy(scaleUrl: string): Promise<{ data?: string; error?: string }> {
  try {
    const proxyUrl = buildProxyUrl(scaleUrl);
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(proxyUrl, { method: 'GET', headers });
    const text = await res.text();
    if (res.ok) {
      return { data: text };
    } else {
      return { error: `HTTP ${res.status}: ${text}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const EMPTY_CONFIRMED: ConfirmedWeight = {
  value: 0,
  isConfirmed: false,
  stableCount: 0,
  requiredCount: 3,
  progress: 0,
  stableFrequencies: [],
};

export function useSensorData(config: SensorConfig): UseSensorDataResult {
  const {
    scaleUrl,
    pollingInterval = 200,
    stableReadingsRequired = 3,
    stableRoundingDecimals = 2,
  } = config;

  const [weight, setWeight] = useState<WeightReading>({ value: 0, status: 'offline', timestamp: Date.now() });
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [errors, setErrors] = useState<{ scale?: string }>({});

  // frequency map: rounded-value-string -> { value, count }
  const freqMapRef = useRef<Map<string, StableFrequencyEntry>>(new Map());

  const [confirmedWeight, setConfirmedWeight] = useState<ConfirmedWeight>({
    ...EMPTY_CONFIRMED,
    requiredCount: stableReadingsRequired,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetConfirmation = useCallback(() => {
    freqMapRef.current = new Map();
    setConfirmedWeight({ ...EMPTY_CONFIRMED, requiredCount: stableReadingsRequired });
  }, [stableReadingsRequired]);

  const resetFreqMap = useCallback(() => {
    freqMapRef.current = new Map();
    setConfirmedWeight(prev =>
      prev.isConfirmed ? prev : { ...EMPTY_CONFIRMED, requiredCount: stableReadingsRequired }
    );
  }, [stableReadingsRequired]);

  const pollSensors = useCallback(async () => {
    if (!scaleUrl) {
      setWeight({ value: 0, status: 'offline', timestamp: Date.now() });
      setIsScaleConnected(false);
      return;
    }

    const result = await fetchSensorViaProxy(scaleUrl);

    if (!result.data) {
      setWeight({ value: 0, status: 'offline', timestamp: Date.now() });
      setIsScaleConnected(false);
      setErrors(prev => ({ ...prev, scale: result.error }));
      freqMapRef.current = new Map();
      setConfirmedWeight({ ...EMPTY_CONFIRMED, requiredCount: stableReadingsRequired });
      return;
    }

    const parsed = parseWeight(result.data);
    setWeight({ ...parsed, timestamp: Date.now() });
    setIsScaleConnected(parsed.status !== 'error');
    setErrors(prev => ({ ...prev, scale: undefined }));

    if (parsed.status === 'stable' && parsed.value > 0) {
      // Round to configured decimal places for grouping
      const factor = Math.pow(10, stableRoundingDecimals);
      const rounded = Math.round(parsed.value * factor) / factor;
      const key = rounded.toFixed(stableRoundingDecimals);

      const freq = freqMapRef.current;
      const existing = freq.get(key);
      if (existing) {
        existing.count++;
      } else {
        freq.set(key, { value: rounded, count: 1 });
      }

      // Find the value captured the most times
      let maxCount = 0;
      let mostFrequentValue = rounded;
      for (const entry of freq.values()) {
        if (entry.count > maxCount) {
          maxCount = entry.count;
          mostFrequentValue = entry.value;
        }
      }

      // Build sorted frequency list for display
      const stableFrequencies: StableFrequencyEntry[] = Array.from(freq.values())
        .sort((a, b) => b.count - a.count);

      const progress = Math.min(100, Math.round((maxCount / stableReadingsRequired) * 100));

      setConfirmedWeight({
        value: mostFrequentValue,
        isConfirmed: maxCount >= stableReadingsRequired,
        stableCount: maxCount,
        requiredCount: stableReadingsRequired,
        progress,
        stableFrequencies,
      });
    } else {
      // Not stable or zero → reset frequency map
      resetFreqMap();
    }
  }, [scaleUrl, stableReadingsRequired, stableRoundingDecimals, resetFreqMap]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (scaleUrl) {
      pollSensors();
      intervalRef.current = setInterval(pollSensors, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [scaleUrl, pollingInterval, pollSensors]);

  return {
    weight,
    confirmedWeight,
    isScaleConnected,
    errors,
    resetConfirmation,
  };
}
