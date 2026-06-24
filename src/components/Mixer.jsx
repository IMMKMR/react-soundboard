import React, { useEffect, useState } from 'react';
import { FiSquare, FiRepeat } from 'react-icons/fi';
import { audioEngine } from '../lib/AudioEngine';

export function Mixer({ activeNodes, cues, onVolumeChange, onSeek, onStop, onFadeIn, onFade, onToggleLoop }) {
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
            const duration = audioEngine.getBuffer(cue.fileName)?.duration || 0;
            
            const formatTime = (seconds) => {
              const m = Math.floor(seconds / 60);
              const s = Math.floor(seconds % 60);
              return `${m}:${s.toString().padStart(2, '0')}`;
            };

            return (
              <div key={cue.id} className="mixer-channel">
                <div className="mixer-channel-header">
                  <div className="mixer-channel-name" title={cue.name}>{cue.name}</div>
                  <div className="mixer-channel-time">{formatTime(pos)} / {formatTime(duration)}</div>
                </div>

                <div className="mixer-channel-actions">
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
                    onClick={() => onFadeIn(cue.id)} 
                    title="Fade In"
                    style={{ color: 'var(--btn-playing)' }}
                  >
                    ↗ Fade In
                  </button>
                  <button 
                    className="btn btn-mixer" 
                    onClick={() => onFade(cue.id)} 
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
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '25px' }}>Pos</span>
                  <input 
                    type="range" 
                    className="mixer-slider seek-slider"
                    min="0" 
                    max={duration} 
                    step="0.1" 
                    value={pos} 
                    onChange={(e) => onSeek(cue.id, Number(e.target.value))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '25px' }}>Vol</span>
                  <input 
                    type="range" 
                    className="mixer-slider vol-slider"
                    min="0" 
                    max="100" 
                    value={cue.volume} 
                    onChange={(e) => onVolumeChange(cue.id, Number(e.target.value))}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
