import { useState, useEffect, useCallback, useRef } from 'react';
import { WeightReading, WeightStatus } from '@/types/production';


interface SensorConfig {
  scaleUrl?: string | null;
  pollingInterval?: number;
  /** Number of times the same stable value must appear to confirm on return-to-zero (default: 3) */
  stableReadingsRequired?: number;
  /** Rounding precision (decimal places) used to group similar readings (default: 2) */
  stableRoundingDecimals?: number;
  /** Values at or below this threshold are treated as "zero" (default: 0.05) */
  zeroThreshold?: number;
}

export interface StableFrequencyEntry {
  value: number;
  count: number;
}

export interface ConfirmedWeight {
  /** The confirmed weight — the stable value captured the most times, set when scale returns to zero */
  value: number;
  /** True only after the scale has returned to zero with accumulated stable readings */
  isConfirmed: boolean;
  /** How many times the most-frequent stable value was captured */
  stableCount: number;
  /** Number of captures required for the weight to be eligible for confirmation */
  requiredCount: number;
  /** Progress percentage (0-100) toward the required capture count */
  progress: number;
  /** Frequency breakdown of all captured stable values, sorted by count desc */
  stableFrequencies: StableFrequencyEntry[];
}

interface UseSensorDataResult {
  weight: WeightReading;
  confirmedWeight: ConfirmedWeight;
  isScaleConnected: boolean;
  errors: { scale?: string };
  /** Call this after consuming a confirmed weight to clear it */
  resetConfirmation: () => void;
}

function parseWeight(text: string): { value: number; status: WeightStatus } {
  const trimmed = text.trim().toLowerCase();

  if (trimmed === 'error' || trimmed.includes('err') || trimmed === 'disconnect') {
    return { value: 0, status: 'error' };
  }

  const prefixMatch = trimmed.match(/^([si])-(.+)$/);
  if (prefixMatch) {
    const stabilityPrefix = prefixMatch[1];
    const valueStr = prefixMatch[2].replace(',', '.');
    const value = parseFloat(valueStr);
    if (isNaN(value)) return { value: 0, status: 'error' };
    return { value, status: stabilityPrefix === 's' ? 'stable' : 'unstable' };
  }

  const numericMatch = trimmed.match(/^[\s]*([+-]?\d+[.,]?\d*)/);
  if (!numericMatch) return { value: 0, status: 'error' };

  const value = parseFloat(numericMatch[1].replace(',', '.'));
  const hasUnstableIndicator = trimmed.includes('u') || trimmed.includes('m') || trimmed.includes('instable');
  return { value, status: hasUnstableIndicator ? 'unstable' : 'stable' };
}

function buildProxyUrl(scaleUrl: string): string {
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  return `${apiBase}/scale-proxy?url=${encodeURIComponent(scaleUrl)}`;
}

async function fetchSensorViaProxy(scaleUrl: string): Promise<{ data?: string; error?: string }> {
  try {
    const proxyUrl = buildProxyUrl(scaleUrl);
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(proxyUrl, { method: 'GET', headers });
    const text = await res.text();
    return res.ok ? { data: text } : { error: `HTTP ${res.status}: ${text}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function makeEmpty(requiredCount: number): ConfirmedWeight {
  return { value: 0, isConfirmed: false, stableCount: 0, requiredCount, progress: 0, stableFrequencies: [] };
}

function mostFrequentEntry(freq: Map<string, StableFrequencyEntry>): { value: number; count: number } {
  let maxCount = 0;
  let bestValue = 0;
  for (const entry of freq.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      bestValue = entry.value;
    }
  }
  return { value: bestValue, count: maxCount };
}

export function useSensorData(config: SensorConfig): UseSensorDataResult {
  const {
    scaleUrl,
    pollingInterval = 200,
    stableReadingsRequired = 3,
    stableRoundingDecimals = 2,
    zeroThreshold = 0.05,
  } = config;

  const [weight, setWeight] = useState<WeightReading>({ value: 0, status: 'offline', timestamp: Date.now() });
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [errors, setErrors] = useState<{ scale?: string }>({});
  const [confirmedWeight, setConfirmedWeight] = useState<ConfirmedWeight>(makeEmpty(stableReadingsRequired));

  // Frequency map: rounded-value-string → { value, count }
  const freqMapRef = useRef<Map<string, StableFrequencyEntry>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetConfirmation = useCallback(() => {
    freqMapRef.current = new Map();
    setConfirmedWeight(makeEmpty(stableReadingsRequired));
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
      setConfirmedWeight(makeEmpty(stableReadingsRequired));
      return;
    }

    const parsed = parseWeight(result.data);
    setWeight({ ...parsed, timestamp: Date.now() });
    setIsScaleConnected(parsed.status !== 'error');
    setErrors(prev => ({ ...prev, scale: undefined }));

    if (parsed.status === 'error') {
      // Full reset on error
      freqMapRef.current = new Map();
      setConfirmedWeight(makeEmpty(stableReadingsRequired));
      return;
    }

    if (parsed.value <= zeroThreshold) {
      // Scale returned to zero — confirm if we have accumulated stable readings
      const freq = freqMapRef.current;
      if (freq.size > 0) {
        const { value: bestValue, count: maxCount } = mostFrequentEntry(freq);
        const stableFrequencies = Array.from(freq.values()).sort((a, b) => b.count - a.count);
        setConfirmedWeight({
          value: bestValue,
          isConfirmed: maxCount >= stableReadingsRequired,
          stableCount: maxCount,
          requiredCount: stableReadingsRequired,
          progress: 100,
          stableFrequencies,
        });
        // Reset map so next placement starts fresh
        freqMapRef.current = new Map();
      }
      return;
    }

    if (parsed.status === 'stable') {
      // Item on scale and stable — accumulate into frequency map
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

      const { value: bestValue, count: maxCount } = mostFrequentEntry(freq);
      const stableFrequencies = Array.from(freq.values()).sort((a, b) => b.count - a.count);
      const progress = Math.min(100, Math.round((maxCount / stableReadingsRequired) * 100));

      // Not confirmed yet — waiting for scale to return to zero
      setConfirmedWeight({
        value: bestValue,
        isConfirmed: false,
        stableCount: maxCount,
        requiredCount: stableReadingsRequired,
        progress,
        stableFrequencies,
      });
    }
    // unstable + value > zeroThreshold: item still settling, keep freq map as-is
  }, [scaleUrl, stableReadingsRequired, stableRoundingDecimals, zeroThreshold]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
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

  return { weight, confirmedWeight, isScaleConnected, errors, resetConfirmation };
}
