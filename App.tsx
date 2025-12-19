import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { Overlay } from './components/Overlay';
import { TreeState } from './types';

function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.SCATTERED);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);
  const [visionEnabled, setVisionEnabled] = useState(false);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE
    );
  };

  const toggleVision = () => {
    setVisionEnabled((prev) => !prev);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos: string[] = [];
      Array.from(e.target.files).forEach((file) => {
        newPhotos.push(URL.createObjectURL(file));
      });
      setUserPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#000805]">
      <Canvas
        dpr={[1, 2]} // Optimize pixel ratio for performance
        gl={{ 
          antialias: false, 
          powerPreference: "high-performance",
          toneMapping: 3, // CineonToneMapping
          toneMappingExposure: 1.5
        }} 
      >
        <Suspense fallback={null}>
          <Experience 
            treeState={treeState} 
            setTreeState={setTreeState}
            userPhotos={userPhotos} 
            focusedPhotoId={focusedPhotoId}
            setFocusedPhotoId={setFocusedPhotoId}
            visionEnabled={visionEnabled}
          />
        </Suspense>
      </Canvas>
      
      {/* Standard Drei Loader */}
      <Loader 
        containerStyles={{ background: '#000805' }}
        innerStyles={{ width: '200px', height: '2px', background: '#333' }}
        barStyles={{ height: '2px', background: '#D4AF37' }}
        dataStyles={{ fontSize: '10px', fontFamily: 'sans-serif', color: '#D4AF37', letterSpacing: '0.2em' }}
      />
      
      <Overlay 
        treeState={treeState} 
        toggleState={toggleState} 
        onPhotosUpload={handlePhotoUpload}
        visionEnabled={visionEnabled}
        toggleVision={toggleVision}
      />
    </div>
  );
}

export default App;