import React from 'react';
import { FiSquare, FiRepeat, FiStar } from 'react-icons/fi';
import { audioEngine } from '../lib/AudioEngine';
import { SmoothSlider } from './SmoothSlider';

export function SoundButton({ cue, isActive, onPlay, onToggle, onFadeIn, onStop, onFadeOut, onEdit, onVolumeChange, onTogglePin, onToggleLoop, onDropCue }) {
  const handleClick = () => {
    if (onToggle) onToggle(cue.id);
    else onPlay(cue.id);
  };

  return (
    <div 
      className={`sound-btn ${isActive ? 'playing' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', cue.id); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceId = e.dataTransfer.getData('text/plain');
        if (sourceId && onDropCue) onDropCue(sourceId);
      }}
      onMouseDown={(e) => { if (e.button === 0) handleClick(); }}
      onContextMenu={(e) => { e.preventDefault(); onEdit(cue.id); }}
    >
      {cue.loop && (
        <div style={{ position: 'absolute', top: 12, right: 12, color: isActive ? 'var(--btn-playing)' : 'var(--text-secondary)' }}>
          <FiRepeat />
        </div>
      )}

      {cue.hotkey && (
        <div style={{ position: 'absolute', top: 12, right: cue.loop ? 36 : 12, background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'white' }}>
          {cue.hotkey.toUpperCase()}
        </div>
      )}
      
      <div 
        className="pin-btn"
        title={cue.pinned ? "Unpin" : "Pin"}
        onClick={(e) => { e.stopPropagation(); onTogglePin(cue.id); }}
      >
        <FiStar fill={cue.pinned ? '#fbbf24' : 'none'} color={cue.pinned ? '#fbbf24' : 'var(--text-secondary)'} />
      </div>
      
      <div className="sound-btn-fill" style={{ width: isActive ? '100%' : '0%', transition: 'width 0.1s linear' }}></div>
      
      <div className="sound-btn-content">
        <div className="sound-btn-name">{cue.name}</div>
        <div className="sound-btn-time">{isActive ? 'Playing' : ''}</div>
        
        <div 
          className="sound-controls" 
          onMouseDown={(e) => e.stopPropagation()} 
          draggable 
          onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}
        >
          <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: '#ef4444', border: 'none' }} onClick={() => onStop(cue.id)} title="Stop">
            <FiSquare />
          </button>
          <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--btn-playing)', border: 'none', fontWeight: 'bold' }} onClick={() => onFadeIn(cue.id)} title="Fade In">
            ↗
          </button>
          <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontWeight: 'bold' }} onClick={() => onFadeOut(cue.id)} title="Fade Out">
            ↘
          </button>
          <button className="btn" style={{ padding: '4px 8px', background: 'transparent', color: cue.loop ? 'var(--btn-playing)' : 'var(--text-secondary)', border: 'none' }} onClick={() => onToggleLoop(cue.id)} title="Toggle Loop">
            <FiRepeat />
          </button>
          <SmoothSlider 
            min="0" max="300" 
            value={cue.volume} 
            onChange={(val) => audioEngine.setVolume(cue.id, val)}
            onCommit={(val) => onVolumeChange(cue.id, val)}
            style={{ width: '100%', accentColor: 'var(--text-secondary)' }}
          />
        </div>
      </div>
    </div>
  );
}
