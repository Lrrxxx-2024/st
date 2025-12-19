import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getScatterPoint, getTreePoint, randomRange } from '../utils/math';
import { TreeState, OrnamentData } from '../types';

const tempObj = new THREE.Object3D();
const tempVec3 = new THREE.Vector3();

// --- CONFIG: Hybrid Art Deco Palette ---
const CONFIG = {
  colors: {
    emerald: new THREE.Color('#023E28'), // Deep Forest Green (The "Beautiful Green")
    ruby: new THREE.Color('#852736'),    // Antique Ruby
    gold: new THREE.Color('#E2C99E'),    // Desert Sand (Champagne Gold)
    blue: new THREE.Color('#414B9E'),    // Chinese Blue
    purple: new THREE.Color('#AA74A0'),  // Pearly Purple
  }
};

interface OrnamentsProps {
  count?: number;
  state: TreeState;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ count = 600, state }) => {
  // We need separate meshes for distinct material properties
  const goldRef = useRef<THREE.InstancedMesh>(null);
  const ceramicRef = useRef<THREE.InstancedMesh>(null);
  const satinRef = useRef<THREE.InstancedMesh>(null);
  const boxesRef = useRef<THREE.InstancedMesh>(null);

  // 1. GOLD (30%): Desert Sand
  const goldData = useMemo(() => 
    generateOrnamentData(Math.floor(count * 0.3), 'SPHERE', [CONFIG.colors.gold]), 
  [count]);

  // 2. CERAMIC (40%): Emerald & Ruby
  const ceramicData = useMemo(() => 
    generateOrnamentData(Math.floor(count * 0.4), 'SPHERE', [CONFIG.colors.emerald, CONFIG.colors.ruby]), 
  [count]);

  // 3. SATIN (30%): Blue & Purple
  const satinData = useMemo(() => 
    generateOrnamentData(Math.floor(count * 0.3), 'SPHERE', [CONFIG.colors.blue, CONFIG.colors.purple]), 
  [count]);

  // 4. Boxes (Small Gifts scattered on tree - Mix of Accent Colors)
  const boxData = useMemo(() => 
    generateOrnamentData(Math.floor(count * 0.15), 'BOX', [
      CONFIG.colors.gold, CONFIG.colors.ruby, CONFIG.colors.blue
    ]), 
  [count]);

  useLayoutEffect(() => {
    if (goldRef.current) applyColors(goldRef.current, goldData);
    if (ceramicRef.current) applyColors(ceramicRef.current, ceramicData);
    if (satinRef.current) applyColors(satinRef.current, satinData);
    if (boxesRef.current) applyColors(boxesRef.current, boxData);
  }, [goldData, ceramicData, satinData, boxData]);

  useFrame((rootState, delta) => {
    const time = rootState.clock.elapsedTime;
    const targetMorph = state === TreeState.TREE_SHAPE ? 1 : 0;
    
    updateInstances(goldRef.current, goldData, targetMorph, time, delta);
    updateInstances(ceramicRef.current, ceramicData, targetMorph, time, delta);
    updateInstances(satinRef.current, satinData, targetMorph, time, delta);
    updateInstances(boxesRef.current, boxData, targetMorph, time, delta);
  });

  return (
    <group>
      {/* 1. GOLD: High Shine Metallic (Desert Sand) */}
      <instancedMesh ref={goldRef} args={[undefined, undefined, goldData.length]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial 
          metalness={0.9} 
          roughness={0.2} 
          envMapIntensity={1.5}
        />
      </instancedMesh>

      {/* 2. CERAMIC: Deep Colors (Emerald, Ruby) - High Gloss Enamel */}
      <instancedMesh ref={ceramicRef} args={[undefined, undefined, ceramicData.length]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshPhysicalMaterial 
          metalness={0.1} 
          roughness={0.3} 
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          envMapIntensity={1.0}
        />
      </instancedMesh>

      {/* 3. SATIN: Soft Accents (Blue, Purple) */}
      <instancedMesh ref={satinRef} args={[undefined, undefined, satinData.length]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial 
          metalness={0.3} 
          roughness={0.4} 
          envMapIntensity={1.0}
        />
      </instancedMesh>

      {/* 4. Boxes: Metallic Foil */}
      <instancedMesh ref={boxesRef} args={[undefined, undefined, boxData.length]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial 
          metalness={0.6} 
          roughness={0.3}
          envMapIntensity={1.2}
        />
      </instancedMesh>
    </group>
  );
};

// --- Helpers ---

function generateOrnamentData(count: number, type: 'SPHERE' | 'BOX', colorPalette: THREE.Color[]): OrnamentData[] {
  const data: OrnamentData[] = [];

  for (let i = 0; i < count; i++) {
    const treePos = getTreePoint(12, 5.0, -6);
    // Push ornaments slightly outward so they sit ON the leaves, not inside
    const radialDir = new THREE.Vector3(treePos.x, 0, treePos.z).normalize();
    treePos.add(radialDir.multiplyScalar(0.4)); 

    const scatterPos = getScatterPoint(20);
    
    data.push({
      type,
      tree: treePos,
      scatter: scatterPos,
      rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      scale: randomRange(0.8, 1.5),
      speed: randomRange(0.5, 2.0),
      color: colorPalette[Math.floor(Math.random() * colorPalette.length)]
    });
  }
  return data;
}

function applyColors(mesh: THREE.InstancedMesh, data: OrnamentData[]) {
  for (let i = 0; i < data.length; i++) {
    mesh.setColorAt(i, data[i].color);
  }
  mesh.instanceColor!.needsUpdate = true;
}

function updateInstances(
  mesh: THREE.InstancedMesh | null, 
  data: OrnamentData[], 
  targetMorph: number, 
  time: number,
  delta: number
) {
  if (!mesh) return;
  
  if (mesh.userData.morphValue === undefined) mesh.userData.morphValue = 0;
  
  const speed = 1.5;
  mesh.userData.morphValue = THREE.MathUtils.lerp(mesh.userData.morphValue, targetMorph, speed * delta);
  const t = mesh.userData.morphValue;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // Position Mix
    tempVec3.lerpVectors(item.scatter, item.tree, t);
    
    // Add noise/floating
    const floatAmp = (1 - t) * 0.5; // Floats more when scattered
    tempVec3.y += Math.sin(time * item.speed + i) * floatAmp;
    tempVec3.x += Math.cos(time * item.speed * 0.5 + i) * floatAmp;

    // Rotation
    // Spin when scattered, stabilize when tree
    const rotX = item.rotation.x + (time * 0.2 * (1 - t));
    const rotY = item.rotation.y + (time * 0.5 * (1 - t));
    
    tempObj.position.copy(tempVec3);
    tempObj.rotation.set(rotX, rotY, item.rotation.z);
    tempObj.scale.setScalar(item.scale * (t * 0.5 + 0.5)); // Grow slightly when forming tree
    
    tempObj.updateMatrix();
    mesh.setMatrixAt(i, tempObj.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}