import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'success' | 'error' | 'warning' | 'capture' | 'sensorAlert';

interface AudioFeedbackOptions {
  enabled?: boolean;
  volume?: number;
}

// Create audio context lazily to avoid autoplay restrictions
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Generate a beep sound using Web Audio API
function playBeep(frequency: number, duration: number, volume: number = 0.3, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + duration * 0.5);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
}

// Play success sound (pleasant ascending tone)
function playSuccess(volume: number) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  
  // Play two ascending notes
  setTimeout(() => playBeep(523.25, 0.1, volume, 'sine'), 0);    // C5
  setTimeout(() => playBeep(659.25, 0.15, volume, 'sine'), 100); // E5
}

// Play error sound (descending warning tone)
function playError(volume: number) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  
  // Play descending notes
  setTimeout(() => playBeep(440, 0.15, volume, 'square'), 0);    // A4
  setTimeout(() => playBeep(349.23, 0.2, volume, 'square'), 150); // F4
}

// Play warning sound (attention grabbing)
function playWarning(volume: number) {
  playBeep(587.33, 0.2, volume * 0.8, 'triangle'); // D5
}

// Play capture sound (quick confirmation)
function playCapture(volume: number) {
  playBeep(880, 0.08, volume * 0.5, 'sine'); // A5 - quick blip
}

// Play sensor alert sound (urgent repeating alarm for sensor errors)
function playSensorAlert(volume: number) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  
  // Urgent triple beep pattern with sawtooth wave
  setTimeout(() => playBeep(800, 0.12, volume, 'sawtooth'), 0);
  setTimeout(() => playBeep(800, 0.12, volume, 'sawtooth'), 180);
  setTimeout(() => playBeep(600, 0.25, volume, 'sawtooth'), 360);
}

// Vibrate device if supported
function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Vibration not supported or permission denied
    }
  }
}

export function useAudioFeedback(options: AudioFeedbackOptions = {}) {
  const { enabled = true, volume = 0.3 } = options;
  const isInitializedRef = useRef(false);
  
  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!isInitializedRef.current) {
        try {
          getAudioContext();
          isInitializedRef.current = true;
        } catch (error) {
          console.warn('Could not initialize audio context:', error);
        }
      }
    };
    
    // Initialize on any user interaction
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);
  
  const playSound = useCallback((type: SoundType) => {
    if (!enabled) return;
    
    switch (type) {
      case 'success':
        playSuccess(volume);
        vibrate([50, 30, 50]); // Short double vibration
        break;
      case 'error':
        playError(volume);
        vibrate([100, 50, 100, 50, 100]); // Triple vibration for attention
        break;
      case 'warning':
        playWarning(volume);
        vibrate([80, 40, 80]); // Medium double vibration
        break;
      case 'capture':
        playCapture(volume);
        vibrate(30); // Quick single vibration
        break;
      case 'sensorAlert':
        playSensorAlert(volume);
        vibrate([150, 75, 150, 75, 200]); // Long urgent vibration pattern
        break;
    }
  }, [enabled, volume]);
  
  const playSuccessSound = useCallback(() => playSound('success'), [playSound]);
  const playErrorSound = useCallback(() => playSound('error'), [playSound]);
  const playWarningSound = useCallback(() => playSound('warning'), [playSound]);
  const playCaptureSound = useCallback(() => playSound('capture'), [playSound]);
  const playSensorAlertSound = useCallback(() => playSound('sensorAlert'), [playSound]);
  
  return {
    playSound,
    playSuccessSound,
    playErrorSound,
    playWarningSound,
    playCaptureSound,
    playSensorAlertSound,
  };
}
