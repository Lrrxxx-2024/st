import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { UserPhotos } from './UserPhotos';
import { Gifts } from './Gifts';
import { TreeState } from '../types';

// --- Base Sparkles (Fireflies) ---
const BaseSparkles = () => {
  const count = 200;
  const mesh = useRef<THREE.Points>(null);

  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        // Radius 10 to 20
        const r = 10 + Math.random() * 10; 
        const theta = Math.random() * Math.PI * 2;
        
        pos[i * 3] = r * Math.cos(theta); // x
        pos[i * 3 + 1] = -15 + Math.random() * 7; // y: -15 to -8
        pos[i * 3 + 2] = r * Math.sin(theta); // z
        
        rnd[i] = Math.random();
    }
    return { positions: pos, randoms: rnd };
  }, []);

  useFrame((state) => {
      if(mesh.current) {
          const time = state.clock.elapsedTime;
          // Gentle floating movement
          mesh.current.position.y = Math.sin(time * 0.2) * 0.5;
          mesh.current.rotation.y = time * 0.05;
      }
  });

  return (
      <points ref={mesh}>
          <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial 
            size={0.15} 
            color="#FFEA00" 
            transparent 
            opacity={0.6} 
            blending={THREE.AdditiveBlending} 
            depthWrite={false}
          />
      </points>
  );
};

interface ExperienceProps {
  treeState: TreeState;
  setTreeState: (state: TreeState) => void;
  userPhotos: string[];
  focusedPhotoId: string | null;
  setFocusedPhotoId: (id: string | null) => void;
  visionEnabled: boolean;
}

