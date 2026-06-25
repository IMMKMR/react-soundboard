import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from './components/Header';
import { SoundGrid } from './components/SoundGrid';
import { Mixer } from './components/Mixer';
import { EditModal } from './components/EditModal';
import { SoundButton } from './components/SoundButton';
import { audioEngine } from './lib/AudioEngine';
import { ProjectManager } from './lib/ProjectManager';

export default function App() {
  const [cues, setCues] = useState([]);
  const [scenes, setScenes] = useState(['default']);
  const [activeNodes, setActiveNodes] = useState(new Map());
  const [fileMap, setFileMap] = useState(new Map());
  
  const [globalFadeTime, setGlobalFadeTime] = useState(2.0);
  const [editingCueId, setEditingCueId] = useState(null);

  const cuesRef = React.useRef(cues);
  useEffect(() => {
    cuesRef.current = cues;
  }, [cues]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFadeAll();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleStopAll();
      } else {
        // Check hotkeys
        const hotkeyMatch = cues.find(c => c.hotkey && c.hotkey.toLowerCase() === e.key.toLowerCase());
        if (hotkeyMatch) {
          e.preventDefault();
          if (activeNodes.has(hotkeyMatch.id)) {
            if (hotkeyMatch.fadeOutDuration > 0) handleFade(hotkeyMatch.id);
            else handleStop(hotkeyMatch.id);
          } else {
            handlePlay(hotkeyMatch.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cues, activeNodes, globalFadeTime]);

  const updateActiveNodes = useCallback(() => {
    setActiveNodes(new Map(audioEngine.activeNodes));
  }, []);

  // Make sure to sync active nodes map state with audio engine
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeNodes.size !== audioEngine.activeNodes.size) {
        updateActiveNodes();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [activeNodes, updateActiveNodes]);

  // Audio Import
  const handleImportAudio = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = ''; // reset
    if (files.length === 0) return;

    const audioExtensions = ['.wav', '.mp3', '.ogg', '.m4a', '.flac', '.aac', '.mpeg', '.webm'];
    const validFiles = files.filter(f => audioExtensions.includes('.' + f.name.split('.').pop().toLowerCase()));
    
    if (validFiles.length === 0) {
      alert("No valid audio files found.");
      return;
    }

    const newCues = [];
    const newFileMap = new Map(fileMap);

    for (const file of validFiles) {
      newFileMap.set(file.name, file);
      
      // Auto-parse scene
      let name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
      let scene = 'default';
      const sceneMatch = name.match(/^(?:scene|sc)?\s*(\d+(?:\.\d+)?)\s*(.*)/i);
      if (sceneMatch) {
        scene = `Scene ${sceneMatch[1]}`;
        name = sceneMatch[2].trim();
      }
      if (name.length > 0) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }

      newCues.push({
        id: uuidv4(),
        name: name || 'Audio File',
        scene: scene,
        fileName: file.name,
        volume: 100,
        loop: false,
        fadeInDuration: 0,
        fadeOutDuration: 1,
        pinned: false,
        trimStart: 0,
        trimEnd: 0,
        speed: 1.0,
        playNext: null,
        order: cues.length + newCues.length
      });
      
      if (!scenes.includes(scene)) {
        setScenes(prev => [...prev, scene].sort((a,b) => a.localeCompare(b, undefined, {numeric: true})));
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        await audioEngine.decodeAudio(file.name, arrayBuffer);
      } catch (e) {
        console.error("Failed to decode audio file on import", e);
      }
    }

    setFileMap(newFileMap);
    setCues(prev => [...prev, ...newCues]);
  };

  const handleAddScene = () => {
    const name = prompt("Enter scene name:");
    if (name && !scenes.includes(name)) {
      setScenes(prev => [...prev, name].sort((a,b) => a.localeCompare(b, undefined, {numeric: true})));
    }
  };

  const handleRemoveScene = (sceneName) => {
    if (window.confirm(`Remove scene "${sceneName}"? Any sounds will move to Uncategorized.`)) {
      setCues(prev => prev.map(c => c.scene === sceneName ? { ...c, scene: 'default' } : c));
      setScenes(prev => prev.filter(s => s !== sceneName));
    }
  };

  const handlePlay = async (cueId, optionalPlayChain) => {
    const playChain = optionalPlayChain instanceof Set ? optionalPlayChain : new Set();
    if (playChain.has(cueId)) {
      console.warn("Infinite play loop detected. Stopping chain.");
      return;
    }
    const newPlayChain = new Set(playChain).add(cueId);

    const cue = cues.find(c => c.id === cueId);
    if (!cue) return;

    await audioEngine.ensureResumed();

    let buffer = audioEngine.getBuffer(cue.fileName);
    if (!buffer) {
      const file = fileMap.get(cue.fileName);
      if (!file) {
        alert("Audio file not found in memory. Please re-import or reload workspace.");
        return;
      }
      try {
        const arrayBuffer = await file.arrayBuffer();
        buffer = await audioEngine.decodeAudio(cue.fileName, arrayBuffer);
      } catch (e) {
        alert("Failed to decode audio file: " + cue.fileName);
        return;
      }
    }

    audioEngine.play(cue.id, buffer, {
      volume: cue.volume,
      loop: cue.loop,
      fadeInDuration: cue.fadeInDuration || 0,
      trimStart: cue.trimStart || 0,
      trimEnd: cue.trimEnd || 0,
      speed: cue.speed || 1.0,
      onEnded: () => {
        updateActiveNodes();
        const currentCue = cuesRef.current.find(c => c.id === cue.id);
        if (currentCue && currentCue.playNext) {
          handlePlay(currentCue.playNext, newPlayChain);
        }
      }
    });
    
    updateActiveNodes();
  };

  const handleFadeIn = async (cueId, optionalPlayChain) => {
    const playChain = optionalPlayChain instanceof Set ? optionalPlayChain : new Set();
    if (playChain.has(cueId)) return;
    const newPlayChain = new Set(playChain).add(cueId);

    const cue = cues.find(c => c.id === cueId);
    if (!cue) return;

    await audioEngine.ensureResumed();

    let buffer = audioEngine.getBuffer(cue.fileName);
    if (!buffer) {
      const file = fileMap.get(cue.fileName);
      if (!file) {
        alert("Audio file not found in memory. Please re-import or reload workspace.");
        return;
      }
      try {
        const arrayBuffer = await file.arrayBuffer();
        buffer = await audioEngine.decodeAudio(cue.fileName, arrayBuffer);
      } catch (e) {
        alert("Failed to decode audio file: " + cue.fileName);
        return;
      }
    }

    audioEngine.play(cue.id, buffer, {
      volume: cue.volume,
      loop: cue.loop,
      fadeInDuration: cue.fadeInDuration > 0 ? cue.fadeInDuration : globalFadeTime,
      trimStart: cue.trimStart || 0,
      trimEnd: cue.trimEnd || 0,
      speed: cue.speed || 1.0,
      onEnded: () => {
        updateActiveNodes();
        const currentCue = cuesRef.current.find(c => c.id === cue.id);
        if (currentCue && currentCue.playNext) {
          handleFadeIn(currentCue.playNext, newPlayChain);
        }
      }
    });
    
    updateActiveNodes();
  };

  const handleStop = (cueId) => {
    audioEngine.stop(cueId);
    updateActiveNodes();
  };

  const handleFade = (cueId) => {
    const cue = cues.find(c => c.id === cueId);
    if (cue) {
      audioEngine.fadeOut(cueId, cue.fadeOutDuration || 1);
      setTimeout(updateActiveNodes, (cue.fadeOutDuration || 1) * 1000 + 100);
    }
  };

  const handleFadeAll = () => {
    audioEngine.fadeOutAll(globalFadeTime);
    setTimeout(updateActiveNodes, globalFadeTime * 1000 + 100);
  };

  const handleStopAll = () => {
    audioEngine.stopAll();
    updateActiveNodes();
  };

  const handleVolumeChange = (cueId, volume) => {
    setCues(prev => prev.map(c => c.id === cueId ? { ...c, volume } : c));
    audioEngine.setVolume(cueId, volume);
  };

  const handleSpeedChange = (cueId, speed) => {
    setCues(prev => prev.map(c => c.id === cueId ? { ...c, speed } : c));
    audioEngine.setSpeed(cueId, speed);
  };

  const handleSeek = (cueId, timeSeconds) => {
    audioEngine.seek(cueId, timeSeconds);
  };

  const handleDropCue = (cueId, targetScene, targetIndex = -1) => {
    setCues(prev => {
      let newCues = prev.map(c => c.id === cueId ? { ...c, scene: targetScene } : c);
      if (targetIndex >= 0) {
        const cueToMove = newCues.find(c => c.id === cueId);
        let sceneCues = newCues.filter(c => c.scene === targetScene && c.id !== cueId).sort((a,b) => a.order - b.order);
        sceneCues.splice(targetIndex, 0, cueToMove);
        sceneCues.forEach((c, idx) => { c.order = idx; });
      }
      return newCues;
    });
  };

  const handleTogglePin = (cueId) => {
    setCues(prev => prev.map(c => c.id === cueId ? { ...c, pinned: !c.pinned } : c));
  };

  // Edit Modal actions
  const saveEdit = (id, data) => {
    setCues(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (data.scene && !scenes.includes(data.scene)) {
      setScenes(prev => [...prev, data.scene].sort((a,b) => a.localeCompare(b, undefined, {numeric: true})));
    }
    if (activeNodes.has(id)) {
      if (data.volume !== undefined) {
        audioEngine.setVolume(id, data.volume);
      }
      if (data.speed !== undefined) {
        audioEngine.setSpeed(id, data.speed);
      }
    }
    setEditingCueId(null);
  };

  const deleteCue = (id) => {
    handleStop(id);
    setCues(prev => prev.filter(c => c.id !== id));
    setEditingCueId(null);
  };

  const duplicateCue = (id) => {
    const cue = cues.find(c => c.id === id);
    if (cue) {
      setCues(prev => [...prev, { ...cue, id: uuidv4(), name: cue.name + ' (Copy)' }]);
    }
    setEditingCueId(null);
  };

  // Project Management
  const handleSaveProject = async () => {
    try {
      await ProjectManager.exportProject(cues, fileMap, "MyWorkspace");
    } catch (e) {
      alert("Failed to save project: " + e.message);
    }
  };

  const handleLoadProject = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    try {
      const project = await ProjectManager.importProject(file);
      handleStopAll();
      setCues(project.cues);
      
      const newScenes = new Set(['default']);
      project.cues.forEach(c => c.scene && newScenes.add(c.scene));
      setScenes(Array.from(newScenes).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})));
      
      setFileMap(project.fileMap);
    } catch (e) {
      alert("Failed to load project: " + e.message);
    }
  };

  return (
    <div className="app-container">
      <Header 
        onAddScene={handleAddScene}
        onImportAudio={handleImportAudio}
        onSave={handleSaveProject}
        onLoad={handleLoadProject}
        globalFadeTime={globalFadeTime}
        setGlobalFadeTime={setGlobalFadeTime}
        onFadeAll={handleFadeAll}
        onStopAll={handleStopAll}
      />
      
      <div className="content-wrapper">
        <div className="middle-section">
          <main className="main-content">
            <SoundGrid 
              cues={cues}
              scenes={scenes}
              activeNodes={activeNodes}
              onPlay={handlePlay}
              onFadeIn={handleFadeIn}
              onStop={handleStop}
              onFade={handleFade}
              onEdit={(id) => setEditingCueId(id)}
              onRemoveScene={handleRemoveScene}
              onVolumeChange={handleVolumeChange}
              onDropCue={handleDropCue}
              onTogglePin={handleTogglePin}
              onToggleLoop={(id) => {
                const cue = cues.find(c => c.id === id);
                if (cue) saveEdit(id, { loop: !cue.loop });
              }}
            />
          </main>
          
          <aside className="pinned-sidebar">
            <div className="pinned-header">Pinned Sounds</div>
            <div className="pinned-content">
              {cues.filter(c => c.pinned).sort((a,b) => a.order - b.order).map(cue => (
                <SoundButton
                  key={cue.id}
                  cue={cue}
                  isActive={activeNodes.has(cue.id)}
                  onPlay={handlePlay}
                  onStop={handleStop}
                  onFade={handleFade}
                  onEdit={(id) => setEditingCueId(id)}
                  onVolumeChange={handleVolumeChange}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </aside>
        </div>
        
        <Mixer 
          activeNodes={activeNodes}
          cues={cues}
          onVolumeChange={handleVolumeChange}
          onSeek={handleSeek}
          onStop={handleStop}
          onFadeIn={handleFadeIn}
          onFade={handleFade}
          onSpeedChange={handleSpeedChange}
          onToggleLoop={(id) => {
            const cue = cues.find(c => c.id === id);
            if (cue) {
              const newLoop = !cue.loop;
              saveEdit(id, { loop: newLoop });
            }
          }}
        />
      </div>

      <div className="shortcuts-bar" style={{ display: 'flex', gap: '16px', padding: '8px 24px', background: 'rgba(0,0,0,0.5)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div><span style={{ color: 'white', fontWeight: 'bold' }}>Click</span> Play / Restart</div>
        <div><span style={{ color: 'white', fontWeight: 'bold' }}>Right Click</span> Edit Sound</div>
        <div><span style={{ color: 'white', fontWeight: 'bold' }}>Esc</span> Fade Out All</div>
        <div><span style={{ color: 'white', fontWeight: 'bold' }}>Backspace</span> Stop All Immediately</div>
      </div>

      {editingCueId && (
        <EditModal 
          cue={cues.find(c => c.id === editingCueId)}
          cuesList={cues}
          onSave={saveEdit}
          onCancel={() => setEditingCueId(null)}
          onDelete={deleteCue}
          onDuplicate={duplicateCue}
        />
      )}
    </div>
  );
}
