import React, { useState, useEffect } from 'react';

export function EditModal({ cue, cuesList = [], onSave, onCancel, onDelete, onDuplicate }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (cue) {
      setFormData({
        name: cue.name,
        scene: cue.scene,
        volume: cue.volume,
        fadeInDuration: cue.fadeInDuration,
        fadeOutDuration: cue.fadeOutDuration,
        loop: cue.loop,
        pinned: cue.pinned,
        trimStart: cue.trimStart,
        trimEnd: cue.trimEnd,
        speed: cue.speed || 1.0,
        reverb: cue.reverb || 0,
        playNext: cue.playNext || '',
        hotkey: cue.hotkey || ''
      });
    }
  }, [cue]);

  if (!cue) return null;

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Edit Sound</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div>
            <label>Display Name</label>
            <input 
              type="text" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label>Scene</label>
            <input 
              type="text" 
              value={formData.scene || ''} 
              onChange={e => setFormData({...formData, scene: e.target.value})} 
            />
          </div>
          <div>
            <label>Volume (%)</label>
            <input 
              type="number" 
              min="0" max="300" 
              value={formData.volume || 0} 
              onChange={e => setFormData({...formData, volume: Number(e.target.value)})} 
            />
          </div>
          <div>
            <label>Fade In Duration (s)</label>
            <input 
              type="number" 
              min="0" max="10" step="0.1" 
              value={formData.fadeInDuration || 0} 
              onChange={e => setFormData({...formData, fadeInDuration: Number(e.target.value)})} 
            />
          </div>
          <div>
            <label>Fade Out Duration (s)</label>
            <input 
              type="number" 
              min="0" max="10" step="0.1" 
              value={formData.fadeOutDuration || 0} 
              onChange={e => setFormData({...formData, fadeOutDuration: Number(e.target.value)})} 
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
              <input 
                type="checkbox" 
                checked={formData.pinned || false} 
                onChange={e => setFormData({...formData, pinned: e.target.checked})} 
                style={{ width: '16px', height: '16px', marginRight: '6px' }}
              />
              Pin Sound (Always Visible)
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.loop || false} 
                onChange={e => setFormData({...formData, loop: e.target.checked})} 
                style={{ width: '16px', height: '16px', marginRight: '6px' }}
              />
              Loop Audio
            </label>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label>Start Time (s)</label>
              <input 
                type="number" 
                min="0" step="0.1" 
                value={formData.trimStart || 0} 
                onChange={e => setFormData({...formData, trimStart: Number(e.target.value)})} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>End Time (s) [0 = Full]</label>
              <input 
                type="number" 
                min="0" step="0.1" 
                value={formData.trimEnd || 0} 
                onChange={e => setFormData({...formData, trimEnd: Number(e.target.value)})} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div style={{ flex: 1 }}>
              <label>Hotkey (Press key to assign)</label>
              <input 
                type="text" 
                readOnly
                value={formData.hotkey || ''} 
                onKeyDown={e => {
                  e.preventDefault();
                  if (e.key === 'Backspace' || e.key === 'Delete') setFormData({...formData, hotkey: ''});
                  else if (e.key.length === 1) setFormData({...formData, hotkey: e.key.toUpperCase()});
                }}
                placeholder="Click and press key (Del to clear)"
                style={{ textAlign: 'center', cursor: 'pointer' }}
              />
            </div>
            <div style={{ flex: 1 }}></div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div style={{ flex: 1 }}>
              <label>Speed (Playback Rate)</label>
              <input 
                type="number" 
                min="0.1" max="5.0" step="0.1" 
                value={formData.speed || 1.0} 
                onChange={e => setFormData({...formData, speed: Number(e.target.value)})} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Reverb (%)</label>
              <input 
                type="number" 
                min="0" max="100" step="1" 
                value={formData.reverb || 0} 
                onChange={e => setFormData({...formData, reverb: Number(e.target.value)})} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div style={{ flex: 1 }}>
              <label>Play Next (Auto-Follow)</label>
              <select 
                value={formData.playNext || ''} 
                onChange={e => setFormData({...formData, playNext: e.target.value})}
                style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
              >
                <option value="" style={{ color: '#0f172a', background: 'white' }}>None</option>
                {cuesList.filter(c => c.id !== cue.id && c.scene === cue.scene).map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#0f172a', background: 'white' }}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-danger" onClick={() => onDelete(cue.id)}>🗑 Delete</button>
            <button className="btn" style={{ background: 'rgba(99, 102, 241, 0.8)', borderColor: '#818cf8', color: 'white' }} onClick={() => onDuplicate(cue.id)}>📑 Duplicate</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSave(cue.id, formData)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
