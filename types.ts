import * as THREE from 'three';

export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
  FOCUS = 'FOCUS',
}

export interface DualPosition {
  tree: THREE.Vector3;
  scatter: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  speed: number; // For individual flutter speed
}

export type OrnamentType = 'SPHERE' | 'BOX';

export interface OrnamentData extends DualPosition {
  type: OrnamentType;
  color: THREE.Color;
}

export interface UserPhotoData extends DualPosition {
  id: string;
  url: string;
}