import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

export class ProjectManager {
  static async exportProject(cues, fileMap, projectName = "Workspace") {
    const zip = new JSZip();
    
    // 1. Create JSON metadata
    const metadata = {
      version: 1,
      cues: cues.map(c => ({
        id: c.id,
        name: c.name,
        scene: c.scene,
        fileName: c.fileName,
        volume: c.volume,
        loop: c.loop,
        fadeInDuration: c.fadeInDuration,
        fadeOutDuration: c.fadeOutDuration,
        order: c.order,
      }))
    };
    
    zip.file("project.json", JSON.stringify(metadata, null, 2));

    // 2. Add audio files to the zip
    const audioFolder = zip.folder("audio");
    for (const [fileName, fileBlob] of fileMap.entries()) {
      audioFolder.file(fileName, fileBlob);
    }

    // 3. Generate Zip
    const blob = await zip.generateAsync({ type: "blob" });
    
    // 4. Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.soundboard`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async importProject(file) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // 1. Read JSON
    const projectFile = contents.file("project.json");
    if (!projectFile) throw new Error("Invalid .soundboard file: missing project.json");
    
    const projectJson = await projectFile.async("string");
    const metadata = JSON.parse(projectJson);
    
    // 2. Read Audio files
    const newFileMap = new Map();
    const audioFolder = contents.folder("audio");
    
    if (audioFolder) {
      const files = Object.keys(audioFolder.files);
      for (const filePath of files) {
        if (!audioFolder.files[filePath].dir) {
          const fileName = filePath.replace('audio/', '');
          const blob = await audioFolder.files[filePath].async("blob");
          // Convert Blob to File object to match our Map expectations
          const audioFile = new File([blob], fileName, { type: blob.type || 'audio/mpeg' });
          newFileMap.set(fileName, audioFile);
        }
      }
    }
    
    return {
      cues: metadata.cues,
      fileMap: newFileMap
    };
  }
}
