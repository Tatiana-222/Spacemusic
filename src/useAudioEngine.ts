import { useEffect, useRef, useState, useCallback } from 'react';
import { Track, Subdivision } from './types';

const LOOK_AHEAD = 25.0; // How often to call scheduler (ms)
const SCHEDULE_AHEAD_TIME = 0.1; // How far ahead to schedule audio (s)

export function useAudioEngine(bpm: number, tracks: Track[], nebulaStrokes: {x: number, y: number}[][]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackSteps, setTrackSteps] = useState<Record<string, number>>({});
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const timerIDRef = useRef<number | null>(null);
  const tracksRef = useRef(tracks);
  const nebulaStrokesRef = useRef(nebulaStrokes);
  
  // Track-specific timing
  const trackNextNoteTimeRef = useRef<Record<string, number>>({});
  const trackCurrentStepRef = useRef<Record<string, number>>({});

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    nebulaStrokesRef.current = nebulaStrokes;
  }, [nebulaStrokes]);

  const createReverbBuffer = (ctx: AudioContext) => {
    const length = ctx.sampleRate * 2.5; // 2.5 seconds reverb
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay noise
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    return buffer;
  };

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Setup Reverb
      const reverb = ctx.createConvolver();
      reverb.buffer = createReverbBuffer(ctx);
      
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.35; // Reverb amount
      
      reverb.connect(reverbGain);
      reverbGain.connect(ctx.destination);
      
      reverbNodeRef.current = reverb;
      reverbGainRef.current = reverbGain;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const noteToFreq = (note: string) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const key = notes.indexOf(note.slice(0, -1));
    return 440 * Math.pow(2, (octave - 4) + (key - 9) / 12);
  };

  const playSound = useCallback((type: string, time: number, notes?: string[]) => {
    const ctx = audioContextRef.current;
    const reverb = reverbNodeRef.current;
    if (!ctx || !reverb) return;

    const now = time;

    const createNoiseBuffer = () => {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      return buffer;
    };

    switch (type) {
      case 'kick': {
        // Standard 808 Kick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'snare': {
        // Standard Noise Snare
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer();
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, now);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        osc.connect(oscGain);
        
        noiseGain.connect(ctx.destination);
        oscGain.connect(ctx.destination);
        
        noise.start(now);
        osc.start(now);
        noise.stop(now + 0.2);
        osc.stop(now + 0.2);
        break;
      }
      case 'hihat': {
        // Standard Noise Hihat
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer();
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.05);
        break;
      }
      case 'clap': {
        // Standard Noise Clap
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer();
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.3);
        break;
      }
      case 'piano': {
        // Harmonized Melodic Piano
        const pianoNotes = notes || ['C4'];
        pianoNotes.forEach(note => {
          const freq = noteToFreq(note);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.connect(reverb);
          
          osc.start(now);
          osc.stop(now + 1.5);
        });
        break;
      }
    }
  }, []);

  const getStepDuration = (subdivision: Subdivision, bpm: number) => {
    const secondsPerBeat = 60.0 / bpm;
    switch (subdivision) {
      case '16th': return 0.25 * secondsPerBeat;
      case '8th': return 0.5 * secondsPerBeat;
      case 'triplet': return (1/3) * secondsPerBeat;
      default: return 0.25 * secondsPerBeat;
    }
  };

  const playLiveSound = useCallback((x: number, y: number, time?: number) => {
    initAudio();
    const ctx = audioContextRef.current;
    const reverb = reverbNodeRef.current;
    if (!ctx || !reverb) return;

    const now = time || ctx.currentTime;
    
    // C Minor Pentatonic Scale
    const scale = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16, 523.25];
    const index = Math.floor((1 - y) * scale.length);
    const freq = scale[Math.min(index, scale.length - 1)];
    const pan = (x * 2) - 1;

    const osc = ctx.createOscillator();
    const panner = ctx.createStereoPanner();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Use triangle for a more "marked" sound than sine
    osc.type = 'triangle';
    // Fast pitch slide for a "plucked" attack character
    osc.frequency.setValueAtTime(freq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);
    
    // Resonant filter for a "sharper" character
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
    filter.Q.setValueAtTime(5, now);

    panner.pan.setValueAtTime(pan, now);

    // Louder and sharper attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(reverb);

    osc.start(now);
    osc.stop(now + 0.8);
  }, [initAudio]);

  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    tracksRef.current.forEach((track, trackIndex) => {
      let nextTime = trackNextNoteTimeRef.current[track.id] || ctx.currentTime;
      
      while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
        const step = trackCurrentStepRef.current[track.id] || 0;
        
        if (track.steps[step]) {
          playSound(track.type, nextTime, track.notes?.[step] || undefined);
        }

        // Play nebula sound for the first track's timing (as a master clock)
        if (trackIndex === 0 && nebulaStrokesRef.current.length > 0) {
          const sliceWidth = 1 / 16;
          const sliceStart = step * sliceWidth;
          const sliceEnd = (step + 1) * sliceWidth;
          
          // Flatten all strokes into one array of points for the scheduler
          const allPoints = nebulaStrokesRef.current.flat();
          const pointsInSlice = allPoints.filter(p => p.x >= sliceStart && p.x < sliceEnd);
          if (pointsInSlice.length > 0) {
            const avgY = pointsInSlice.reduce((sum, p) => sum + p.y, 0) / pointsInSlice.length;
            playLiveSound(pointsInSlice[0].x, avgY, nextTime);
          }
        }
        
        const duration = getStepDuration(track.subdivision, bpm);
        nextTime += duration;
        trackNextNoteTimeRef.current[track.id] = nextTime;
        
        const nextStep = (step + 1) % 16;
        trackCurrentStepRef.current[track.id] = nextStep;
        
        // Update state for UI
        setTrackSteps(prev => ({ ...prev, [track.id]: step }));
      }
    });

    timerIDRef.current = window.setTimeout(scheduler, LOOK_AHEAD);
  }, [bpm, playSound, playLiveSound]);

  const togglePlay = useCallback(() => {
    initAudio();
    if (isPlaying) {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      setIsPlaying(false);
    } else {
      const ctx = audioContextRef.current!;
      const startTime = ctx.currentTime + 0.05;
      
      const initialSteps: Record<string, number> = {};
      const initialTimes: Record<string, number> = {};
      
      tracksRef.current.forEach(track => {
        initialSteps[track.id] = 0;
        initialTimes[track.id] = startTime;
      });
      
      trackCurrentStepRef.current = initialSteps;
      trackNextNoteTimeRef.current = initialTimes;
      setTrackSteps(initialSteps);
      
      setIsPlaying(true);
      scheduler();
    }
  }, [isPlaying, scheduler, initAudio]);

  const playImpactSound = useCallback(() => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Harmonized blip (G5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }, [initAudio]);

  const playShootingStarImpact = useCallback((index: number) => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 4 different basic beats for impacts
    const freqs = [60, 150, 800, 1200];
    const types: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];
    
    osc.type = types[index % 4];
    osc.frequency.setValueAtTime(freqs[index % 4], now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }, [initAudio]);

  const playShootingStarDistance = useCallback((index: number) => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // 4 different melodic synth wave sounds (C Minor Pentatonic)
    const scale = [261.63, 311.13, 392.00, 466.16]; // C4, Eb4, G4, Bb4
    const freq = scale[index % 4];

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    if (reverbNodeRef.current) gain.connect(reverbNodeRef.current);

    osc.start(now);
    osc.stop(now + 0.2);
  }, [initAudio]);

  return { isPlaying, trackSteps, togglePlay, playLiveSound, playImpactSound, playShootingStarImpact, playShootingStarDistance };
}
