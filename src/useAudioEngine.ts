import { useEffect, useRef, useState } from 'react';
import { Track, Subdivision } from './types';

const LOOK_AHEAD = 25.0; // How often to call scheduler (ms)
const SCHEDULE_AHEAD_TIME = 0.1; // How far ahead to schedule audio (s)

export function useAudioEngine(bpm: number, tracks: Track[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackSteps, setTrackSteps] = useState<Record<string, number>>({});
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const timerIDRef = useRef<number | null>(null);
  const tracksRef = useRef(tracks);
  
  // Track-specific timing
  const trackNextNoteTimeRef = useRef<Record<string, number>>({});
  const trackCurrentStepRef = useRef<Record<string, number>>({});

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

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

  const initAudio = () => {
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
  };

  const noteToFreq = (note: string) => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const key = notes.indexOf(note.slice(0, -1));
    return 440 * Math.pow(2, (octave - 4) + (key - 9) / 12);
  };

  const playSound = (type: string, time: number, notes?: string[]) => {
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
        // CYBERJAZZ KICK: Deep sub with FM grit
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();
        
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);
        
        mod.frequency.setValueAtTime(150, now);
        modGain.gain.setValueAtTime(50, now);
        modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(gain);
        
        // Connect to destination and reverb
        gain.connect(ctx.destination);
        gain.connect(reverb);
        
        osc.start(now);
        mod.start(now);
        osc.stop(now + 0.6);
        mod.stop(now + 0.6);
        break;
      }
      case 'snare': {
        // CYBERJAZZ SNARE: Brushing noise + resonant sweep
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.2);
        filter.Q.value = 5;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        noise.connect(filter);
        filter.connect(gain);
        
        gain.connect(ctx.destination);
        gain.connect(reverb);
        
        noise.start(now);
        noise.stop(now + 0.25);
        break;
      }
      case 'hihat': {
        // CYBERJAZZ TWINKLE: FM Bell
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();
        
        carrier.frequency.value = 8000;
        modulator.frequency.value = 3500;
        modGain.gain.value = 2000;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(gain);
        
        gain.connect(ctx.destination);
        gain.connect(reverb);
        
        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + 0.15);
        modulator.stop(now + 0.15);
        break;
      }
      case 'clap': {
        // CYBERJAZZ SYNTH: Jazzy chords (Cm9/F13 vibes)
        const chord = [261.63, 311.13, 392.00, 466.16, 523.25]; // C, Eb, G, Bb, D (Cm9)
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
          osc.frequency.value = freq;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3000, now);
          filter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
          filter.Q.value = 8;
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.02); // 0.1 * 5 = 0.5 total
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          
          osc.connect(filter);
          filter.connect(gain);
          
          gain.connect(ctx.destination);
          gain.connect(reverb);
          
          osc.start(now);
          osc.stop(now + 0.6);
        });
        break;
      }
      case 'piano': {
        // STARDUST PIANO: FM Piano synthesis
        const pianoNotes = notes || ['C4'];
        pianoNotes.forEach(note => {
          const freq = noteToFreq(note);
          
          // Carrier
          const carrier = ctx.createOscillator();
          carrier.type = 'sine';
          carrier.frequency.setValueAtTime(freq, now);
          
          // Modulator
          const modulator = ctx.createOscillator();
          modulator.type = 'sine';
          modulator.frequency.setValueAtTime(freq * 2, now);
          
          const modGain = ctx.createGain();
          modGain.gain.setValueAtTime(freq * 0.5, now);
          modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          
          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(gain);
          
          gain.connect(ctx.destination);
          gain.connect(reverb);
          
          carrier.start(now);
          modulator.start(now);
          carrier.stop(now + 0.8);
          modulator.stop(now + 0.8);
        });
        break;
      }
    }
  };

  const getStepDuration = (subdivision: Subdivision, bpm: number) => {
    const secondsPerBeat = 60.0 / bpm;
    switch (subdivision) {
      case '16th': return 0.25 * secondsPerBeat;
      case '8th': return 0.5 * secondsPerBeat;
      case 'triplet': return (1/3) * secondsPerBeat;
      default: return 0.25 * secondsPerBeat;
    }
  };

  const scheduler = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    tracksRef.current.forEach(track => {
      let nextTime = trackNextNoteTimeRef.current[track.id] || ctx.currentTime;
      
      while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
        const step = trackCurrentStepRef.current[track.id] || 0;
        
        if (track.steps[step]) {
          playSound(track.type, nextTime, track.notes?.[step] || undefined);
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
  };

  const togglePlay = () => {
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
  };

  return { isPlaying, trackSteps, togglePlay };
}
