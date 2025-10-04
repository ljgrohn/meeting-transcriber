export type AudioSource = 'microphone' | 'system' | 'both';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioLevels {
  microphone: number;
  system: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioSource: AudioSource;
  selectedMicrophone: string | null;
  audioLevels: AudioLevels;
}

export interface AudioVisualizationData {
  waveformData: Float32Array;
  frequencyData: Uint8Array;
}

export interface SystemAudioSource {
  id: string;
  name: string;
  thumbnail: string;
}