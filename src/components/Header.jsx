import React from 'react';
import { FiVolume2, FiPlus, FiFolderPlus, FiSave, FiFolder, FiX, FiSquare, FiList } from 'react-icons/fi';

export function Header({ 
  onAddScene, 
  onImportAudio, 
  onSave, 
  onLoad, 
  globalFadeTime, 
  setGlobalFadeTime,
  onFadeAll,
  onStopAll
}) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <span>🎛️</span> Soundboard
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onAddScene}>
            <FiPlus /> Add Scene
          </button>
          <button className="btn btn-primary" onClick={() => document.getElementById('audioInput').click()}>
            <FiFolderPlus /> Import Audio
          </button>
          <input 
            type="file" 
            id="audioInput" 
            multiple 
            accept=".wav,.mp3,.ogg,.m4a,.flac,.aac,.mpeg,.webm" 
            className="hidden" 
            onChange={onImportAudio}
          />
          <button className="btn" onClick={onSave}>
            <FiSave /> Save (.soundboard)
          </button>
          <button className="btn" onClick={() => document.getElementById('projInput').click()}>
            <FiFolder /> Load
          </button>
          <input 
            type="file" 
            id="projInput" 
            accept=".soundboard" 
            className="hidden" 
            onChange={onLoad}
          />
        </div>
      </div>

      <div className="header-right">
        <div className="master-volume-wrap" title="Global Fade Time (seconds)" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏳</span>
          <input 
            type="number" 
            min="0.5" 
            max="20" 
            step="0.5" 
            value={globalFadeTime} 
            onChange={(e) => setGlobalFadeTime(Number(e.target.value))}
            style={{ width: '50px', padding: '2px 6px', border: 'none', background: 'transparent', color: 'white', outline: 'none', fontWeight: '600' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>sec</span>
        </div>
        <button className="btn btn-warning" onClick={onFadeAll} title="Fade Out All (Esc)">
          ↘ Fade All
        </button>
        <button className="btn btn-danger" onClick={onStopAll} title="Stop All Immediately (Backspace)">
          ■ Stop All
        </button>
      </div>
    </header>
  );
}
