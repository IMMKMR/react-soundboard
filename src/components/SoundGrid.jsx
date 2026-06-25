import React from 'react';
import { FiX } from 'react-icons/fi';
import { SoundButton } from './SoundButton';

export function SoundGrid({ cues, scenes, activeNodes, onPlay, onFadeIn, onStop, onFade, onEdit, onRemoveScene, onVolumeChange, onDropCue, onTogglePin, onToggleLoop }) {
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
        const sceneCues = cues.filter(c => c.scene === scene && !c.pinned).sort((a, b) => a.order - b.order);
        if (sceneCues.length === 0 && scene !== 'default') return null; // Hide empty scenes if all cues are pinned
        
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
              {sceneCues.map((cue, index) => (
                <SoundButton
                  key={cue.id}
                  cue={cue}
                  isActive={activeNodes.has(cue.id)}
                  onPlay={onPlay}
                  onFadeIn={onFadeIn}
                  onStop={onStop}
                  onFade={onFade}
                  onEdit={onEdit}
                  onVolumeChange={onVolumeChange}
                  onTogglePin={onTogglePin}
                  onToggleLoop={onToggleLoop}
                  onDropCue={(sourceId) => onDropCue(sourceId, scene, index)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
