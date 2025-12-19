import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getScatterPoint, getTreePoint, randomRange } from '../utils/math';
import { TreeState, UserPhotoData } from '../types';

interface UserPhotosProps {
  photos: string[];
  state: TreeState;
  focusedId: string | null;
  onPhotoClick: (id: string) => void;
}

// Sub-component for individual photo to handle texture loading gracefully
const PhotoFrame: React.FC<{ 
  data: UserPhotoData; 
  state: TreeState; 
  isFocused: boolean;
  onPhotoClick: (id: string) => void; 
}> = ({ data, state, isFocused, onPhotoClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, data.url);
  const { gl, camera } = useThree();
  
  // New Ref for Zoom Interaction
  const focusDistance = useRef(15.0);

  // Dynamic Aspect Ratio Logic
  const { width, height } = texture.image;
  const aspect = width / height;
  const baseHeight = 2.0; // Base height standard
  const planeWidth = baseHeight * aspect;
  const framePadding = 0.4;
  const frameWidth = planeWidth + framePadding;
  const frameHeight = baseHeight + framePadding;

  // Fix Texture Flickering / Aliasing
  useEffect(() => {
    if (texture) {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter; 
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy(); 
      texture.needsUpdate = true;
    }
  }, [texture, gl]);

  // Scroll to Zoom Listener
  useEffect(() => {
    if (!isFocused || state !== TreeState.FOCUS) return;

    // Reset distance when entering focus mode
    focusDistance.current = 15.0;

    const handleWheel = (e: WheelEvent) => {
      // Adjust sensitivity: e.deltaY is usually +/- 100
      const zoomSpeed = 0.02; 
      focusDistance.current = THREE.MathUtils.clamp(
        focusDistance.current + e.deltaY * zoomSpeed, 
        5.0, 
        40.0
      );
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isFocused, state]);

  useFrame((rootState, delta) => {
    if (!groupRef.current) return;

    const time = rootState.clock.elapsedTime;
    
    // --- STATE MACHINE ANIMATION LOGIC ---
    
    // We use Quaternions for rotation now to support smooth camera tracking (HUD mode)
    let targetPos = new THREE.Vector3();
    let targetRot = new THREE.Quaternion();
    let targetScale = 1.0;

    if (state === TreeState.FOCUS && isFocused) {
        // MODE C: FOCUS (HUD / Head-Locked)
        // The photo continuously tracks the camera to stay perfectly centered (Billboard).
        
        // 1. Calculate World Target Position
        // Use dynamic distance controlled by scroll
        const distance = focusDistance.current; 
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const targetWorldPos = camera.position.clone().add(forward.multiplyScalar(distance));
        
        // 2. Convert to Local Space
        // Since this group is a child of the rotating main tree group, 
        // we must convert the static world "HUD" coordinate into the parent's local space.
        if (groupRef.current.parent) {
            targetPos.copy(targetWorldPos);
            groupRef.current.parent.worldToLocal(targetPos);

            // 3. Orientation Calculation
            // We want the object's WORLD rotation to match the Camera's WORLD rotation.
            // Equation: ParentWorldQuat * LocalQuat = CameraWorldQuat
            // Solution: LocalQuat = inverse(ParentWorldQuat) * CameraWorldQuat
            
            const parentWorldQuat = new THREE.Quaternion();
            groupRef.current.parent.getWorldQuaternion(parentWorldQuat);
            
            targetRot.copy(camera.quaternion);
            targetRot.premultiply(parentWorldQuat.invert());
        } else {
            // Fallback (should not happen in this hierarchy)
            targetPos.copy(targetWorldPos);
            targetRot.copy(camera.quaternion);
        }

        // 4. Scale
        targetScale = 2.0; 

    } else if (state === TreeState.TREE_SHAPE) {
        // MODE A: TREE
        targetPos.copy(data.tree);
        
        // Convert stored Euler to Quaternion
        const euler = new THREE.Euler(data.rotation.x, data.rotation.y, data.rotation.z);
        targetRot.setFromEuler(euler);
        
        targetScale = data.scale;
    } else {
        // MODE B: SCATTER (Background)
        targetPos.copy(data.scatter);
        
        // Add floating noise for SCATTER mode
        targetPos.y += Math.sin(time * data.speed) * 0.5;
        targetPos.x += Math.cos(time * data.speed * 0.5) * 0.5;

        // Spin rotation (Animated Euler -> Quaternion)
        const euler = new THREE.Euler(
            data.rotation.x + (time * 0.2),
            data.rotation.y + (time * 0.3),
            data.rotation.z
        );
        targetRot.setFromEuler(euler);

        targetScale = data.scale;
    }

    // --- LERP TRANSITIONS ---
    // Use a factor of 0.1 for responsive but smooth tracking
    const lerpFactor = 0.1;

    groupRef.current.position.lerp(targetPos, lerpFactor);
    groupRef.current.quaternion.slerp(targetRot, lerpFactor);
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerpFactor);
  });

  return (
    <group 
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation(); // Stop raycast bubbling
        onPhotoClick(data.id);
      }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      {/* Gold Frame - Dynamic Size */}
      {/* Centered at 0. Depth 0.2 means faces are at -0.1 and +0.1 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[frameWidth, frameHeight, 0.2]} />
        <meshStandardMaterial 
            color="#D4AF37" 
            metalness={0.8} 
            roughness={0.2} 
            envMapIntensity={2} 
        />
      </mesh>
      
      {/* The Photo - Dynamic Size */}
      {/* Placed at +0.15 to strictly prevent Z-fighting with the frame's +0.1 face */}
      <mesh position={[0, 0, 0.15]}>
        <planeGeometry args={[planeWidth, baseHeight]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const UserPhotos: React.FC<UserPhotosProps> = ({ photos, state, focusedId, onPhotoClick }) => {
  // Generate 3D data for photos only when the photo list changes
  const photosData = useMemo(() => {
    return photos.map((url, index) => {
      // Position photos in the middle-to-bottom section of the tree for better visibility
      const treePos = getTreePoint(10, 5, -5); 
      const radialDir = new THREE.Vector3(treePos.x, 0, treePos.z).normalize();
      treePos.add(radialDir.multiplyScalar(0.8));

      return {
        id: `photo-${index}`,
        url,
        tree: treePos,
        scatter: getScatterPoint(18),
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0), 
        scale: randomRange(0.8, 1.2),
        speed: randomRange(0.5, 1.5),
      } as UserPhotoData;
    });
  }, [photos]);

  return (
    <group>
      {photosData.map((data) => (
        <PhotoFrame 
            key={data.id} 
            data={data} 
            state={state} 
            isFocused={focusedId === data.id}
            onPhotoClick={onPhotoClick}
        />
      ))}
    </group>
  );
};