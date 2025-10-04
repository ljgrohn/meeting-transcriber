import RecordRTC from 'recordrtc';
import { AudioSource, AudioLevels, AudioDevice } from '../types/audio';

export class AudioRecordingService {
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private systemAudioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private recorder: RecordRTC | null = null;
  private microphoneAnalyser: AnalyserNode | null = null;
  private systemAnalyser: AnalyserNode | null = null;
  private microphoneGain: GainNode | null = null;
  private systemGain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private animationFrameId: number | null = null;
  private onLevelsUpdate: ((levels: AudioLevels) => void) | null = null;
  private onVisualizationData: ((data: Float32Array) => void) | null = null;
  private startTime: number = 0;
  private pausedDuration: number = 0;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async getAvailableMicrophones(): Promise<AudioDevice[]> {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          kind: 'audioinput' as const
        }));
    } catch (error) {
      console.error('Error getting microphones:', error);
      return [];
    }
  }

  async getSystemAudioSources(): Promise<any[]> {
    if (window.electronAPI && (window.electronAPI as any).getDesktopSources) {
      return await (window.electronAPI as any).getDesktopSources();
    }
    return [];
  }

  private async setupMicrophoneStream(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false
    };

    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  private async setupSystemAudioStream(sourceId?: string): Promise<MediaStream> {
    if (!window.electronAPI || !(window.electronAPI as any).getDesktopStream) {
      throw new Error('System audio capture not available');
    }

    return await (window.electronAPI as any).getDesktopStream(sourceId);
  }

  private setupAudioAnalysers(stream: MediaStream, type: 'microphone' | 'system'): AnalyserNode {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    const gain = this.audioContext.createGain();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(gain);
    gain.connect(analyser);

    if (type === 'microphone') {
      this.microphoneGain = gain;
      this.microphoneAnalyser = analyser;
    } else {
      this.systemGain = gain;
      this.systemAnalyser = analyser;
    }

    return analyser;
  }

  private mergeAudioStreams(): MediaStream {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    this.destination = this.audioContext.createMediaStreamDestination();

    if (this.microphoneGain) {
      this.microphoneGain.connect(this.destination);
    }
    if (this.systemGain) {
      this.systemGain.connect(this.destination);
    }

    return this.destination.stream;
  }

  private startAudioLevelMonitoring() {
    const updateLevels = () => {
      const levels: AudioLevels = {
        microphone: 0,
        system: 0
      };

      if (this.microphoneAnalyser) {
        const dataArray = new Uint8Array(this.microphoneAnalyser.frequencyBinCount);
        this.microphoneAnalyser.getByteFrequencyData(dataArray);
        levels.microphone = this.calculateAverageVolume(dataArray);
      }

      if (this.systemAnalyser) {
        const dataArray = new Uint8Array(this.systemAnalyser.frequencyBinCount);
        this.systemAnalyser.getByteFrequencyData(dataArray);
        levels.system = this.calculateAverageVolume(dataArray);
      }

      // Get waveform data for visualization
      if (this.microphoneAnalyser || this.systemAnalyser) {
        const analyser = this.microphoneAnalyser || this.systemAnalyser;
        const bufferLength = analyser!.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyser!.getFloatTimeDomainData(dataArray);

        if (this.onVisualizationData) {
          this.onVisualizationData(dataArray);
        }
      }

      if (this.onLevelsUpdate) {
        this.onLevelsUpdate(levels);
      }

      this.animationFrameId = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  }

  private calculateAverageVolume(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return (sum / dataArray.length / 255) * 100; // Convert to percentage
  }

  async startRecording(
    audioSource: AudioSource,
    microphoneId?: string,
    systemSourceId?: string
  ): Promise<void> {
    try {
      this.startTime = Date.now();
      this.pausedDuration = 0;

      // Setup audio streams based on source
      if (audioSource === 'microphone' || audioSource === 'both') {
        this.microphoneStream = await this.setupMicrophoneStream(microphoneId);
        this.setupAudioAnalysers(this.microphoneStream, 'microphone');
      }

      if (audioSource === 'system' || audioSource === 'both') {
        this.systemAudioStream = await this.setupSystemAudioStream(systemSourceId);
        this.setupAudioAnalysers(this.systemAudioStream, 'system');
      }

      // Merge streams if both are selected
      if (audioSource === 'both') {
        this.combinedStream = this.mergeAudioStreams();
      } else {
        this.combinedStream = audioSource === 'microphone'
          ? this.microphoneStream
          : this.systemAudioStream;
      }

      if (!this.combinedStream) {
        throw new Error('Failed to setup audio stream');
      }

      // Start recording with RecordRTC
      this.recorder = new RecordRTC(this.combinedStream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 2,
        desiredSampRate: 44100,
        bufferSize: 4096
      });

      this.recorder.startRecording();
      this.startAudioLevelMonitoring();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  pauseRecording() {
    if (this.recorder && this.recorder.getState() === 'recording') {
      this.recorder.pauseRecording();
      this.pausedDuration += Date.now() - this.startTime;
    }
  }

  resumeRecording() {
    if (this.recorder && this.recorder.getState() === 'paused') {
      this.startTime = Date.now();
      this.recorder.resumeRecording();
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.recorder.stopRecording(() => {
        const blob = this.recorder!.getBlob();
        this.cleanup();
        resolve(blob);
      });
    });
  }

  private cleanup() {
    // Stop animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop all tracks
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    // Disconnect audio nodes
    if (this.microphoneGain) {
      this.microphoneGain.disconnect();
      this.microphoneGain = null;
    }
    if (this.systemGain) {
      this.systemGain.disconnect();
      this.systemGain = null;
    }
    if (this.microphoneAnalyser) {
      this.microphoneAnalyser.disconnect();
      this.microphoneAnalyser = null;
    }
    if (this.systemAnalyser) {
      this.systemAnalyser.disconnect();
      this.systemAnalyser = null;
    }

    // Clear recorder
    if (this.recorder) {
      this.recorder.destroy();
      this.recorder = null;
    }
  }

  setLevelsUpdateCallback(callback: (levels: AudioLevels) => void) {
    this.onLevelsUpdate = callback;
  }

  setVisualizationDataCallback(callback: (data: Float32Array) => void) {
    this.onVisualizationData = callback;
  }

  getCurrentDuration(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime + this.pausedDuration;
  }

  getRecordingState(): string {
    return this.recorder?.getState() || 'inactive';
  }

  destroy() {
    this.cleanup();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}