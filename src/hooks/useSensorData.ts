import { useState, useEffect, useCallback, useRef } from 'react';
import { WeightReading, PhotocellState, WeightStatus } from '@/types/production';


interface SensorConfig {
  scaleUrl?: string | null;
  photocellUrl?: string | null;
  pollingInterval?: number;
}

interface UseSensorDataResult {
  weight: WeightReading;
  photocellState: PhotocellState;
  isScaleConnected: boolean;
  isPhotocellConnected: boolean;
  errors: { scale?: string; photocell?: string };
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

// Parse photocell state from text response
// Only "0" (no object) or "1" (object detected) are valid
// Anything else is considered an error
function parsePhotocell(text: string): { state: PhotocellState; isError: boolean } {
  const trimmed = text.trim();
  
  if (trimmed === '1') {
    return { state: 1, isError: false };
  }
  if (trimmed === '0') {
    return { state: 0, isError: false };
  }
  
  // Any other value is an error
  return { state: 0, isError: true };
}

// Fetch sensor data via edge function (bypasses CORS)
async function fetchSensorViaProxy(url: string): Promise<{ data?: string; error?: string }> {
  try {
    const res = await fetch(url, { method: 'GET' });
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
  const { scaleUrl, photocellUrl, pollingInterval = 200 } = config;
  
  const [weight, setWeight] = useState<WeightReading>({ value: 0, status: 'disconnected' });
  const [photocellState, setPhotocellState] = useState<PhotocellState>(0);
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [isPhotocellConnected, setIsPhotocellConnected] = useState(false);
  const [errors, setErrors] = useState<{ scale?: string; photocell?: string }>({});
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const pollSensors = useCallback(async () => {
    // Poll scale
    if (scaleUrl) {
      const result = await fetchSensorViaProxy(scaleUrl);
      if (result.data) {
        const parsed = parseWeight(result.data);
        setWeight(parsed);
        setIsScaleConnected(parsed.status !== 'error');
        setErrors(prev => ({ ...prev, scale: undefined }));
      } else {
        setWeight({ value: 0, status: 'disconnected' });
        setIsScaleConnected(false);
        setErrors(prev => ({ ...prev, scale: result.error }));
      }
    } else {
      setWeight({ value: 0, status: 'disconnected' });
      setIsScaleConnected(false);
    }
    
    // Poll photocell
    if (photocellUrl) {
      const result = await fetchSensorViaProxy(photocellUrl);
      if (result.data) {
        const parsed = parsePhotocell(result.data);
        setPhotocellState(parsed.state);
        setIsPhotocellConnected(!parsed.isError);
        setErrors(prev => ({ ...prev, photocell: parsed.isError ? 'Invalid response' : undefined }));
      } else {
        setPhotocellState(0);
        setIsPhotocellConnected(false);
        setErrors(prev => ({ ...prev, photocell: result.error }));
      }
    } else {
      setPhotocellState(0);
      setIsPhotocellConnected(false);
    }
  }, [scaleUrl, photocellUrl]);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start polling if we have at least one URL
    if (scaleUrl || photocellUrl) {
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
  }, [scaleUrl, photocellUrl, pollingInterval, pollSensors]);
  
  return {
    weight,
    photocellState,
    isScaleConnected,
    isPhotocellConnected,
    errors,
  };
}
