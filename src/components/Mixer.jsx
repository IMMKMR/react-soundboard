import React, { useEffect, useState } from 'react';
import { FiSquare, FiRepeat } from 'react-icons/fi';
import { audioEngine } from '../lib/AudioEngine';
import { SmoothSlider } from './SmoothSlider';

export function Mixer({ activeNodes, cues, selectedTrackId, onSelectTrack, onVolumeChange, onSeek, onStop, onFadeIn, onFadeOut, onToggleLoop, onSpeedChange, onReverbChange }) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    let animationFrameId;
    
    const updatePositions = () => {
      const newPositions = {};
      activeNodes.forEach((_, trackId) => {
        newPositions[trackId] = audioEngine.getPlaybackPosition(trackId);
      });
      setPositions(newPositions);
      animationFrameId = requestAnimationFrame(updatePositions);
    };
    
    if (activeNodes.size > 0) {
      animationFrameId = requestAnimationFrame(updatePositions);
    }
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeNodes]);

  const activeTracks = Array.from(activeNodes.keys()).map(id => cues.find(c => c.id === id)).filter(Boolean);

  return (
    <div className="mixer-panel" id="mixerSidebar">
      <div className="mixer-header">Mixer - Active Tracks</div>
      <div className="mixer-channels" id="mixerChannels">
        {activeTracks.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '16px' }}>No active tracks</div>
        ) : (
          activeTracks.map(cue => {
            const pos = positions[cue.id] || 0;
            const bufferDuration = audioEngine.getBuffer(cue.fileName)?.duration || 0;
            const tStart = cue.trimStart || 0;
            const tEnd = (cue.trimEnd > tStart) ? cue.trimEnd : bufferDuration;
            
            const formatTime = (seconds) => {
              const m = Math.floor(seconds / 60);
              const s = Math.floor(seconds % 60);
              return `${m}:${s.toString().padStart(2, '0')}`;
            };

            return (
              <div 
                key={cue.id} 
                className={`mixer-channel ${selectedTrackId === cue.id ? 'selected' : ''}`}
                onClick={() => onSelectTrack(cue.id)}
                style={{
                  border: selectedTrackId === cue.id ? '1px solid var(--btn-playing)' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: selectedTrackId === cue.id ? 'rgba(52, 211, 153, 0.05)' : 'transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div className="mixer-channel-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="mixer-channel-header">
                    <div className="mixer-channel-name" title={cue.name}>{cue.name}</div>
                    <div className="mixer-channel-time">{formatTime(Math.max(0, pos - tStart))} / {formatTime(tEnd - tStart)}</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '25px' }}>Pos</span>
                    <input 
                      type="range" 
                      className="mixer-slider seek-slider"
                      min={tStart} 
                      max={tEnd} 
                      step="0.1" 
                      value={pos} 
                      onChange={(e) => onSeek(cue.id, Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.75rem', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pos.toFixed(1)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '25px' }}>Vol</span>
                    <button className="btn" style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => {
                        const newVol = Math.max(0, cue.volume - 5);
                        audioEngine.setVolume(cue.id, newVol);
                        onVolumeChange(cue.id, newVol);
                    }} title="Decrease Volume">-</button>
                    <SmoothSlider 
                      className="mixer-slider vol-slider"
                      min="0" 
                      max="300" 
                      value={cue.volume} 
                      onChange={(val) => audioEngine.setVolume(cue.id, val)}
                      onCommit={(val) => onVolumeChange(cue.id, val)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn" style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => {
                        const newVol = Math.min(300, cue.volume + 5);
                        audioEngine.setVolume(cue.id, newVol);
                        onVolumeChange(cue.id, newVol);
                    }} title="Increase Volume">+</button>
                    <span style={{ fontSize: '0.75rem', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cue.volume}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '25px' }}>Spd</span>
                    <SmoothSlider 
                      className="mixer-slider speed-slider"
                      min="0.1" 
                      max="3.0" 
                      step="0.1"
                      value={cue.speed || 1.0} 
                      onChange={(val) => audioEngine.setSpeed(cue.id, val)}
                      onCommit={(val) => onSpeedChange(cue.id, val)}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.75rem', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(cue.speed || 1.0).toFixed(1)}x</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '25px' }}>Rev</span>
                    <SmoothSlider 
                      className="mixer-slider reverb-slider"
                      min="0" 
                      max="100" 
                      step="1"
                      value={cue.reverb || 0} 
                      onChange={(val) => audioEngine.setReverb(cue.id, val)}
                      onCommit={(val) => onReverbChange(cue.id, val)}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.75rem', width: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cue.reverb || 0}%</span>
                  </div>
                </div>

                <div className="mixer-channel-actions" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                  <button 
                    className="btn btn-mixer" 
                    onClick={() => onStop(cue.id)} 
                    title="Stop"
                    style={{ color: '#ef4444' }}
                  >
                    <FiSquare /> Stop
                  </button>
                  <button 
                    className="btn btn-mixer" 
                    onClick={() => onFadeOut(cue.id)} 
                    title="Fade Out"
                  >
                    ↘ Fade Out
                  </button>
                  <button 
                    className={`btn btn-mixer ${cue.loop ? 'active' : ''}`} 
                    onClick={() => onToggleLoop(cue.id)} 
                    title="Toggle Loop"
                    style={{ color: cue.loop ? 'var(--btn-playing)' : 'var(--text-secondary)' }}
                  >
                    <FiRepeat /> Loop
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
