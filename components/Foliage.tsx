import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getScatterPoint, getTreePoint, TREE_HEIGHT } from '../utils/math';
import { TreeState } from '../types';

// Custom Shader Material for the Foliage
// Updated Colors: Base = Deep Forest Green (#023E28), Tip = Desert Sand (#E2C99E)
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMorphFactor: { value: 0 }, // 0 = Scatter, 1 = Tree
    uColorBase: { value: new THREE.Color('#023E28') }, // Deep Forest Green
    uColorTip: { value: new THREE.Color('#E2C99E') },  // Desert Sand (Gold)
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMorphFactor;
    attribute vec3 aTreePosition;
    attribute vec3 aScatterPosition;
    attribute float aRandom;
    attribute float aSize;

    varying vec3 vColor;
    varying float vAlpha;

    // Cubic easing for smoother transition
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      // Ease the morph factor
      float t = easeInOutCubic(uMorphFactor);

      // Mix positions based on morph factor
      vec3 targetPos = mix(aScatterPosition, aTreePosition, t);
      
      // Add "Breathing" / "Floating" animation
      float noiseAmp = mix(1.0, 0.2, t); 
      targetPos.x += sin(uTime * 1.5 + aRandom * 10.0) * 0.1 * noiseAmp;
      targetPos.y += cos(uTime * 1.2 + aRandom * 20.0) * 0.1 * noiseAmp;
      targetPos.z += sin(uTime * 1.8 + aRandom * 5.0) * 0.1 * noiseAmp;

      vec4 mvPosition = modelViewMatrix * vec4(targetPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation
      gl_PointSize = aSize * (300.0 / -mvPosition.z);

      // Pass randomness to fragment
      vAlpha = 0.6 + 0.4 * sin(uTime * 2.0 + aRandom * 100.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorBase;
    uniform vec3 uColorTip;
    varying float vAlpha;

    void main() {
      // Create a soft circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      if (dist > 0.5) discard;

      // Soft glow gradient
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 1.5);

      // Mix colors 
      vec3 color = mix(uColorBase, uColorTip, strength * 0.5);
      
      // Add extra brightness for bloom
      gl_FragColor = vec4(color * 2.0, vAlpha * strength);
    }
  `
};

interface FoliageProps {
  count?: number;
  state: TreeState;
}

export const Foliage: React.FC<FoliageProps> = ({ count = 6000, state }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate data once
  const { positions, treePositions, scatterPositions, randoms, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const treePositions = new Float32Array(count * 3);
    const scatterPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const sizes = new Float32Array(count);

    const yOffset = -TREE_HEIGHT / 2;

    for (let i = 0; i < count; i++) {
      // Tree coords
      const tPos = getTreePoint();
      treePositions[i * 3] = tPos.x;
      treePositions[i * 3 + 1] = tPos.y;
      treePositions[i * 3 + 2] = tPos.z;

      // Scatter coords
      const sPos = getScatterPoint();
      scatterPositions[i * 3] = sPos.x;
      scatterPositions[i * 3 + 1] = sPos.y;
      scatterPositions[i * 3 + 2] = sPos.z;

      randoms[i] = Math.random();
      
      // Size Gradient Logic
      const h = (tPos.y - yOffset) / TREE_HEIGHT;
      const scaleGradient = 0.8 + 0.4 * (1 - h);
      
      sizes[i] = (Math.random() * 0.5 + 0.2) * scaleGradient;
    }
    
    return { positions, treePositions, scatterPositions, randoms, sizes };
  }, [count]);

  useFrame((stateThree, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = stateThree.clock.elapsedTime;
      
      const targetFactor = state === TreeState.TREE_SHAPE ? 1.0 : 0.0;
      const currentFactor = shaderRef.current.uniforms.uMorphFactor.value;
      const speed = 2.0;
      
      shaderRef.current.uniforms.uMorphFactor.value = THREE.MathUtils.lerp(
        currentFactor,
        targetFactor,
        speed * delta
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions} 
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePosition"
          count={treePositions.length / 3}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPosition"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};