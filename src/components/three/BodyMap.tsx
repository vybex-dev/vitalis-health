"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface BodyRegionDef {
  id: string;
  label: string;
}

// ---------------------------------------------------------------- geometry
// The figure is built from stacked primitive "chains" (a sequence of joint
// spheres and limb capsules) so every joint and limb segment is its own
// selectable region instead of one solid arm/leg blob. Each chain is laid
// out programmatically (see layoutChain) rather than hand-placed, so
// segments always sit flush against each other with no gaps or heavy
// overlap regardless of how the radii/lengths above are tuned.

interface ChainSegmentSpec {
  id: string;
  label: string;
  kind: "joint" | "limb";
  radius: number;
  length?: number; // cylindrical length, "limb" segments only
}

const ARM_CHAIN: ChainSegmentSpec[] = [
  { id: "shoulder", label: "Shoulder", kind: "joint", radius: 0.135 },
  { id: "upper_arm", label: "Upper arm", kind: "limb", radius: 0.115, length: 0.5 },
  { id: "elbow", label: "Elbow", kind: "joint", radius: 0.1 },
  { id: "forearm", label: "Forearm", kind: "limb", radius: 0.095, length: 0.46 },
  { id: "hand", label: "Hand", kind: "limb", radius: 0.085, length: 0.16 },
];

const LEG_CHAIN: ChainSegmentSpec[] = [
  { id: "hip", label: "Hip", kind: "joint", radius: 0.155 },
  { id: "thigh", label: "Thigh", kind: "limb", radius: 0.155, length: 0.62 },
  { id: "knee", label: "Knee", kind: "joint", radius: 0.125 },
  { id: "lower_leg", label: "Lower leg", kind: "limb", radius: 0.115, length: 0.58 },
  { id: "foot", label: "Foot", kind: "limb", radius: 0.1, length: 0.2 },
];

/** Lays out a chain of joints/limbs going downward from `startY`, each segment
 * overlapping the previous by `overlap` so there's never a visible gap.
 * Returns the local Y center for each segment, in the same order as input. */
function layoutChain(startY: number, chain: ChainSegmentSpec[], overlap = 0.035): number[] {
  let cursor = startY;
  const centers: number[] = [];
  for (const seg of chain) {
    const halfExtent = seg.kind === "joint" ? seg.radius : (seg.length ?? 0) / 2 + seg.radius;
    const center = cursor - halfExtent + overlap;
    centers.push(center);
    cursor = center - halfExtent;
  }
  return centers;
}

const TORSO = {
  chestY: 1.55,
  chestR: 0.46,
  abdomenY: 0.95,
  pelvisY: 0.55,
  pelvisR: 0.4,
  pelvisLen: 0.14,
};

const SHOULDER_Y = 1.86;
const HIP_Y = 0.14;
const ARM_X = 0.74;
const LEG_X = 0.23;

const ARM_LOCAL_Y = layoutChain(0, ARM_CHAIN);
const LEG_LOCAL_Y = layoutChain(0, LEG_CHAIN);

const CORE_REGIONS: BodyRegionDef[] = [
  { id: "head", label: "Head & neck" },
  { id: "chest", label: "Chest" },
  { id: "abdomen", label: "Abdomen" },
  { id: "pelvis", label: "Pelvis / groin" },
  { id: "back", label: "Back" },
];

function sideLabel(side: "left" | "right", label: string) {
  return `${side === "left" ? "Left" : "Right"} ${label.toLowerCase()}`;
}

export const BODY_REGIONS: BodyRegionDef[] = [
  ...CORE_REGIONS,
  ...(["left", "right"] as const).flatMap((side) =>
    ARM_CHAIN.map((seg) => ({ id: `${side}_${seg.id}`, label: sideLabel(side, seg.label) }))
  ),
  ...(["left", "right"] as const).flatMap((side) =>
    LEG_CHAIN.map((seg) => ({ id: `${side}_${seg.id}`, label: sideLabel(side, seg.label) }))
  ),
];

const DEFAULT_COLOR = "#c7d6d1";
const HOVER_COLOR = "#9fd6bc";
const SELECTED_COLOR = "#ff6152";

// ------------------------------------------------------------------- scene
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

