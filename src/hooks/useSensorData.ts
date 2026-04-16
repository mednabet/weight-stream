import { useState, useEffect, useCallback, useRef } from 'react';
import { WeightReading, WeightStatus } from '@/types/production';


interface SensorConfig {
  scaleUrl?: string | null;
  pollingInterval?: number;
  /** Number of consecutive stable readings required to confirm weight (default: 3) */
  stableReadingsRequired?: number;
  /** Max deviation (in same unit as weight) between stable readings to consider them concordant (default: 0.5) */
  stableDeviation?: number;
}

export interface ConfirmedWeight {
  /** The confirmed real weight (average of concordant stable readings) */
  value: number;
  /** Whether the weight has been confirmed by multiple stable readings */
  isConfirmed: boolean;
  /** Number of consecutive stable readings collected so far */
  stableCount: number;
  /** Number required for confirmation */
  requiredCount: number;
  /** Progress percentage (0-100) toward confirmation */
  progress: number;
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

export function useSensorData(config: SensorConfig): UseSensorDataResult {
  const {
    scaleUrl,
    pollingInterval = 200,
    stableReadingsRequired = 3,
    stableDeviation = 0.5,
  } = config;
  
  const [weight, setWeight] = useState<WeightReading>({ value: 0, status: 'offline', timestamp: Date.now() });
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [errors, setErrors] = useState<{ scale?: string }>({});
  
  // Buffer of consecutive stable readings for weight confirmation
  const stableBufferRef = useRef<number[]>([]);
  const [confirmedWeight, setConfirmedWeight] = useState<ConfirmedWeight>({
    value: 0,
    isConfirmed: false,
    stableCount: 0,
    requiredCount: stableReadingsRequired,
    progress: 0,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset confirmation (called after a weighing is recorded)
  const resetConfirmation = useCallback(() => {
    stableBufferRef.current = [];
    setConfirmedWeight({
      value: 0,
      isConfirmed: false,
      stableCount: 0,
      requiredCount: stableReadingsRequired,
      progress: 0,
    });
  }, [stableReadingsRequired]);
  
  // Check if all values in the buffer are concordant (within deviation)
  const areReadingsConcordant = useCallback((readings: number[]): boolean => {
    if (readings.length < 2) return true;
    const min = Math.min(...readings);
    const max = Math.max(...readings);
    return (max - min) <= stableDeviation;
  }, [stableDeviation]);
  
  const pollSensors = useCallback(async () => {
    // Poll scale via backend proxy
    if (scaleUrl) {
      const result = await fetchSensorViaProxy(scaleUrl);
      if (result.data) {
        const parsed = parseWeight(result.data);
        setWeight({ ...parsed, timestamp: Date.now() });
        setIsScaleConnected(parsed.status !== 'error');
        setErrors(prev => ({ ...prev, scale: undefined }));
        
        // ─── Stable weight confirmation logic ───
        if (parsed.status === 'stable' && parsed.value > 0) {
          const buffer = stableBufferRef.current;
          
          // Check if new reading is concordant with existing buffer
          if (buffer.length > 0 && !areReadingsConcordant([...buffer, parsed.value])) {
            // New reading diverges too much → reset buffer with this new reading
            stableBufferRef.current = [parsed.value];
          } else {
            // Concordant → add to buffer
            buffer.push(parsed.value);
          }
          
          const currentBuffer = stableBufferRef.current;
          const count = currentBuffer.length;
          const progress = Math.min(100, Math.round((count / stableReadingsRequired) * 100));
          
          if (count >= stableReadingsRequired) {
            // Confirmed! Calculate average of the last N readings
            const lastN = currentBuffer.slice(-stableReadingsRequired);
            const avg = lastN.reduce((sum, v) => sum + v, 0) / lastN.length;
            // Round to 3 decimal places
            const confirmedValue = Math.round(avg * 1000) / 1000;
            
            setConfirmedWeight({
              value: confirmedValue,
              isConfirmed: true,
              stableCount: count,
              requiredCount: stableReadingsRequired,
              progress: 100,
            });
          } else {
            setConfirmedWeight({
              value: 0,
              isConfirmed: false,
              stableCount: count,
              requiredCount: stableReadingsRequired,
              progress,
            });
          }
        } else {
          // Not stable or zero → reset buffer
          stableBufferRef.current = [];
          setConfirmedWeight(prev => 
            prev.isConfirmed ? prev : {
              value: 0,
              isConfirmed: false,
              stableCount: 0,
              requiredCount: stableReadingsRequired,
              progress: 0,
            }
          );
        }
      } else {
        setWeight({ value: 0, status: 'offline', timestamp: Date.now() });
        setIsScaleConnected(false);
        setErrors(prev => ({ ...prev, scale: result.error }));
        stableBufferRef.current = [];
        setConfirmedWeight({
          value: 0,
          isConfirmed: false,
          stableCount: 0,
          requiredCount: stableReadingsRequired,
          progress: 0,
        });
      }
    } else {
      setWeight({ value: 0, status: 'offline', timestamp: Date.now() });
      setIsScaleConnected(false);
    }
  }, [scaleUrl, stableReadingsRequired, areReadingsConcordant]);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start polling if we have a scale URL
    if (scaleUrl) {
      // Initial poll
      pollSensors();
      
      // Set up interval
      intervalRef.current = setInterval(pollSensors, pollingInterval);
    }
    
    // Cleanup on unmount or config change
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
