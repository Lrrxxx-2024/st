import * as THREE from 'three';

// Constants
export const TREE_HEIGHT = 12;
export const TREE_RADIUS_BOTTOM = 5.5;
export const SCATTER_RADIUS = 15;

/**
 * Generates a random point inside a sphere
 */
export const getScatterPoint = (radius: number = SCATTER_RADIUS): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

/**
 * Generates a point on a cone surface (The Tree) with Organic Volume Scattering
 * Replaces strict spiral with random volume distribution
 */
export const getTreePoint = (height: number = TREE_HEIGHT, radius: number = TREE_RADIUS_BOTTOM, yOffset: number = -height/2): THREE.Vector3 => {
  // 1. Random Height (0 to 1)
  const h = Math.random(); 
  const y = h * height + yOffset;
  
  // 2. Max Radius at this height
  const maxR = radius * (1 - h);
  
  // 3. Random Radius with bias away from center (Volume Scattering)
  // bias: ensures tree isn't hollow but also not too dense at center (which simple random would do)
  // Using sqrt(random) gives uniform distribution on a disk.
  // We offset min radius slightly to ensure core density isn't infinite and looks 'branchy'
  const r = maxR * (0.2 + 0.8 * Math.sqrt(Math.random()));
  
  // 4. Random Angle
  const theta = Math.random() * Math.PI * 2;
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;