function ChainLimb({
  side,
  chain,
  localY,
  pivot,
  x,
  rotationZ,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  side: "left" | "right";
  chain: ChainSegmentSpec[];
  localY: number[];
  pivot: number;
  x: number;
  rotationZ?: number;
  selected: string | null;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <group position={[x, pivot, 0]} rotation={[0, 0, rotationZ ?? 0]}>
      {chain.map((seg, i) => {
        const regionId = `${side}_${seg.id}`;
        return (
          <RegionMesh
            key={regionId}
            id={regionId}
            selected={selected === regionId}
            hovered={hovered === regionId}
            onHover={onHover}
            onSelect={onSelect}
          >
            {(color) =>
              seg.kind === "joint" ? (
                <mesh position={[0, localY[i], 0]} castShadow>
                  <sphereGeometry args={[seg.radius, 20, 20]} />
                  <meshStandardMaterial color={color} roughness={0.6} />
                </mesh>
              ) : (
                <mesh position={[0, localY[i], 0]} castShadow>
                  <capsuleGeometry args={[seg.radius, seg.length, 8, 16]} />
                  <meshStandardMaterial color={color} roughness={0.6} />
                </mesh>
              )
            }
          </RegionMesh>
        );
      })}
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
  const core = (id: string) => ({
    selected: isSel(id),
    hovered: isHov(id),
    onHover,
    onSelect,
  });

  return (
    <group position={[0, -0.2, 0]}>
      <RegionMesh id="head" {...core("head")}>
        {(color) => (
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

      <RegionMesh id="chest" {...core("chest")}>
        {(color) => (
          <mesh position={[0, TORSO.chestY, 0]} castShadow>
            <capsuleGeometry args={[TORSO.chestR, 0.6, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )}
      </RegionMesh>

      <RegionMesh id="abdomen" {...core("abdomen")}>
        {(color) => (
          <mesh position={[0, TORSO.abdomenY, 0]} castShadow>
            <capsuleGeometry args={[0.38, 0.32, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )}
      </RegionMesh>

      <RegionMesh id="pelvis" {...core("pelvis")}>
        {(color) => (
          <mesh position={[0, TORSO.pelvisY, 0]} castShadow>
            <capsuleGeometry args={[TORSO.pelvisR, TORSO.pelvisLen, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )}
      </RegionMesh>

      <RegionMesh id="back" {...core("back")}>
        {(color) => (
          <mesh position={[0, 1.35, -0.42]} castShadow>
            <boxGeometry args={[0.7, 1.3, 0.14]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        )}
      </RegionMesh>

      <ChainLimb
        side="left"
        chain={ARM_CHAIN}
        localY={ARM_LOCAL_Y}
        pivot={SHOULDER_Y}
        x={-ARM_X}
        rotationZ={0.16}
        selected={selected}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
      />
      <ChainLimb
        side="right"
        chain={ARM_CHAIN}
        localY={ARM_LOCAL_Y}
        pivot={SHOULDER_Y}
        x={ARM_X}
        rotationZ={-0.16}
        selected={selected}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
      />
      <ChainLimb
        side="left"
        chain={LEG_CHAIN}
        localY={LEG_LOCAL_Y}
        pivot={HIP_Y}
        x={-LEG_X}
        selected={selected}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
      />
      <ChainLimb
        side="right"
        chain={LEG_CHAIN}
        localY={LEG_LOCAL_Y}
        pivot={HIP_Y}
        x={LEG_X}
        selected={selected}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
      />
    </group>
  );
}

// ------------------------------------------------------------ zoom controls
// Figure spans roughly y = -2.59 (feet) to y = 2.77 (head top) given the
// current chain geometry above — see the layoutChain comment. Centering the
// orbit target on the figure's true vertical midpoint (not a guessed value)
// and giving maxDistance enough room at this FOV is what makes "zoom out
// fully" actually show the whole figure instead of cropping the feet.
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 0.4, 8.1);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.1, 0);
const MIN_DISTANCE = 1.9;
const MAX_DISTANCE = 11;

type OrbitControlsInstance = React.ComponentRef<typeof OrbitControls>;

function ZoomControls({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsInstance | null> }) {
  function zoomBy(factor: number) {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    const target = controls.target as THREE.Vector3;
    const offset = camera.position.clone().sub(target);
    const newLength = THREE.MathUtils.clamp(offset.length() * factor, MIN_DISTANCE, MAX_DISTANCE);
    offset.setLength(newLength);
    camera.position.copy(target.clone().add(offset));
    controls.update();
  }

  function reset() {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    camera.position.copy(DEFAULT_CAMERA_POS);
    (controls.target as THREE.Vector3).copy(DEFAULT_TARGET);
    controls.update();
  }

  const buttonClass =
    "flex size-8 items-center justify-center rounded-lg border border-border bg-white/95 text-ink-soft shadow-sm transition-colors hover:bg-porcelain-2 hover:text-ink";

  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
      <button type="button" onClick={() => zoomBy(0.8)} className={buttonClass} aria-label="Zoom in">
        <ZoomIn className="size-4" />
      </button>
      <button type="button" onClick={() => zoomBy(1.25)} className={buttonClass} aria-label="Zoom out">
        <ZoomOut className="size-4" />
      </button>
      <button type="button" onClick={reset} className={buttonClass} aria-label="Reset view">
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------------- root
export default function BodyMap({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsInstance | null>(null);

  const activeLabel = useMemo(
    () => BODY_REGIONS.find((r) => r.id === (hovered ?? selected))?.label,
    [hovered, selected]
  );

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="relative flex-1">
        <Canvas
          shadows
          camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 38 }}
          gl={{ antialias: true, alpha: true }}
          onPointerMissed={() => setHovered(null)}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 5, 4]} intensity={1} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#4f9c7d" />
          <Figure selected={selected} hovered={hovered} onHover={setHovered} onSelect={onSelect} />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.7}
            target={DEFAULT_TARGET}
          />
        </Canvas>

        <ZoomControls controlsRef={controlsRef} />
      </div>

      <div className="flex min-h-[2.75rem] items-center justify-center border-t border-border bg-porcelain-2/50 px-3 py-2">
        <p className="text-sm font-medium text-ink">
          {activeLabel ?? <span className="font-normal text-ink-soft">Drag to rotate · tap a region to select it</span>}
        </p>
      </div>
    </div>
  );
}
