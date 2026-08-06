"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export interface BodyRegionDef {
  id: string;
  label: string;
}

export const BODY_REGIONS: BodyRegionDef[] = [
  { id: "head", label: "Head & neck" },
  { id: "chest", label: "Chest" },
  { id: "abdomen", label: "Abdomen" },
  { id: "left_arm", label: "Left arm" },
  { id: "right_arm", label: "Right arm" },
  { id: "pelvis", label: "Pelvis / groin" },
  { id: "left_leg", label: "Left leg" },
  { id: "right_leg", label: "Right leg" },
  { id: "back", label: "Back" },
];

const DEFAULT_COLOR = "#c7d6d1";
const HOVER_COLOR = "#9fd6bc";
const SELECTED_COLOR = "#ff6152";

interface RegionMeshProps {
  id: string;
  selected: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  children: (color: string) => React.ReactNode;
}

function RegionMesh({ id, selected, hovered, onHover, onSelect, children }: RegionMeshProps) {
  const color = selected ? SELECTED_COLOR : hovered ? HOVER_COLOR : DEFAULT_COLOR;
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {children(color)}
    </group>
  );
}

function Figure({
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  selected: string | null;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const isSel = (id: string) => selected === id;
  const isHov = (id: string) => hovered === id;

  return (
    <group position={[0, -0.2, 0]}>
      {/* Head */}
      <RegionMesh id="head" selected={isSel("head")} hovered={isHov("head")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <>
            <mesh position={[0, 2.55, 0]} castShadow>
              <sphereGeometry args={[0.42, 32, 32]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0, 2.12, 0]}>
              <cylinderGeometry args={[0.14, 0.16, 0.22, 20]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          </>
        )}
      </RegionMesh>

      {/* Chest */}
      <RegionMesh id="chest" selected={isSel("chest")} hovered={isHov("chest")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <mesh position={[0, 1.55, 0]} castShadow>
            <capsuleGeometry args={[0.46, 0.6, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )}
      </RegionMesh>

      {/* Abdomen */}
      <RegionMesh id="abdomen" selected={isSel("abdomen")} hovered={isHov("abdomen")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <mesh position={[0, 0.95, 0]} castShadow>
            <capsuleGeometry args={[0.38, 0.32, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )}
      </RegionMesh>

      {/* Pelvis */}
      <RegionMesh id="pelvis" selected={isSel("pelvis")} hovered={isHov("pelvis")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <mesh position={[0, 0.55, 0]} castShadow>
            <capsuleGeometry args={[0.4, 0.14, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )}
      </RegionMesh>

      {/* Back (slightly offset behind torso so it's selectable from the rear) */}
      <RegionMesh id="back" selected={isSel("back")} hovered={isHov("back")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <mesh position={[0, 1.35, -0.42]} castShadow>
            <boxGeometry args={[0.7, 1.3, 0.14]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        )}
      </RegionMesh>

      {/* Left arm (viewer's left = figure's right, but we label by viewer perspective for simplicity) */}
      <RegionMesh id="left_arm" selected={isSel("left_arm")} hovered={isHov("left_arm")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <group position={[-0.72, 1.55, 0]} rotation={[0, 0, 0.18]}>
            <mesh position={[0, -0.05, 0]} castShadow>
              <capsuleGeometry args={[0.13, 0.75, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[-0.05, -0.85, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.6, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          </group>
        )}
      </RegionMesh>

      <RegionMesh id="right_arm" selected={isSel("right_arm")} hovered={isHov("right_arm")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <group position={[0.72, 1.55, 0]} rotation={[0, 0, -0.18]}>
            <mesh position={[0, -0.05, 0]} castShadow>
              <capsuleGeometry args={[0.13, 0.75, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0.05, -0.85, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.6, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          </group>
        )}
      </RegionMesh>

      {/* Legs */}
      <RegionMesh id="left_leg" selected={isSel("left_leg")} hovered={isHov("left_leg")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <group position={[-0.22, 0.15, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <capsuleGeometry args={[0.16, 0.85, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0, -1.05, 0.05]} castShadow>
              <capsuleGeometry args={[0.13, 0.8, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          </group>
        )}
      </RegionMesh>

      <RegionMesh id="right_leg" selected={isSel("right_leg")} hovered={isHov("right_leg")} onHover={onHover} onSelect={onSelect}>
        {(color: string) => (
          <group position={[0.22, 0.15, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <capsuleGeometry args={[0.16, 0.85, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0, -1.05, 0.05]} castShadow>
              <capsuleGeometry args={[0.13, 0.8, 8, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          </group>
        )}
      </RegionMesh>
    </group>
  );
}

export default function BodyMap({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const activeLabel = BODY_REGIONS.find((r) => r.id === (hovered ?? selected))?.label;

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [0, 1.1, 5.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => setHovered(null)}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#4f9c7d" />
        <Figure selected={selected} hovered={hovered} onHover={setHovered} onSelect={onSelect} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.5}
          maxDistance={7}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.7}
          target={new THREE.Vector3(0, 1.1, 0)}
        />
        {activeLabel && (
          <Html position={[0, 2.9, 0]} center distanceFactor={8}>
            <div className="pointer-events-none rounded-full bg-ink px-3 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg">
              {activeLabel}
            </div>
          </Html>
        )}
      </Canvas>
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-ink-soft">
        Drag to rotate · tap a region to select it
      </p>
    </div>
  );
}
