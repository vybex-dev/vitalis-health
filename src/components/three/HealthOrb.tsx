"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

const TONE_COLOR: Record<string, string> = {
  great: "#4f9c7d",
  good: "#7ab89a",
  fair: "#e2a83f",
  needs_attention: "#d34331",
};

function OrbMesh({ tone }: { tone: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const color = TONE_COLOR[tone] ?? TONE_COLOR.good;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cycle = t % 1.1;
    const lub = Math.exp(-Math.pow((cycle - 0.08) * 14, 2));
    const dub = Math.exp(-Math.pow((cycle - 0.26) * 14, 2)) * 0.6;
    const scale = 1 + (lub + dub) * 0.08;
    if (meshRef.current) meshRef.current.scale.setScalar(scale);
    if (groupRef.current) groupRef.current.rotation.y = t * 0.25;
  });

  return (
    <group ref={groupRef}>
      <Sphere ref={meshRef} args={[1.3, 64, 64]}>
        <MeshDistortMaterial color={color} distort={0.28} speed={1.6} roughness={0.3} metalness={0.05} />
      </Sphere>
    </group>
  );
}

export default function HealthOrb({ tone = "good" }: { tone?: string }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 4.6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 3, 3]} intensity={1} />
      <OrbMesh tone={tone} />
    </Canvas>
  );
}
