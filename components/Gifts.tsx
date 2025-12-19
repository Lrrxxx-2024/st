import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getScatterPoint, randomRange, TREE_HEIGHT, TREE_RADIUS_BOTTOM } from '../utils/math';
import { TreeState, OrnamentData } from '../types';

const tempObj = new THREE.Object3D();
const tempVec3 = new THREE.Vector3();

interface GiftsProps {
  state: TreeState;
}

export const Gifts: React.FC<GiftsProps> = ({ state }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 40;

  const data = useMemo(() => {
    const d: OrnamentData[] = [];
    
    // Define the Palette Colors
    const palette = {
      gold: new THREE.Color('#E2C99E'),   // Desert Sand (Gold)
      ruby: new THREE.Color('#852736'),   // Antique Ruby
      emerald: new THREE.Color('#023E28'),// Deep Emerald
      blue: new THREE.Color('#414B9E'),   // Chinese Blue
      purple: new THREE.Color('#AA74A0'), // Pearly Purple
    };

    const bottomY = -TREE_HEIGHT / 2; // -6

    for (let i = 0; i < count; i++) {
      // Scatter Logic
      const scatterPos = getScatterPoint(20);

      // Tree Logic (Base Cluster)
      const r = randomRange(2, TREE_RADIUS_BOTTOM + 2);
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = bottomY + Math.random() * 2; // -6 to -4

      const treePos = new THREE.Vector3(x, y, z);

      // Weighted Color Distribution Logic
      // Gold: ~40%, Ruby: ~35%, Emerald: ~10%, Blue/Purple: ~15%
      const rand = Math.random();
      let selectedColor: THREE.Color;

      if (rand < 0.40) {
        selectedColor = palette.gold;
      } else if (rand < 0.75) {
        selectedColor = palette.ruby; // 40% + 35%
      } else if (rand < 0.85) {
        selectedColor = palette.emerald; // 75% + 10%
      } else {
        // Remaining 15% split between Blue and Purple
        selectedColor = Math.random() > 0.5 ? palette.blue : palette.purple;
      }

      d.push({
        type: 'BOX',
        tree: treePos,
        scatter: scatterPos,
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
        scale: randomRange(1.0, 1.5), 
        speed: randomRange(0.5, 1.5),
        color: selectedColor
      });
    }
    return d;
  }, []);

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < data.length; i++) {
        meshRef.current.setColorAt(i, data[i].color);
      }
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [data]);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;
    
    // Smooth transition
    const targetMorph = state === TreeState.TREE_SHAPE ? 1 : 0;
    
    if (meshRef.current.userData.morphValue === undefined) meshRef.current.userData.morphValue = 0;
    meshRef.current.userData.morphValue = THREE.MathUtils.lerp(
      meshRef.current.userData.morphValue, 
      targetMorph, 
      1.5 * delta
    );
    const t = meshRef.current.userData.morphValue;
    const time = stateThree.clock.elapsedTime;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Position
      tempVec3.lerpVectors(item.scatter, item.tree, t);
      
      // Float when scattered
      if (t < 0.99) {
          tempVec3.y += Math.sin(time * item.speed + i) * 0.2 * (1 - t);
      }
      
      const rotY = item.rotation.y + (time * 0.5 * (1 - t));
      
      tempObj.position.copy(tempVec3);
      tempObj.rotation.set(item.rotation.x * (1-t), rotY, item.rotation.z * (1-t));
      tempObj.scale.setScalar(item.scale);
      
      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} /> 
      {/* Satin Finish for Gifts */}
      <meshStandardMaterial 
        metalness={0.2} 
        roughness={0.5}
        envMapIntensity={1.0}
      />
    </instancedMesh>
  );
};