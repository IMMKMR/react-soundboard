export class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = new Map();
    this.activeNodes = new Map(); // trackId -> { source, gainNode, analyzer }
    
    // Global fade out settings
    this.globalFadeTime = 2.0; 
    
    // Create simple reverb impulse response
    this.reverbBuffer = this._createReverbBuffer(2.0, 2.0);
  }

  _createReverbBuffer(duration, decay) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
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
    const { volume = 100, loop = false, onEnded = null, fadeInDuration = 0, trimStart = 0, trimEnd = 0, speed = 1.0, reverb = 0 } = options;
    
    // Stop existing if any
    if (this.activeNodes.has(trackId)) {
      this.stop(trackId);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (trimStart > 0 || trimEnd > 0) {
      source.loopStart = trimStart || 0;
      source.loopEnd = trimEnd > 0 ? trimEnd : buffer.duration;
    }
    source.playbackRate.value = speed;

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

    const wetGain = this.ctx.createGain();
    const dryGain = this.ctx.createGain();
    const convolver = this.ctx.createConvolver();
    convolver.buffer = this.reverbBuffer;

    wetGain.gain.value = reverb / 100;
    dryGain.gain.value = 1.0;

    source.connect(dryGain);
    source.connect(wetGain);
    
    wetGain.connect(convolver);
    convolver.connect(gainNode);
    dryGain.connect(gainNode);
    
    gainNode.connect(this.ctx.destination);

    if (trimEnd > trimStart && !loop) {
      source.start(0, trimStart, trimEnd - trimStart);
    } else {
      source.start(0, trimStart);
    }

    const activeInfo = { source, gainNode, wetGain, convolver, dryGain, startedAt: this.ctx.currentTime, trimStart, trimEnd, bufferDuration: buffer.duration, speed, reverb };
    
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

  setSpeed(trackId, speed) {
    const active = this.activeNodes.get(trackId);
    if (active) {
      const currentPosRelative = this.getPlaybackPosition(trackId) - (active.trimStart || 0);
      active.source.playbackRate.setValueAtTime(speed, this.ctx.currentTime);
      active.speed = speed;
      active.startedAt = this.ctx.currentTime - (currentPosRelative / speed);
    }
  }

  setReverb(trackId, reverbPercent) {
    const active = this.activeNodes.get(trackId);
    if (active && active.wetGain) {
      active.wetGain.gain.setTargetAtTime(reverbPercent / 100, this.ctx.currentTime, 0.05);
      active.reverb = reverbPercent;
    }
  }

  setLoop(trackId, loop) {
    const active = this.activeNodes.get(trackId);
    if (active) {
      active.source.loop = loop;
      if (loop && (active.trimStart > 0 || active.trimEnd > 0)) {
        active.source.loopStart = active.trimStart || 0;
        active.source.loopEnd = active.trimEnd > 0 ? active.trimEnd : active.bufferDuration;
      }
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
      if (active.wetGain) active.wetGain.disconnect();
      if (active.dryGain) active.dryGain.disconnect();
      if (active.convolver) active.convolver.disconnect();
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
    
    let elapsedTime = (this.ctx.currentTime - active.startedAt) * active.speed;
    const duration = (active.trimEnd > active.trimStart) ? (active.trimEnd - active.trimStart) : (active.bufferDuration - active.trimStart);
    
    if (active.source.loop) {
      elapsedTime = elapsedTime % duration;
    } else if (elapsedTime > duration) {
      elapsedTime = duration;
    }
    
    return (active.trimStart || 0) + elapsedTime;
  }

  seek(trackId, timeSeconds) {
    const active = this.activeNodes.get(trackId);
    if (!active) return;
    
    // To seek in Web Audio API, we have to stop the current node and create a new one
    const buffer = active.source.buffer;
    const loop = active.source.loop;
    const currentGain = active.gainNode.gain.value;
    const { trimStart = 0, trimEnd = 0, bufferDuration, speed = 1.0, reverb = 0 } = active;
    
    this.stop(trackId);
    
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (trimStart > 0 || trimEnd > 0) {
      source.loopStart = trimStart || 0;
      source.loopEnd = trimEnd > 0 ? trimEnd : bufferDuration;
    }
    source.playbackRate.value = speed;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = currentGain;
    
    const wetGain = this.ctx.createGain();
    const dryGain = this.ctx.createGain();
    const convolver = this.ctx.createConvolver();
    convolver.buffer = this.reverbBuffer;

    wetGain.gain.value = reverb / 100;
    dryGain.gain.value = 1.0;

    source.connect(dryGain);
    source.connect(wetGain);
    
    wetGain.connect(convolver);
    convolver.connect(gainNode);
    dryGain.connect(gainNode);
    
    gainNode.connect(this.ctx.destination);
    
    const playOffset = Math.max(trimStart, timeSeconds);
    
    if (trimEnd > trimStart && !loop) {
      const remaining = trimEnd - playOffset;
      if (remaining > 0) {
        source.start(0, playOffset, remaining);
      }
    } else {
      source.start(0, playOffset);
    }
    
    const startedAt = this.ctx.currentTime - ((playOffset - trimStart) / speed);
    const newActiveInfo = { source, gainNode, wetGain, convolver, dryGain, startedAt, trimStart, trimEnd, bufferDuration, speed, reverb };
    this.activeNodes.set(trackId, newActiveInfo);
  }
}

// Export a singleton instance
export const audioEngine = new AudioEngine();
