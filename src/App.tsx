/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Moon, Star, RotateCcw, Rocket, Orbit, Sparkles, Zap, Music2 } from 'lucide-react';
import { INITIAL_TRACKS, Track, Subdivision } from './types';
import { useAudioEngine } from './useAudioEngine';

export default function App() {
  const [bpm, setBpm] = useState(120);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<boolean | null>(null);
  const [editingPianoStep, setEditingPianoStep] = useState<{ trackId: string, stepIndex: number } | null>(null);

  const { isPlaying, trackSteps, togglePlay } = useAudioEngine(bpm, tracks);

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
      
      // Select at least 6 steps
      const numToSelect = Math.max(6, Math.floor(Math.random() * 10) + 6); // Random between 6 and 15
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

  const PianoNoteSelector = ({ currentNote, onSelect, onClose }: { currentNote: string, onSelect: (note: string) => void, onClose: () => void }) => {
    const octaves = [3, 4, 5];
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    return (
      <div className="absolute bottom-full left-0 mb-4 p-4 bg-purple-950/95 border border-purple-500/40 rounded-2xl z-[100] backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] grid grid-cols-12 gap-1 w-[420px]">
        <div className="col-span-12 flex justify-between items-center mb-2 px-1">
          <span className="text-[10px] font-black tracking-widest text-purple-300 uppercase">Select Frequency</span>
          <button onClick={onClose} className="text-purple-500 hover:text-white text-xs">×</button>
        </div>
        {octaves.map(oct => (
          notes.map(n => {
            const note = `${n}${oct}`;
            return (
              <button
                key={note}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(note);
                }}
                className={`w-full aspect-square text-[8px] font-bold rounded-lg transition-all ${
                  currentNote === note 
                    ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_#f0abfc] scale-110' 
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/60 border border-purple-500/10'
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
      className="min-h-screen bg-[#050208] text-purple-50 font-sans selection:bg-purple-500/30 overflow-x-hidden relative"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Starry Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(88,28,135,0.15),transparent_70%)]" />
        {Array(50).fill(0).map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: Math.random() * 2 + 'px',
              height: Math.random() * 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.7 + 0.3,
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 3 + 2 + 's'
            }}
          />
        ))}
      </div>

      {/* Header / Controls */}
      <header className="border-b border-purple-500/20 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Rocket className="text-white w-6 h-6 -rotate-45" />
            </div>
            <div>
              <h1 className="font-black tracking-tighter text-2xl bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">CYBERJAZZ GRID</h1>
              <p className="text-[9px] uppercase tracking-[0.3em] text-purple-400/60 font-bold">Interstellar Poly-Rhythm Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-widest text-purple-400/50 mb-1 font-bold">Warp Speed (BPM)</span>
              <div className="flex items-center gap-4 bg-purple-950/30 px-4 py-2 rounded-xl border border-purple-500/20">
                <input 
                  type="range" 
                  min="60" 
                  max="200" 
                  value={bpm} 
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="w-32 accent-fuchsia-500"
                />
                <span className="font-mono text-xl w-10 text-center text-fuchsia-300">{bpm}</span>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-purple-500/20" />

            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlay}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all active:scale-95 group relative overflow-hidden ${
                  isPlaying 
                    ? 'bg-rose-600 text-white shadow-[0_0_25px_rgba(225,29,72,0.4)]' 
                    : 'bg-violet-600 text-white shadow-[0_0_25px_rgba(124,58,237,0.4)]'
                }`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative flex items-center gap-2">
                  {isPlaying ? <Moon className="w-5 h-5 fill-current" /> : <Rocket className="w-5 h-5 -rotate-45" />}
                  {isPlaying ? 'ABORT' : 'LAUNCH'}
                </span>
              </button>

              <button 
                onClick={randomize}
                className="p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 transition-all group relative"
                title="Randomize Universe"
              >
                <Moon className="w-5 h-5 text-fuchsia-400 group-hover:text-fuchsia-200 animate-moon-rotate" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-fuchsia-500 rounded-full animate-ping" />
              </button>

              <button 
                onClick={clearGrid}
                className="p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 transition-all group"
                title="Reset Universe"
              >
                <RotateCcw className="w-5 h-5 text-purple-400 group-hover:text-fuchsia-300 group-hover:rotate-[-120deg] transition-all" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        {/* The Grid */}
        <div className="bg-purple-950/10 rounded-[40px] p-10 border border-purple-500/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

          <div className="relative z-10 space-y-12">
            {tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-8">
                <div className="w-40 shrink-0 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-purple-300/80">
                    {getTrackIcon(track.id)}
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">{track.name}</span>
                  </div>
                  
                  {/* Subdivision Selector */}
                  <div className="flex bg-purple-950/40 rounded-lg p-1 border border-purple-500/10">
                    {(['16th', '8th', 'triplet'] as Subdivision[]).map((sub) => (
                      <button
                        key={sub}
                        onClick={() => updateSubdivision(track.id, sub)}
                        className={`flex-1 py-1 text-[8px] font-bold rounded transition-all ${
                          track.subdivision === sub 
                            ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(192,38,211,0.3)]' 
                            : 'text-purple-400/60 hover:text-purple-300'
                        }`}
                      >
                        {sub === '16th' ? '1/16' : sub === '8th' ? '1/8' : '1/3'}
                      </button>
                    ))}
                  </div>
                  
                  <div className={`h-1 w-full rounded-full ${track.color} opacity-30`} />
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
                        aspect-square rounded-xl cursor-pointer transition-all duration-300 relative group
                        ${isActive 
                          ? `${track.color} shadow-[0_0_15px_rgba(139,92,246,0.5)] scale-100` 
                          : 'bg-purple-900/20 hover:bg-purple-800/30 border border-purple-500/5'}
                        ${trackSteps[track.id] === i && isPlaying ? 'ring-4 ring-fuchsia-400/50 ring-offset-4 ring-offset-[#050208] scale-110 z-20' : ''}
                        ${i % 4 === 0 ? 'after:content-[""] after:absolute after:-left-[7px] after:top-1/4 after:bottom-1/4 after:w-[2px] after:bg-purple-500/20' : ''}
                      `}
                    >
                      {/* Piano Note Label */}
                      {track.type === 'piano' && isActive && (
                        <div 
                          className="absolute -top-1 -right-1 bg-black/80 text-[6px] font-bold px-1 rounded border border-white/20 text-white z-30"
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
                              className="absolute w-2 h-2 text-fuchsia-200 fill-current animate-star-pop"
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
                  <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isPlaying && i % 4 === 0 ? 'bg-fuchsia-400/60 scale-125' : 'bg-purple-900/40'}`} />
                  <span className="text-[7px] font-mono font-bold text-purple-700/40">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Space Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'CyberJazz Engine', icon: Orbit, color: 'text-violet-400', desc: 'Poly-rhythmic jazz fusion synthesis.' },
            { label: 'Quantum Swing', icon: Sparkles, color: 'text-fuchsia-400', desc: 'Non-linear temporal alignment.' },
            { label: 'Harmonic Mapping', icon: Star, color: 'text-purple-400', desc: 'Complex celestial chord structures.' },
            { label: 'Warp Drive', icon: Rocket, color: 'text-indigo-400', desc: 'Hyper-speed audio processing.' }
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-3xl bg-purple-950/20 border border-purple-500/10 backdrop-blur-sm hover:bg-purple-900/20 transition-colors group">
              <stat.icon className={`w-6 h-6 ${stat.color} mb-4 group-hover:scale-110 transition-transform`} />
              <h3 className="text-xs font-black uppercase tracking-widest mb-2 text-purple-100">{stat.label}</h3>
              <p className="text-[10px] text-purple-400/80 leading-relaxed font-medium">{stat.desc}</p>
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
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #f0abfc;
          cursor: pointer;
          box-shadow: 0 0 10px #f0abfc;
          margin-top: -6px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

