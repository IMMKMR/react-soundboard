import React, { useState, useEffect } from 'react';

export function EditModal({ cue, onSave, onCancel, onDelete, onDuplicate }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (cue) {
      setFormData({
        name: cue.name,
        scene: cue.scene,
        volume: cue.volume,
        fadeInDuration: cue.fadeInDuration,
        fadeOutDuration: cue.fadeOutDuration,
        loop: cue.loop
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
              min="0" max="100" 
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
