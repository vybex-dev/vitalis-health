"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { mulberry32 } from "@/lib/prng";

const CORAL = "#ff6152";
const SAGE = "#4f9c7d";
const INK = "#0e2b29";

function ParticleShell({ count = 900, radius = 2.6 }: { count?: number; radius?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(1337);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Even-ish distribution on a sphere shell with slight radius jitter.
      const theta = Math.acos(2 * rand() - 1);
      const phi = rand() * Math.PI * 2;
      const r = radius + (rand() - 0.5) * 0.5;
      arr[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(theta);
    }
    return arr;
  }, [count, radius]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.06;
    pointsRef.current.rotation.x = Math.sin(t * 0.04) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={SAGE} size={0.022} sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

/** A "lub-dub" style double pulse, echoing a real cardiac cycle rather than a plain sine wave. */
function heartbeatScale(t: number) {
  const cycle = t % 1.1;
  const lub = Math.exp(-Math.pow((cycle - 0.08) * 14, 2)) * 1;
  const dub = Math.exp(-Math.pow((cycle - 0.26) * 14, 2)) * 0.6;
  return 1 + (lub + dub) * 0.06;
}

function PulseCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<React.ComponentRef<typeof MeshDistortMaterial>>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scale = heartbeatScale(t);
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale);
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.12;
      // Gentle parallax toward the pointer.
      const targetX = state.pointer.y * 0.15;
      const targetY = state.pointer.x * 0.25;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.04;
      groupRef.current.rotation.y += (targetY + t * 0.12 - groupRef.current.rotation.y) * 0.04;
    }
    if (materialRef.current) {
      materialRef.current.distort = 0.32 + Math.sin(t * 0.6) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere ref={meshRef} args={[1.55, 96, 96]}>
        <MeshDistortMaterial
          ref={materialRef}
          color={CORAL}
          distort={0.32}
          speed={1.4}
          roughness={0.25}
          metalness={0.1}
          emissive={INK}
          emissiveIntensity={0.15}
        />
      </Sphere>
      <ParticleShell />
    </group>
  );
}

export default function PulseOrb() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 4, 4]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} color={SAGE} />
      <PulseCore />
    </Canvas>
  );
}
