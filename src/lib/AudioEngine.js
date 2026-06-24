export class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = new Map();
    this.activeNodes = new Map(); // trackId -> { source, gainNode, analyzer }
    
    // Global fade out settings
    this.globalFadeTime = 2.0; 
  }

  async ensureResumed() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  hasBuffer(fileName) {
    return this.buffers.has(fileName);
  }

  getBuffer(fileName) {
    return this.buffers.get(fileName);
  }

  async decodeAudio(fileName, arrayBuffer) {
    try {
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(fileName, buffer);
      return buffer;
    } catch (e) {
      console.error('Failed to decode audio', e);
      throw e;
    }
  }

  play(trackId, buffer, options = {}) {
    const { volume = 100, loop = false, onEnded = null, fadeInDuration = 0 } = options;
    
    // Stop existing if any
    if (this.activeNodes.has(trackId)) {
      this.stop(trackId);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = this.ctx.createGain();
    const targetVolume = volume / 100;
    
    if (fadeInDuration > 0) {
      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + fadeInDuration);
    } else {
      // Tiny fade in to prevent clicks
      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + 0.05);
    }

    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(0);

    const activeInfo = { source, gainNode, startedAt: this.ctx.currentTime };
    
    source.onended = () => {
      // Clean up if it naturally ends and wasn't manually stopped
      if (this.activeNodes.get(trackId) === activeInfo) {
        this.activeNodes.delete(trackId);
        if (onEnded) onEnded();
      }
    };

    this.activeNodes.set(trackId, activeInfo);
    return activeInfo;
  }

  setVolume(trackId, volumePercent) {
    const active = this.activeNodes.get(trackId);
    if (active) {
      const targetGain = volumePercent / 100;
      active.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  fadeOut(trackId, durationSeconds = 1.0) {
    const active = this.activeNodes.get(trackId);
    if (!active) return;
    
    const currGain = active.gainNode.gain.value;
    active.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    active.gainNode.gain.setValueAtTime(currGain, this.ctx.currentTime);
    active.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + durationSeconds);
    
    setTimeout(() => {
      this.stop(trackId);
    }, durationSeconds * 1000 + 100);
  }

  stop(trackId) {
    const active = this.activeNodes.get(trackId);
    if (active) {
      active.source.onended = null; // Prevent onended trigger
      try {
        active.source.stop();
      } catch (e) {
        // Ignore InvalidStateError if already stopped
      }
      active.source.disconnect();
      active.gainNode.disconnect();
      this.activeNodes.delete(trackId);
    }
  }

  fadeOutAll(durationSeconds) {
    const time = durationSeconds || this.globalFadeTime;
    for (const trackId of this.activeNodes.keys()) {
      this.fadeOut(trackId, time);
    }
  }

  stopAll() {
    for (const trackId of this.activeNodes.keys()) {
      this.stop(trackId);
    }
  }

  getPlaybackPosition(trackId) {
    const active = this.activeNodes.get(trackId);
    if (!active) return 0;
    let pos = this.ctx.currentTime - active.startedAt;
    if (active.source.loop) {
      pos = pos % active.source.buffer.duration;
    }
    return pos;
  }

  seek(trackId, timeSeconds) {
    const active = this.activeNodes.get(trackId);
    if (!active) return;
    
    // To seek in Web Audio API, we have to stop the current node and create a new one
    const buffer = active.source.buffer;
    const loop = active.source.loop;
    const currentGain = active.gainNode.gain.value;
    
    this.stop(trackId);
    
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = currentGain;
    
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    source.start(0, timeSeconds);
    
    const newActiveInfo = { source, gainNode, startedAt: this.ctx.currentTime - timeSeconds };
    this.activeNodes.set(trackId, newActiveInfo);
  }
}

// Export a singleton instance
export const audioEngine = new AudioEngine();