export const Experience: React.FC<ExperienceProps> = ({ 
  treeState, 
  setTreeState, 
  userPhotos,
  focusedPhotoId,
  setFocusedPhotoId,
  visionEnabled
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  
  // Hand Tracking Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const targetRotation = useRef({ x: 0, y: 0 });

  // Setup MediaPipe
  useEffect(() => {
    if (!visionEnabled) return;

    let isMounted = true;

    const setupHandTracking = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        if (!isMounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (!isMounted) {
            landmarker.close();
            return;
        }
        
        handLandmarkerRef.current = landmarker;

        // Get Webcam
        const video = document.getElementById("webcam") as HTMLVideoElement;
        videoRef.current = video;
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 1280, 
              height: 720 
            } 
          });
          
          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          video.srcObject = stream;
          video.onloadedmetadata = () => {
            if (isMounted) video.play().catch(e => console.error("Video play error:", e));
          };
        }
      } catch (error) {
        console.error("Error initializing MediaPipe or Webcam:", error);
      }
    };
    
    setupHandTracking();

    // Cleanup function
    return () => {
      isMounted = false;
      
      // Close Landmarker
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      
      // Stop Camera Stream
      const video = document.getElementById("webcam") as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    };
  }, [visionEnabled]);

  // Gesture Recognition Logic
  const detectGestures = (landmarks: any[]) => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const midTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const handCenter = landmarks[9]; // Middle finger mcp

    // Distance Helper
    const dist = (p1: any, p2: any) => Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
    );

    // 1. FIST Detection (Average distance from tips to wrist < 0.15)
    const tips = [indexTip, midTip, ringTip, pinkyTip];
    const avgDistToWrist = tips.reduce((acc, tip) => acc + dist(tip, wrist), 0) / 4;
    
    // 2. OPEN HAND Detection (Avg distance > 0.35)
    // 3. PINCH Detection (Thumb to Index < 0.05)
    const pinchDist = dist(thumbTip, indexTip);

    // --- State Machine Logic ---
    if (avgDistToWrist < 0.15) {
      if (treeState !== TreeState.TREE_SHAPE) setTreeState(TreeState.TREE_SHAPE);
    } 
    else if (avgDistToWrist > 0.35) {
      if (treeState !== TreeState.SCATTERED) setTreeState(TreeState.SCATTERED);
    }
    else if (pinchDist < 0.05) {
      if (treeState !== TreeState.FOCUS && userPhotos.length > 0) {
        setTreeState(TreeState.FOCUS);
        // Randomly select a photo
        const randomId = `photo-${Math.floor(Math.random() * userPhotos.length)}`;
        setFocusedPhotoId(randomId);
      }
    }

    // 4. HAND ROTATION (Active in SCATTER)
    // We only update target rotation if NOT in TREE_SHAPE, but usually only helpful in SCATTER
    if (treeState !== TreeState.TREE_SHAPE) {
       // Map X (0-1) to Rotation Y (-1.5 to 1.5 radians approx)
       // Map Y (0-1) to Rotation X
       // In MediaPipe, X is 0 (left) to 1 (right)
       targetRotation.current.y = (handCenter.x - 0.5) * 3.0; 
       targetRotation.current.x = (handCenter.y - 0.5) * 3.0; 
    } else {
        targetRotation.current.x = 0;
        targetRotation.current.y = 0; // Reset or let auto-spin handle it
    }
  };

  // Mouse Interaction Handler
  const handlePhotoClick = (id: string) => {
    setFocusedPhotoId(id);
    setTreeState(TreeState.FOCUS);
  };

  useFrame((state) => {
    // Process MediaPipe Frame with Strict Validation
    if (
      visionEnabled && 
      handLandmarkerRef.current && 
      videoRef.current && 
      videoRef.current.readyState >= 2 && // HAVE_CURRENT_DATA
      !videoRef.current.paused &&         // Video must be playing
      videoRef.current.videoWidth > 0 &&  // Strictly positive width
      videoRef.current.videoHeight > 0 && // Strictly positive height
      videoRef.current.currentTime !== lastVideoTimeRef.current
    ) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        try {
          const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
          
          if (results.landmarks && results.landmarks.length > 0) {
              detectGestures(results.landmarks[0]);
          }
        } catch (e) {
          // Swallow sporadic errors or graph crashes to prevent app freeze
          // console.warn("MediaPipe Detect Error:", e);
        }
    }

    // Animation Loop for Group Rotation
    if (groupRef.current) {
        if (treeState === TreeState.TREE_SHAPE) {
            // Default Auto Spin
            groupRef.current.rotation.y += 0.002;
            // Lerp back to 0 on X
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
        } else if (treeState === TreeState.FOCUS) {
            // MODE: FOCUS - Center the Group
            // Smoothly reset rotation to 0,0,0 so the coordinate system aligns with Camera
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
        } else {
            // MODE: SCATTER - Hand Controlled Rotation
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, 0.05);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, 0.05);
        }
    }
    
    // Star Spin
    if (starRef.current) {
        starRef.current.rotation.y += 0.01;
    }
  });

  // Generate 5-pointed Star Shape
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.5;
    const innerRadius = 0.7; // Depth of the star cuts
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const starExtrudeSettings = useMemo(() => ({
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2
  }), []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 25]} fov={50} ref={cameraRef} />
      
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={40}
      />

      {/* Lighting: Bright & Cheerful */}
      <ambientLight intensity={0.6} color="#ffffff" /> 
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#fff" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={1.5} color="#FFEA00" />
      <pointLight position={[0, -5, 10]} intensity={0.5} color="#00BFFF" />

      <pointLight 
        position={[0, -12, 0]} 
        intensity={4.0} 
        distance={25} 
        color="#FFD700" 
        decay={2}
      />

      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <group ref={groupRef} position={[0, -4, 0]}>
        <BaseSparkles />
        <pointLight position={[0, 6, 0]} intensity={1} color="#FFD700" distance={10} decay={2} />

        <Foliage state={treeState} count={12000} />
        <Ornaments state={treeState} count={600} />
        <Gifts state={treeState} />
        
        {/* Pass click handler and props */}
        <UserPhotos 
            photos={userPhotos} 
            state={treeState} 
            focusedId={focusedPhotoId}
            onPhotoClick={handlePhotoClick}
        />
        
        <group position={[0, 6.5, 0]}>
            <mesh 
                ref={starRef} 
                scale={treeState === TreeState.TREE_SHAPE ? 1 : 0}
                rotation={[0, 0, Math.PI / 10]} 
            >
                <extrudeGeometry args={[starShape, starExtrudeSettings]} />
                <meshStandardMaterial 
                    color="#FFD700" 
                    emissive="#FFD700" 
                    emissiveIntensity={2.0} 
                    toneMapped={false}
                />
                <pointLight color="#FFD700" distance={30} intensity={5} decay={2} />
            </mesh>
        </group>
      </group>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.2} 
          radius={0.5} 
        />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
        <Noise opacity={0.02} /> 
      </EffectComposer>
    </>
  );
};