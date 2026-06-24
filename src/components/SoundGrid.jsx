import React from 'react';
import { FiX, FiSquare, FiChevronDown, FiRepeat } from 'react-icons/fi';

export function SoundGrid({ cues, scenes, activeNodes, onPlay, onFadeIn, onStop, onFade, onEdit, onRemoveScene, onVolumeChange, onDropCue }) {
  if (cues.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ fontSize: '3rem', marginBottom: '16px' }}>🎧</div>
        <h2>No sounds loaded</h2>
        <p>Import some audio files to build your soundboard.</p>
        <div className="file-drop-zone" onClick={() => document.getElementById('audioInput').click()}>
          Click here to import audio files<br/>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>WAV, MP3, OGG, M4A</span>
        </div>
      </div>
    );
  }

  const handleDragStart = (e, cueId) => {
    e.dataTransfer.setData('text/plain', cueId);
  };

  const handleDrop = (e, targetScene) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId) {
      onDropCue(sourceId, targetScene);
    }
  };

  return (
    <div className="soundboard-container">
      {scenes.map(scene => {
        const sceneCues = cues.filter(c => c.scene === scene).sort((a, b) => a.order - b.order);
        
        return (
          <div 
            key={scene} 
            className="scene-group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, scene)}
          >
            <div className="scene-header">
              <div className="scene-title">{scene === 'default' ? 'Uncategorized' : scene}</div>
              {scene !== 'default' && (
                <button 
                  className="btn" 
                  style={{ background: 'transparent', padding: '4px 8px' }} 
                  onClick={() => onRemoveScene(scene)}
                  title="Remove Scene"
                >
                  <FiX style={{ color: 'var(--text-secondary)' }} />
                </button>
              )}
            </div>
            
            <div className="scene-row">
              {sceneCues.map(cue => {
                const isActive = activeNodes.has(cue.id);
                
                return (
                  <div 
                    key={cue.id}
                    className={`sound-btn ${isActive ? 'playing' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, cue.id)}
                    onClick={() => onPlay(cue.id)}
                    onContextMenu={(e) => { e.preventDefault(); onEdit(cue.id); }}
                  >
                    {cue.loop && (
                      <div style={{ position: 'absolute', top: 12, right: 12, color: isActive ? 'var(--btn-playing)' : 'var(--text-secondary)' }}>
                        <FiRepeat />
                      </div>
                    )}
                    
                    <div className="sound-btn-fill" style={{ width: isActive ? '100%' : '0%', transition: 'width 0.1s linear' }}></div>
                    
                    <div className="sound-btn-content">
                      <div className="sound-btn-name">{cue.name}</div>
                      <div className="sound-btn-time">{isActive ? 'Playing' : ''}</div>
                      
                      <div className="sound-controls" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                        <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: '#ef4444', border: 'none' }} onClick={() => onStop(cue.id)} title="Stop">
                          <FiSquare />
                        </button>
                        <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--btn-playing)', border: 'none', fontWeight: 'bold' }} onClick={() => onFadeIn(cue.id)} title="Fade In">
                          ↗
                        </button>
                        <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontWeight: 'bold' }} onClick={() => onFade(cue.id)} title="Fade Out">
                          ↘
                        </button>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={cue.volume} 
                          onChange={(e) => onVolumeChange(cue.id, Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--text-secondary)' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
