/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Subdivision = '16th' | '8th' | 'triplet';
export type TrackType = 'kick' | 'snare' | 'hihat' | 'clap' | 'piano';

export interface Track {
  id: string;
  name: string;
  color: string;
  steps: boolean[];
  notes?: (string[] | null)[];
  type: TrackType;
  subdivision: Subdivision;
}

export interface SequencerState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  tracks: Track[];
}

export const INITIAL_TRACKS: Track[] = [
  { id: 'asteroid', name: 'ASTEROID', color: 'bg-orange-300', type: 'kick', steps: Array(16).fill(false), subdivision: '16th' },
  { id: 'shooting_star', name: 'SHOOTING STAR', color: 'bg-yellow-200', type: 'snare', steps: Array(16).fill(false), subdivision: '16th' },
  { id: 'twinkle', name: 'TWINKLE', color: 'bg-pink-300', type: 'hihat', steps: Array(16).fill(false), subdivision: '16th' },
  { id: 'synthwave', name: 'SYNTHWAVE', color: 'bg-purple-300', type: 'clap', steps: Array(16).fill(false), subdivision: '16th' },
  { 
    id: 'stardust_piano', 
    name: 'STARDUST PIANO', 
    color: 'bg-fuchsia-300', 
    type: 'piano', 
    steps: Array(16).fill(false), 
    notes: Array(16).fill(null).map(() => ['C4']),
    subdivision: '16th' 
  },
];
