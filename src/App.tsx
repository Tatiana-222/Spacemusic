/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sun, Moon, Star, RotateCcw, Rocket, Orbit, Sparkles, Zap, Music2, Palette } from 'lucide-react';
import { INITIAL_TRACKS, Track, Subdivision } from './types';
import { useAudioEngine } from './useAudioEngine';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<boolean | null>(null);
  const [editingPianoStep, setEditingPianoStep] = useState<{ trackId: string, stepIndex: number } | null>(null);
  const [nebulaStrokes, setNebulaStrokes] = useState<{ points: { x: number, y: number }[], color: string }[]>([]);

  const memoizedStrokes = React.useMemo(() => nebulaStrokes.map(s => s.points), [nebulaStrokes]);
  const { isPlaying, trackSteps, togglePlay, playLiveSound, playImpactSound, playShootingStarImpact, playShootingStarDistance } = useAudioEngine(bpm, tracks, memoizedStrokes);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const launcherCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCanvasDrawing, setIsCanvasDrawing] = useState(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);
  const currentPos = useRef<{ x: number, y: number } | null>(null);
  const rocketAngleRef = useRef<number>(0);

  // Physics objects for the Nebula Canvas
  const starsRef = useRef<{ x: number, y: number, vx: number, vy: number, size: number, type: 'star' | 'planet', color: string }[]>([]);
  const nebulaStrokesRef = useRef<{ points: { x: number, y: number }[], color: string }[]>([]);
  const tracksRef = useRef(tracks);
  const isPlayingRef = useRef(isPlaying);
  const trackStepsRef = useRef(trackSteps);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    nebulaStrokesRef.current = nebulaStrokes;
  }, [nebulaStrokes]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    trackStepsRef.current = trackSteps;
  }, [trackSteps]);
  
  // Shooting Stars logic
  const shootingStarsRef = useRef<{ 
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    color: string, 
    index: number, 
    life: number, 
    distanceTraveled: number 
  }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Initialize stars only if they don't exist yet
      if (starsRef.current.length === 0) {
        const stars: any[] = [];
        const numStars = 100;
        const starColors = isDarkMode ? ['#5b21b6', '#ffffff', '#fb7185'] : ['#f9a8d4', '#ffffff', '#d8b4fe']; // Violet 800, White, Rose 400 in Dark
        for (let i = 0; i < numStars; i++) {
          const rand = Math.random();
          let type: 'sun' | 'planet' | 'star';
          let color: string;
          let size: number;

          if (rand > 0.85) {
            type = 'sun';
            color = '#fef9c3'; // Pale yellow sun
            size = Math.random() * 3 + 3; // Small
          } else {
            type = 'star';
            color = starColors[Math.floor(Math.random() * starColors.length)];
            size = Math.random() * 1.2 + 0.6; // Small stars
          }

          stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size,
            type,
            color
          });
        }
        starsRef.current = stars;
      } else {
        // Update star colors when theme changes
        const starColors = isDarkMode ? ['#60a5fa', '#ffffff', '#fb7185'] : ['#f9a8d4', '#ffffff', '#d8b4fe'];
        starsRef.current.forEach(star => {
          if (star.type === 'star') {
            star.color = starColors[Math.floor(Math.random() * starColors.length)];
          }
        });
        // If they exist, just make sure they are within bounds after resize
        starsRef.current.forEach(star => {
          star.x = Math.min(star.x, canvas.width);
          star.y = Math.min(star.y, canvas.height);
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let animationFrameId: number;

    const render = () => {
      // Fade effect for the background elements (Light Pastel Pink or Dark Space)
      ctx.fillStyle = isDarkMode ? 'rgba(10, 5, 26, 0.15)' : 'rgba(255, 241, 242, 0.15)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw persistent nebula strokes
      if (nebulaStrokesRef.current.length > 0) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        nebulaStrokesRef.current.forEach((stroke) => {
          if (stroke.points.length === 0) return;
          
          // Create gradient for the stroke (Orange to Purple in Light, Blue to Pink in Dark)
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          if (isDarkMode) {
            gradient.addColorStop(0, '#5b21b6'); // Violet 800
            gradient.addColorStop(0.5, '#93c5fd'); // Blue 300
            gradient.addColorStop(1, '#fb7185'); // Rose 400
          } else {
            gradient.addColorStop(0, '#fdba74'); // Orange
            gradient.addColorStop(1, '#d8b4fe'); // Purple
          }
          
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 5;
          ctx.shadowBlur = 15;
          ctx.shadowColor = isDarkMode ? 'rgba(96, 165, 250, 0.5)' : 'rgba(216, 180, 254, 0.5)'; // Blue or Purple glow
          
          stroke.points.forEach((p, i) => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        });
        ctx.restore();
      }

      // Draw scanning line synced with sequencer
      if (isPlayingRef.current) {
        const currentStep = trackStepsRef.current[tracksRef.current[0]?.id] || 0;
        const scanX = (currentStep / 16) * canvas.width;
        ctx.save();
        ctx.strokeStyle = isDarkMode ? 'rgba(59, 130, 246, 0.8)' : 'rgba(251, 113, 133, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, canvas.height);
        ctx.stroke();
        
        // Glow on scan line
        ctx.strokeStyle = isDarkMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(251, 113, 133, 0.4)';
        ctx.lineWidth = 12;
        ctx.setLineDash([]); // Solid glow
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, canvas.height);
        ctx.stroke();
        ctx.restore();
      }

      // Update and draw stars
      starsRef.current.forEach(star => {
        // Apply velocity
        star.x += star.vx;
        star.y += star.vy;

        // Bounce off walls
        if (star.x < 0 || star.x > canvas.width) star.vx *= -1;
        if (star.y < 0 || star.y > canvas.height) star.vy *= -1;

        // Rocket interaction (push)
        if (currentPos.current) {
          const dx = star.x - currentPos.current.x;
          const dy = star.y - currentPos.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pushRadius = 60;

          if (dist < pushRadius) {
            const angle = Math.atan2(dy, dx);
            const force = (pushRadius - dist) / pushRadius;
            
            // Apply push force
            star.vx += Math.cos(angle) * force * 2;
            star.vy += Math.sin(angle) * force * 2;
            
            // Impact sound if not already moving fast
            if (Math.abs(star.vx) + Math.abs(star.vy) > 3 && Math.random() > 0.9) {
              playImpactSound();
            }
          }
        }

        // Friction
        star.vx *= 0.98;
        star.vy *= 0.98;

        // Draw star/planet/sun (Flat Design)
        ctx.fillStyle = star.color;
        ctx.beginPath();
        if (star.type === 'star') {
          // 4-pointed star shape
          const cx = star.x;
          const cy = star.y;
          const outerRadius = star.size * 1.5;
          const innerRadius = star.size * 0.4;
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx.lineTo(cx + Math.cos(angle) * outerRadius, cy + Math.sin(angle) * outerRadius);
            ctx.lineTo(cx + Math.cos(angle + Math.PI / 4) * innerRadius, cy + Math.sin(angle + Math.PI / 4) * innerRadius);
          }
          ctx.closePath();
          ctx.fill();
          // Add a small glow in the center
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(cx, cy, star.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (star.type === 'sun') {
          const cx = star.x;
          const cy = star.y;
          const radius = star.size;
          
          ctx.save();
          ctx.translate(cx, cy);
          
          if (isDarkMode) {
            // Flat Design Moon (Crescent)
            ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = '#e0e7ff'; // Indigo 100
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Cutout for crescent
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(radius * 0.5, -radius * 0.2, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            
            // Subtle glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(165, 180, 252, 0.4)';
          } else {
            // Flat Design Sun with rays
            // Rays
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            for (let i = 0; i < 8; i++) {
              ctx.beginPath();
              ctx.moveTo(0, radius + 2);
              ctx.lineTo(0, radius + 5);
              ctx.stroke();
              ctx.rotate(Math.PI / 4);
            }
            
            // Core
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else {
          // Planet with a ring and a small crater
          const cx = star.x;
          const cy = star.y;
          const radius = star.size * 1.5;
          
          // Main body
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Crater
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
          
          // Ring
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius * 2.2, radius * 0.6, Math.PI / 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw Rocket Cursor
      if (currentPos.current) {
        ctx.save();
        ctx.translate(currentPos.current.x, currentPos.current.y);
        
        // Calculate and smooth rotation based on movement
        if (lastPos.current && (Math.abs(currentPos.current.x - lastPos.current.x) > 0.1 || Math.abs(currentPos.current.y - lastPos.current.y) > 0.1)) {
          const targetAngle = Math.atan2(currentPos.current.y - lastPos.current.y, currentPos.current.x - lastPos.current.x);
          
          // Smoothly interpolate the angle (lerp)
          let diff = targetAngle - rocketAngleRef.current;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          rocketAngleRef.current += diff * 0.2;
        }
        
        ctx.rotate(rocketAngleRef.current + Math.PI / 2);

        // Rocket Body (Detailed Flat Design)
        // Main Body (Light Blue or Light Pink)
        ctx.fillStyle = isDarkMode ? '#eff6ff' : '#fff1f2'; 
        ctx.beginPath();
        ctx.moveTo(0, -20); // Pointy tip
        ctx.bezierCurveTo(10, -10, 10, 5, 8, 10);
        ctx.lineTo(-8, 10);
        ctx.bezierCurveTo(-10, 5, -10, -10, 0, -20);
        ctx.fill();

        // Rocket Tip (Blue or Rose/Orange)
        ctx.fillStyle = isDarkMode ? '#3b82f6' : '#fb923c';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.bezierCurveTo(5, -15, 5, -12, 6, -10);
        ctx.lineTo(-6, -10);
        ctx.bezierCurveTo(-5, -12, -5, -15, 0, -20);
        ctx.fill();

        // Window (Light Blue or Yellow)
        ctx.fillStyle = isDarkMode ? '#dbeafe' : '#fef08a';
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isDarkMode ? '#60a5fa' : '#fbbf24';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Fins (Violet or Rose)
        ctx.fillStyle = isDarkMode ? '#a78bfa' : '#fb7185';
        // Left Fin
        ctx.beginPath();
        ctx.moveTo(-8, 2);
        ctx.lineTo(-14, 12);
        ctx.lineTo(-8, 10);
        ctx.fill();
        // Right Fin
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(14, 12);
        ctx.lineTo(8, 10);
        ctx.fill();

        // Rocket Flame
        if (isCanvasDrawing) {
          ctx.fillStyle = '#fbbf24'; // Amber 400
          ctx.beginPath();
          ctx.moveTo(-4, 10);
          ctx.lineTo(0, 25 + Math.random() * 10);
          ctx.lineTo(4, 10);
          ctx.fill();
          
          // Inner flame
          ctx.fillStyle = '#f97316'; // Orange 500
          ctx.beginPath();
          ctx.moveTo(-2, 10);
          ctx.lineTo(0, 18 + Math.random() * 5);
          ctx.lineTo(2, 10);
          ctx.fill();
        }
        
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isCanvasDrawing, playImpactSound, isDarkMode]);

  // Shooting Stars Animation Loop
  useEffect(() => {
    const canvas = launcherCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationFrameId: number;

    const render = () => {
      ctx.fillStyle = isDarkMode ? 'rgba(10, 5, 26, 0.2)' : 'rgba(255, 241, 242, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      shootingStarsRef.current = shootingStarsRef.current.filter(star => {
        const age = (now - star.life) / 1000;
        if (age > 3) return false;

        // Physics
        const prevX = star.x;
        const prevY = star.y;
        star.x += star.vx;
        star.y += star.vy;

        // Bounce
        let hit = false;
        if (star.x < 0 || star.x > canvas.width) {
          star.vx *= -1;
          hit = true;
        }
        if (star.y < 0 || star.y > canvas.height) {
          star.vy *= -1;
          hit = true;
        }

        if (hit) {
          playShootingStarImpact(star.index);
        }

        // Distance sound
        const dx = star.x - prevX;
        const dy = star.y - prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        star.distanceTraveled += dist;

        if (star.distanceTraveled > 100) {
          playShootingStarDistance(star.index);
          star.distanceTraveled = 0;
        }

        // Draw
        const opacity = 1 - age / 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = star.color;
        ctx.fillStyle = star.color;
        ctx.globalAlpha = opacity;
        
        // Star head
        ctx.beginPath();
        ctx.arc(star.x, star.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x - star.vx * 5, star.y - star.vy * 5);
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        return true;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [playShootingStarImpact, playShootingStarDistance, isDarkMode]);

  const launchShootingStar = (index: number) => {
    const canvas = launcherCanvasRef.current;
    if (!canvas) return;

    const colors = isDarkMode 
      ? ['#5b21b6', '#c4b5fd', '#93c5fd', '#1e40af'] // Violet 800, Violet 300, Blue 300, Blue 800
      : ['#fdba74', '#fef08a', '#f9a8d4', '#d8b4fe']; // Orange, Yellow, Pink, Purple
    const x = (index + 0.5) * (canvas.width / 4);
    const y = canvas.height - 20;

    shootingStarsRef.current.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 15 - 5,
      color: colors[index],
      index,
      life: Date.now(),
      distanceTraveled: 0
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentPos.current = { x, y };

    if (!isCanvasDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Play violin sound based on position
    playLiveSound(x / canvas.width, y / canvas.height);

    // Add point to nebula
    setNebulaStrokes(prev => {
      if (prev.length === 0) return prev;
      const newStrokes = [...prev];
      const lastStrokeIndex = newStrokes.length - 1;
      const lastStroke = { ...newStrokes[lastStrokeIndex] };
      lastStroke.points = [...lastStroke.points, { x: x / canvas.width, y: y / canvas.height }];
      newStrokes[lastStrokeIndex] = lastStroke;
      return newStrokes;
    });

    lastPos.current = { x, y };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsCanvasDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastPos.current = { x, y };
      currentPos.current = { x, y };
      
      // Start a new stroke (color is now handled by gradient in renderer)
      const canvas = canvasRef.current!;
      setNebulaStrokes(prev => [...prev, { 
        points: [{ x: x / canvas.width, y: y / canvas.height }], 
        color: isDarkMode ? '#60a5fa' : '#fdba74' // Default start color
      }]);
    }
  };

  const handleCanvasPointerUp = () => {
    setIsCanvasDrawing(false);
    lastPos.current = null;
  };

  const handleCanvasPointerLeave = () => {
    setIsCanvasDrawing(false);
    lastPos.current = null;
    currentPos.current = null;
  };

  const toggleStep = useCallback((trackId: string, stepIndex: number, forceValue?: boolean) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        const newSteps = [...track.steps];
        newSteps[stepIndex] = forceValue !== undefined ? forceValue : !newSteps[stepIndex];
        return { ...track, steps: newSteps };
      }
      return track;
    }));
  }, []);

  const updateNote = (trackId: string, stepIndex: number, note: string) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId && track.notes) {
        const newNotes = [...track.notes];
        newNotes[stepIndex] = [note];
        return { ...track, notes: newNotes };
      }
      return track;
    }));
    setEditingPianoStep(null);
  };

  const randomize = () => {
    setTracks(prev => prev.map(track => {
      const newSteps = Array(16).fill(false);
      const indices = Array.from({ length: 16 }, (_, i) => i);
      
      // Shuffle indices
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      
      // Select exactly 8 steps
      const numToSelect = 8;
      for (let i = 0; i < numToSelect; i++) {
        newSteps[indices[i]] = true;
      }

      let newNotes = track.notes;
      if (track.type === 'piano') {
        const scale = ['C3', 'Eb3', 'F3', 'G3', 'Bb3', 'C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5'];
        newNotes = newSteps.map(() => [scale[Math.floor(Math.random() * scale.length)]]);
      }
      return { ...track, steps: newSteps, notes: newNotes };
    }));
  };

  const updateSubdivision = (trackId: string, subdivision: Subdivision) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, subdivision } : track
    ));
  };

  const handlePointerDown = (trackId: string, stepIndex: number, currentState: boolean) => {
    setIsDrawing(true);
    const newValue = !currentState;
    setDrawMode(newValue);
    toggleStep(trackId, stepIndex, newValue);
  };

  const handlePointerEnter = (trackId: string, stepIndex: number) => {
    if (isDrawing && drawMode !== null) {
      toggleStep(trackId, stepIndex, drawMode);
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setDrawMode(null);
  };

  const clearGrid = () => {
    setTracks(prev => prev.map(track => ({ ...track, steps: Array(16).fill(false) })));
  };

  const getTrackIcon = (id: string) => {
    switch (id) {
      case 'asteroid': return <Orbit className="w-4 h-4" />;
      case 'shooting_star': return <Sparkles className="w-4 h-4" />;
      case 'twinkle': return <Star className="w-4 h-4" />;
      case 'synthwave': return <Music2 className="w-4 h-4" />;
      case 'stardust_piano': return <Sparkles className="w-4 h-4" />;
      default: return <Orbit className="w-4 h-4" />;
    }
  };

  const getTrackColor = (track: Track) => {
    if (!isDarkMode) return track.color;
    switch (track.id) {
      case 'asteroid': return 'bg-violet-800';
      case 'shooting_star': return 'bg-violet-300';
      case 'twinkle': return 'bg-blue-300';
      case 'synthwave': return 'bg-blue-800';
      case 'stardust_piano': return 'bg-rose-400';
      default: return track.color;
    }
  };

  const PianoNoteSelector = ({ currentNote, onSelect, onClose }: { currentNote: string, onSelect: (note: string) => void, onClose: () => void }) => {
    const octaves = [3, 4, 5];
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    return (
      <div className={`absolute bottom-full left-0 mb-4 p-4 border-2 rounded-2xl z-[100] backdrop-blur-2xl grid grid-cols-12 gap-1 w-[420px] transition-all duration-700 ${
        isDarkMode 
          ? 'bg-blue-950/90 border-blue-500/40 shadow-[0_15px_60px_rgba(0,0,0,0.5)]' 
          : 'bg-white/90 border-orange-300 rounded-2xl shadow-[0_15px_60px_rgba(251,146,60,0.25)]'
      }`}>
        <div className="col-span-12 flex justify-between items-center mb-2 px-1">
          <span className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-700 ${isDarkMode ? 'text-blue-300' : 'text-orange-600'}`}>Select Frequency</span>
          <button onClick={onClose} className={`text-xs font-black transition-colors duration-700 ${isDarkMode ? 'text-blue-400 hover:text-blue-200' : 'text-orange-600 hover:text-orange-800'}`}>×</button>
        </div>
        {octaves.map(oct => (
          notes.map(n => {
            const note = `${n}${oct}`;
            const isSharp = n.includes('#');
            return (
              <button
                key={note}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(note);
                }}
                className={`w-full aspect-square text-[8px] font-black rounded-lg transition-all border-2 ${
                  currentNote === note 
                    ? (isDarkMode ? 'bg-blue-500 text-white shadow-[0_0_15px_#3b82f6] scale-110 border-blue-400' : 'bg-orange-500 text-white shadow-[0_0_15px_#f97316] scale-110 border-orange-600')
                    : isSharp 
                      ? (isDarkMode ? 'bg-violet-900/40 text-violet-300 hover:bg-violet-800/40 border-violet-800/20' : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200')
                      : (isDarkMode ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 border-blue-800/20' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200')
                }`}
              >
                {note}
              </button>
            );
          })
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`min-h-screen font-sans selection:bg-orange-200/30 overflow-x-hidden relative transition-colors duration-700 ${isDarkMode ? 'bg-[#0a051a] text-blue-100' : 'bg-[#fcfaf7] text-orange-950'}`}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Starry Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-gradient-to-tr from-orange-300/40 via-yellow-200/30 to-transparent rounded-full blur-[100px]" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-rose-200/30 via-violet-200/20 to-transparent rounded-full blur-[80px]" />
        </div>
        
        <div className={`absolute inset-0 transition-colors duration-700 ${isDarkMode ? 'bg-[radial-gradient(circle_at_50%_100%,rgba(191,219,254,0.1),transparent_70%)]' : 'bg-[radial-gradient(circle_at_50%_100%,rgba(251,146,60,0.15),transparent_70%)]'}`} />
        <div className={`absolute bottom-0 left-0 right-0 h-96 transition-colors duration-700 pointer-events-none ${isDarkMode ? 'bg-gradient-to-t from-blue-950/40 via-violet-950/20 to-transparent' : 'bg-gradient-to-t from-orange-200/20 via-yellow-100/10 to-transparent'}`} />
        {Array(60).fill(0).map((_, i) => (
          <div 
            key={i}
            className={`absolute rounded-full animate-pulse transition-colors duration-700 ${isDarkMode ? 'bg-blue-200' : 'bg-orange-400'}`}
            style={{
              width: Math.random() * 2 + 'px',
              height: Math.random() * 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.2,
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 3 + 2 + 's'
            }}
          />
        ))}
      </div>

      {/* Header / Controls */}
      <header className={`border-b transition-colors duration-700 backdrop-blur-2xl fixed top-0 left-0 right-0 z-[100] ${isDarkMode ? 'border-blue-500/20 bg-black/40' : 'border-orange-200/40 bg-white/60'}`}>
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border transition-all duration-700 ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-violet-600 border-blue-200/30 shadow-blue-900/40' : 'bg-gradient-to-br from-orange-300 to-yellow-300 border-white/50 shadow-orange-200/30'}`}>
              <Rocket className={`w-6 h-6 -rotate-45 transition-colors duration-700 ${isDarkMode ? 'text-blue-100' : 'text-white'}`} />
            </div>
            <div>
              <h1 className={`font-black tracking-tighter text-2xl bg-clip-text text-transparent uppercase transition-all duration-700 ${isDarkMode ? 'bg-gradient-to-r from-violet-800 via-blue-300 to-rose-400' : 'bg-gradient-to-r from-orange-700 via-yellow-600 via-pink-600 to-purple-600'}`}>SPACE MUSIC</h1>
              <p className={`text-[9px] uppercase tracking-[0.3em] font-bold transition-colors duration-700 ${isDarkMode ? 'text-violet-300' : 'text-orange-800'}`}>Interstellar Poly-Rhythm Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <span className={`text-[9px] uppercase tracking-widest mb-1 font-black transition-colors duration-700 ${isDarkMode ? 'text-blue-300' : 'text-orange-900'}`}>Warp Speed (BPM)</span>
              <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border-2 shadow-md transition-all duration-700 ${isDarkMode ? 'bg-blue-950/40 border-blue-500/30' : 'bg-white border-orange-400/50'}`}>
                <input 
                  type="range" 
                  min="60" 
                  max="200" 
                  value={bpm} 
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className={`w-32 transition-all duration-700 ${isDarkMode ? 'accent-blue-500' : 'accent-orange-500'}`}
                />
                <span className={`font-mono text-xl w-10 text-center font-black transition-colors duration-700 ${isDarkMode ? 'text-blue-100' : 'text-orange-950'}`}>{bpm}</span>
              </div>
            </div>

            <div className={`h-10 w-[1px] transition-colors duration-700 ${isDarkMode ? 'bg-blue-200/20' : 'bg-rose-200/40'}`} />

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-3 rounded-2xl transition-all active:scale-95 border-2 shadow-sm ${
                  isDarkMode 
                    ? 'bg-blue-900/40 border-blue-500/30 text-blue-200 hover:bg-blue-800/40' 
                    : 'bg-white/80 border-orange-300/40 text-orange-600 hover:bg-white'
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button 
                onClick={togglePlay}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all active:scale-95 group relative overflow-hidden border-2 ${
                  isPlaying 
                    ? (isDarkMode ? 'bg-violet-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] border-violet-600' : 'bg-rose-500 text-white shadow-[0_0_25px_rgba(251,113,133,0.4)] border-rose-600')
                    : (isDarkMode ? 'bg-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] border-blue-600' : 'bg-orange-400 text-white shadow-[0_0_25px_rgba(251,146,60,0.4)] border-orange-500')
                }`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative flex items-center gap-2">
                  {isPlaying ? <Orbit className="w-5 h-5 animate-spin-slow" /> : <Rocket className="w-5 h-5 -rotate-45" />}
                  {isPlaying ? 'ABORT' : 'LAUNCH'}
                </span>
              </button>

              <button 
                onClick={randomize}
                className={`p-3 rounded-2xl transition-all group relative shadow-sm border-2 ${
                  isDarkMode 
                    ? 'bg-blue-900/40 border-blue-500/30 hover:bg-blue-800/40' 
                    : 'bg-white/80 border-orange-300/40 hover:bg-white'
                }`}
                title="Randomize Universe"
              >
                {isDarkMode ? (
                  <Moon className={`w-5 h-5 animate-spin-slow transition-colors duration-700 text-blue-300 group-hover:text-blue-100`} />
                ) : (
                  <Sun className={`w-5 h-5 animate-spin-slow transition-colors duration-700 text-orange-600 group-hover:text-orange-800`} />
                )}
                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping ${isDarkMode ? 'bg-blue-200' : 'bg-yellow-500'}`} />
              </button>

              <button 
                onClick={clearGrid}
                className={`p-3 rounded-2xl transition-all group shadow-sm border-2 ${
                  isDarkMode 
                    ? 'bg-blue-900/40 border-blue-500/30 hover:bg-blue-800/40' 
                    : 'bg-white/80 border-orange-300/40 hover:bg-white'
                }`}
                title="Reset Universe"
              >
                <RotateCcw className={`w-5 h-5 transition-all group-hover:rotate-[-120deg] ${isDarkMode ? 'text-violet-200 group-hover:text-violet-100' : 'text-rose-600 group-hover:text-rose-800'}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-32 pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Sequencer Grid */}
          <div className="lg:col-span-2 space-y-12">
            <div className={`rounded-[40px] p-10 border-2 transition-all duration-700 backdrop-blur-sm relative overflow-hidden ${isDarkMode ? 'bg-blue-950/40 border-blue-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-orange-300/60 shadow-[0_25px_70px_rgba(251,146,60,0.15)]'}`}>
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

              <div className="relative z-10 space-y-12">
                {/* Star Playhead Overlay */}
                {isPlaying && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="ml-[192px] h-full relative">
                      <div 
                        className="absolute top-0 bottom-0 w-px flex flex-col items-center justify-around"
                        style={{
                          left: `${(trackSteps[tracks[0].id] || 0) * (100 / 16) + (100 / 32)}%`,
                          transition: 'left 0.1s linear'
                        }}
                      >
                        <div className={`absolute inset-0 border-l-4 border-dashed transition-colors duration-700 ${isDarkMode ? 'border-blue-200/80' : 'border-orange-600/80'}`} />
                        <div className={`absolute inset-0 blur-xl transition-colors duration-700 ${isDarkMode ? 'bg-blue-200/20' : 'bg-orange-600/20'}`} />
                      </div>
                    </div>
                  </div>
                )}

                {tracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-8">
                    <div className="w-40 shrink-0 flex flex-col gap-2">
                      <div className={`flex items-center gap-2 font-black transition-colors duration-700 ${isDarkMode ? 'text-blue-100' : 'text-orange-950'}`}>
                        {getTrackIcon(track.id)}
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase">{track.name}</span>
                      </div>
                      
                      {/* Subdivision Selector */}
                      <div className={`flex rounded-lg p-1 border-2 shadow-sm transition-all duration-700 ${isDarkMode ? 'bg-blue-900/40 border-blue-500/30' : 'bg-white border-orange-200'}`}>
                        {(['16th', '8th', 'triplet'] as Subdivision[]).map((sub) => (
                          <button
                            key={sub}
                            onClick={() => updateSubdivision(track.id, sub)}
                            className={`flex-1 py-1 text-[8px] font-black rounded transition-all ${
                              track.subdivision === sub 
                                ? (isDarkMode ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-orange-500 text-white shadow-[0_0_10px_rgba(251,146,60,0.4)]')
                                : (isDarkMode ? 'text-blue-300 hover:text-blue-100 hover:bg-blue-800/40' : 'text-orange-800 hover:text-orange-950 hover:bg-orange-50')
                            }`}
                          >
                            {sub === '16th' ? '1/16' : sub === '8th' ? '1/8' : '1/3'}
                          </button>
                        ))}
                      </div>
                      
                      <div className={`h-2 w-full rounded-full ${getTrackColor(track)} shadow-md border border-white/40`} />
                    </div>
                    
                    <div className="grid grid-cols-16 gap-3 flex-1 touch-none">
                      {track.steps.map((isActive, i) => (
                        <div
                          key={i}
                          onPointerDown={() => handlePointerDown(track.id, i, isActive)}
                          onPointerEnter={() => handlePointerEnter(track.id, i)}
                          onContextMenu={(e) => {
                            if (track.type === 'piano') {
                              e.preventDefault();
                              setEditingPianoStep({ trackId: track.id, stepIndex: i });
                            }
                          }}
                          className={`
                            aspect-square rounded-xl cursor-pointer transition-all duration-300 relative group border-2
                            ${isActive 
                              ? `${getTrackColor(track)} shadow-[0_8px_20px_rgba(0,0,0,0.15)] scale-100 border-white` 
                              : (isDarkMode ? 'bg-blue-900/20 hover:bg-blue-800/20 border-blue-800/40' : 'bg-white hover:bg-orange-50 border-orange-200')}
                            ${trackSteps[track.id] === i && isPlaying ? `ring-4 ${isDarkMode ? 'ring-blue-500' : 'ring-orange-500'} ring-offset-4 ${isDarkMode ? 'ring-offset-blue-950' : 'ring-offset-white'} scale-110 z-20` : ''}
                            ${i % 4 === 0 ? `after:content-[""] after:absolute after:-left-[7px] after:top-1/4 after:bottom-1/4 after:w-[2px] ${isDarkMode ? 'after:bg-blue-500/40' : 'after:bg-orange-600/40'}` : ''}
                          `}
                        >
                          {/* Piano Note Label */}
                          {track.type === 'piano' && isActive && (
                            <div 
                              className="absolute -top-1 -right-1 bg-white/90 text-[6px] font-bold px-1 rounded border border-violet-200/20 text-violet-600 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPianoStep({ trackId: track.id, stepIndex: i });
                              }}
                            >
                              {track.notes?.[i]?.[0]}
                            </div>
                          )}

                          {/* Piano Note Selector */}
                          {editingPianoStep?.trackId === track.id && editingPianoStep?.stepIndex === i && (
                            <PianoNoteSelector 
                              currentNote={track.notes?.[i]?.[0] || 'C4'}
                              onSelect={(note) => updateNote(track.id, i, note)}
                              onClose={() => setEditingPianoStep(null)}
                            />
                          )}
                          {/* Star particles for the moving bar effect */}
                          {trackSteps[track.id] === i && isPlaying && (
                            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                              {[...Array(3)].map((_, starIdx) => (
                                <Star 
                                  key={starIdx}
                                  className={`absolute w-2 h-2 fill-current animate-star-pop transition-colors duration-700 ${isDarkMode ? 'text-blue-200' : 'text-rose-300'}`}
                                  style={{
                                    left: `${(Math.random() - 0.5) * 60}px`,
                                    top: `${(Math.random() - 0.5) * 60}px`,
                                    animationDelay: `${Math.random() * 0.2}s`
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-40">
                              <Star className="w-1/2 h-1/2 text-white fill-current" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Indicator (Global Pulse) */}
              <div className="mt-12 flex items-center gap-8">
                <div className="w-40" />
                <div className="grid grid-cols-16 gap-3 flex-1">
                  {Array(16).fill(0).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 relative">
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isPlaying && i % 4 === 0 ? (isDarkMode ? 'bg-blue-200 scale-150 shadow-[0_0_10px_rgba(191,219,254,0.5)]' : 'bg-orange-500 scale-150 shadow-[0_0_10px_rgba(251,146,60,0.5)]') : (isDarkMode ? 'bg-blue-800/40' : 'bg-rose-300/40')}`} />
                      <span className={`text-[7px] font-mono font-black transition-colors duration-700 ${isDarkMode ? 'text-blue-200/60' : 'text-rose-800/60'}`}>
                        {(i + 1).toString().padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Nebula Canvas (Drawing Area) */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`rounded-[40px] p-8 border-2 backdrop-blur-md h-[350px] flex flex-col transition-all duration-700 ${isDarkMode ? 'bg-blue-950/40 border-blue-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-orange-300/60 shadow-[0_25px_70px_rgba(251,146,60,0.15)]'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-md transition-all duration-700 ${isDarkMode ? 'bg-blue-900 border-blue-500/50' : 'bg-orange-200 border-orange-300'}`}>
                  <Palette className={`w-5 h-5 transition-colors duration-700 ${isDarkMode ? 'text-blue-300' : 'text-orange-600'}`} />
                </div>
                <div>
                  <h2 className={`text-xs font-black uppercase tracking-widest transition-colors duration-700 ${isDarkMode ? 'text-blue-100' : 'text-orange-950'}`}>Nebula Canvas</h2>
                  <p className={`text-[8px] font-black uppercase tracking-tighter transition-colors duration-700 ${isDarkMode ? 'text-blue-200' : 'text-orange-800'}`}>Real-time Sound Drawing</p>
                </div>
                
                <button 
                  onClick={() => setNebulaStrokes([])}
                  className={`ml-auto w-10 h-10 rounded-full flex items-center justify-center group relative overflow-hidden transition-all active:scale-95 shadow-md border-2 ${isDarkMode ? 'bg-blue-900/40 border-blue-500/30 hover:border-blue-400' : 'bg-white border-orange-300 hover:border-orange-500 hover:scale-110'}`}
                  title="Black Hole Reset"
                >
                  <div className={`absolute inset-0 animate-pulse ${isDarkMode ? 'bg-[radial-gradient(circle,rgba(59,130,246,0.2),transparent_70%)]' : 'bg-[radial-gradient(circle,rgba(251,146,60,0.2),transparent_70%)]'}`} />
                  <div className={`w-4 h-4 rounded-full border-2 relative z-10 transition-all ${isDarkMode ? 'bg-blue-950 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]' : 'bg-white border-orange-200 shadow-[0_0_15px_rgba(251,146,60,0.3)] group-hover:shadow-[0_0_25px_rgba(251,146,60,0.5)]'}`} />
                  <div className={`absolute inset-0 border-2 border-dashed rounded-full animate-moon-rotate ${isDarkMode ? 'border-blue-500/40' : 'border-orange-400'}`} />
                </button>
              </div>

              <div className={`flex-1 relative rounded-3xl overflow-hidden border-2 group shadow-inner transition-all duration-700 ${isDarkMode ? 'border-blue-500/30 bg-black/40' : 'border-orange-300/60 bg-white'}`}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerLeave}
                  className="w-full h-full cursor-none touch-none"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] rotate-90 transition-colors duration-700 ${isDarkMode ? 'text-blue-100/40' : 'text-orange-950/60'}`}>Pilot the sound</p>
                </div>
              </div>

              <div className={`mt-6 p-4 rounded-2xl border-2 shadow-sm transition-all duration-700 ${isDarkMode ? 'bg-blue-900/20 border-blue-500/20' : 'bg-orange-100/50 border-orange-200'}`}>
                <p className={`text-[9px] font-black leading-relaxed transition-colors duration-700 ${isDarkMode ? 'text-blue-300' : 'text-orange-950'}`}>
                  Trace your finger or mouse to generate celestial frequencies. The trail fades as it echoes into the void.
                </p>
              </div>
            </div>

            {/* Shooting Star Launcher */}
            <div className={`rounded-[40px] p-8 border-2 backdrop-blur-md flex flex-col h-[350px] transition-all duration-700 ${isDarkMode ? 'bg-blue-950/40 border-blue-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-orange-300/60 shadow-[0_25px_70px_rgba(251,146,60,0.15)]'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-md transition-all duration-700 ${isDarkMode ? 'bg-blue-900 border-blue-500/50' : 'bg-yellow-200 border-yellow-300'}`}>
                  <Sparkles className={`w-5 h-5 transition-colors duration-700 ${isDarkMode ? 'text-blue-300' : 'text-yellow-700'}`} />
                </div>
                <div>
                  <h2 className={`text-xs font-black uppercase tracking-widest transition-colors duration-700 ${isDarkMode ? 'text-blue-100' : 'text-orange-950'}`}>Shooting Star Launcher</h2>
                  <p className={`text-[8px] font-black uppercase tracking-tighter transition-colors duration-700 ${isDarkMode ? 'text-blue-200' : 'text-orange-800'}`}>Impact & Distance Synthesis</p>
                </div>
              </div>

              <div className={`flex-1 relative rounded-3xl overflow-hidden border-2 shadow-inner transition-all duration-700 ${isDarkMode ? 'border-blue-500/30 bg-black/40' : 'border-orange-300/60 bg-white'}`}>
                <canvas
                  ref={launcherCanvasRef}
                  className="absolute inset-0 w-full h-full"
                />
                
                <div className="absolute inset-0 flex gap-2 p-2 pointer-events-none">
                  {[
                    { color: isDarkMode ? '#5b21b6' : '#fdba74', bg: 'from-orange-300/20', darkBg: 'from-violet-900/20' },
                    { color: isDarkMode ? '#c4b5fd' : '#fef08a', bg: 'from-yellow-300/20', darkBg: 'from-violet-500/20' },
                    { color: isDarkMode ? '#93c5fd' : '#f9a8d4', bg: 'from-pink-300/20', darkBg: 'from-blue-500/20' },
                    { color: isDarkMode ? '#1e40af' : '#d8b4fe', bg: 'from-purple-300/20', darkBg: 'from-blue-900/20' }
                  ].map((theme, i) => (
                    <div 
                      key={i}
                      className={`flex-1 h-full rounded-xl border-2 transition-all flex items-end justify-center pb-4 group pointer-events-auto cursor-pointer hover:opacity-80 bg-gradient-to-t to-transparent ${isDarkMode ? `border-blue-500/20 ${theme.darkBg}` : `border-orange-200/40 ${theme.bg}`}`}
                      onClick={() => launchShootingStar(i)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full shadow-md transition-transform group-hover:scale-125" 
                        style={{ backgroundColor: theme.color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Space Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Deep Orbit', icon: Orbit, color: 'text-orange-600', darkColor: 'text-violet-800', desc: 'Dark violet gravitational waves.' },
            { label: 'Cloud Swing', icon: Sparkles, color: 'text-yellow-600', darkColor: 'text-violet-300', desc: 'Light violet temporal alignment.' },
            { label: 'Blue Mapping', icon: Star, color: 'text-pink-600', darkColor: 'text-blue-300', desc: 'Light blue celestial structures.' },
            { label: 'Rose Drive', icon: Rocket, color: 'text-purple-600', darkColor: 'text-rose-400', desc: 'Medium rose audio processing.' }
          ].map((stat, i) => (
            <div key={i} className={`p-6 rounded-3xl border-2 backdrop-blur-sm transition-all group shadow-md hover:shadow-xl ${isDarkMode ? 'bg-blue-950/40 border-blue-500/30 hover:bg-blue-900/40' : 'bg-white border-orange-300/60 hover:bg-orange-50'}`}>
              <stat.icon className={`w-6 h-6 ${isDarkMode ? stat.darkColor : stat.color} mb-4 group-hover:scale-110 transition-transform`} />
              <h3 className={`text-xs font-black uppercase tracking-widest mb-2 transition-colors duration-700 ${isDarkMode ? 'text-blue-100' : 'text-orange-950'}`}>{stat.label}</h3>
              <p className={`text-[10px] font-black leading-relaxed transition-colors duration-700 ${isDarkMode ? 'text-blue-300' : 'text-orange-950'}`}>{stat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        .grid-cols-16 {
          grid-template-columns: repeat(16, minmax(0, 1fr));
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes star-pop {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        @keyframes moon-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-moon-rotate {
          animation: moon-rotate 4s linear infinite;
        }
        .animate-star-pop {
          animation: star-pop 0.6s ease-out forwards;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: ${isDarkMode ? '#3b82f6' : '#fb923c'};
          cursor: pointer;
          box-shadow: 0 0 15px ${isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(251, 146, 60, 0.5)'};
          margin-top: -7px;
          border: 2px solid white;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(251, 146, 60, 0.2)'};
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}

