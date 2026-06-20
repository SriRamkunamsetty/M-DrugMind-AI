import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ParsedAtom, ParsedBond } from "../types";

// Standard CPK Color Guide for structural biochemistry
const CPK_COLORS: Record<string, string> = {
  H: "#ffffff", // White
  C: "#909090", // Gray
  N: "#3050f8", // Blue
  O: "#ff0d0d", // Red
  F: "#90e050", // Light Green
  CL: "#1ff01f", // Green
  S: "#ffff30", // Yellow
  P: "#ffa500", // Orange
  FE: "#e67e22", // Rust
  PDB_DEFAULT: "#00d2ff" // Bio-Default Cyan
};

interface MoleculeCanvas3DProps {
  atoms: ParsedAtom[];
  bonds?: ParsedBond[];
  displayMode?: "ball-stick" | "space-fill" | "backbone";
}

export default function MoleculeCanvas3D({
  atoms,
  bonds = [],
  displayMode = "ball-stick"
}: MoleculeCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredAtom, setHoveredAtom] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current || atoms.length === 0) return;

    // Retrieve container sizing
    const width = mountRef.current.clientWidth || 500;
    const height = mountRef.current.clientHeight || 400;

    // Initialize 3D Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0c0f16"); // Deep Space Obsidian

    // Camera Configuration
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 45;

    // WebGL Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear previous children
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Illuminations
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3050f8, 0.4); // Cool clinical blue bounce
    dirLight2.position.set(-20, -40, -20);
    scene.add(dirLight2);

    // Structural Grouping Setup
    const molGroup = new THREE.Group();
    scene.add(molGroup);

    // Calculate Molecule Centroid to anchor perfect rotation
    let sumX = 0, sumY = 0, sumZ = 0;
    atoms.forEach((atom) => {
      sumX += atom.x;
      sumY += atom.y;
      sumZ += atom.z;
    });
    const centerX = sumX / atoms.length;
    const centerY = sumY / atoms.length;
    const centerZ = sumZ / atoms.length;

    // Geometry templates to optimize GPU instancing
    const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
    const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);

    // Render Atom Spheres
    const atomMeshList: THREE.Mesh[] = [];
    atoms.forEach((atom, idx) => {
      const elementUpper = atom.element.toUpperCase().trim();
      const colorHex = CPK_COLORS[elementUpper] || CPK_COLORS.PDB_DEFAULT;
      
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(colorHex),
        shininess: 90,
        specular: new THREE.Color("#333333")
      });

      const mesh = new THREE.Mesh(sphereGeometry, material);
      
      // Determine sphere radii representing molecular CPK sizes
      let radius = 0.8;
      if (displayMode === "space-fill") {
        radius = elementUpper === "H" ? 1.0 : elementUpper === "C" ? 1.7 : elementUpper === "O" ? 1.52 : 1.9;
      } else if (displayMode === "backbone") {
        radius = 0.4;
      } else {
        // Ball-and-stick
        radius = elementUpper === "H" ? 0.35 : elementUpper === "C" ? 0.65 : elementUpper === "O" ? 0.55 : 0.7;
      }

      mesh.scale.set(radius, radius, radius);
      
      // Position offsetted around the center coordinate
      mesh.position.set(atom.x - centerX, atom.y - centerY, atom.z - centerZ);
      
      // Store ID data for custom interactions
      mesh.userData = { 
        id: atom.id || idx,
        name: atom.name || atom.element,
        resName: atom.resName,
        resSeq: atom.resSeq,
        element: atom.element
      };

      molGroup.add(mesh);
      atomMeshList.push(mesh);
    });

    // Draw Bonds: Supporting automatic closeness bonds or database bonds
    if (displayMode !== "space-fill") {
      if (bonds && bonds.length > 0) {
        // Render explicit bonds
        bonds.forEach((bond) => {
          const fromAtom = atoms.find(a => a.id === bond.from);
          const toAtom = atoms.find(a => a.id === bond.to);
          
          if (fromAtom && toAtom) {
            drawBondCylinder(
              fromAtom.x - centerX, fromAtom.y - centerY, fromAtom.z - centerZ,
              toAtom.x - centerX, toAtom.y - centerY, toAtom.z - centerZ,
              molGroup, cylinderGeometry
            );
          }
        });
      } else {
        // Automatic bio closeness-bonds calculation logic (highly robust for PDB lists)
        const bondLimitSq = 1.9 * 1.9; // 1.9 Å squared
        for (let i = 0; i < atoms.length; i++) {
          const atomA = atoms[i];
          for (let j = i + 1; j < atoms.length; j++) {
            const atomB = atoms[j];
            
            // Avoid bonding faraway chain atoms
            if (atomA.chainId && atomB.chainId && atomA.chainId !== atomB.chainId) continue;
            
            const dx = atomA.x - atomB.x;
            const dy = atomA.y - atomB.y;
            const dz = atomA.z - atomB.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < bondLimitSq && distSq > 0.4) {
              drawBondCylinder(
                atomA.x - centerX, atomA.y - centerY, atomA.z - centerZ,
                atomB.x - centerX, atomB.y - centerY, atomB.z - centerZ,
                molGroup, cylinderGeometry
              );
            }
          }
        }
      }
    }

    // Helper: Draws cylinders matching bonds positions & orientations
    function drawBondCylinder(
      x1: number, y1: number, z1: number,
      x2: number, y2: number, z2: number,
      parentGroup: THREE.Group,
      geo: THREE.CylinderGeometry
    ) {
      const start = new THREE.Vector3(x1, y1, z1);
      const end = new THREE.Vector3(x2, y2, z2);
      const distance = start.distanceTo(end);
      const position = end.clone().add(start).multiplyScalar(0.5);

      const mat = new THREE.MeshPhongMaterial({
        color: 0x555555,
        shininess: 40
      });

      const cylinder = new THREE.Mesh(geo, mat);
      cylinder.scale.set(1, distance, 1);
      cylinder.position.copy(position);

      // Orientation calculation matching points
      const direction = end.clone().sub(start).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      cylinder.quaternion.setFromUnitVectors(up, direction);

      parentGroup.add(cylinder);
    }

    // Interactive Drag and Zoom Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    // Zoom bindings
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.min(150, Math.max(10, camera.position.z + e.deltaY * 0.04));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    domElement.addEventListener("wheel", handleWheel, { passive: false });

    // Instanced Scene Animation loops
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Interpolated dampening rotation controls
      molGroup.rotation.y += (targetRotationY - molGroup.rotation.y) * 0.1;
      molGroup.rotation.x += (targetRotationX - molGroup.rotation.x) * 0.1;

      // Slow dynamic continuous rotate (constant kinetic orbit if user isn't holding down)
      if (!isDragging) {
        targetRotationY += 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Responsive Canvas Resizers
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Memory structural cleanups
    return () => {
      cancelAnimationFrame(animationId);
      domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      domElement.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      
      // Dispose materials & geometries
      sphereGeometry.dispose();
      cylinderGeometry.dispose();
      scene.clear();
      renderer.dispose();
    };
  }, [atoms, bonds, displayMode]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-gray-800" id="3d-molecule-container">
      {/* Three Rendering Mountpoint */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Embedded CPK Legend & Rotation Indicator Overlay */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-[10px] text-gray-400 bg-gray-950/85 backdrop-blur-md p-2.5 rounded-lg border border-gray-800 pointer-events-none" id="cpk-legend-panel">
        <span className="font-semibold text-gray-200">CPK Colors:</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full border border-gray-500 bg-white" /> H
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-500" /> C
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-600" /> O
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600" /> N
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" /> S
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> P
        </div>
      </div>

      <div className="absolute top-4 right-4 text-[10px] text-gray-400 bg-gray-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-gray-800 pointer-events-none" id="render-stats-panel">
        <span className="text-cyan-400 font-mono font-medium">Model Specs: </span>
        {atoms.length} Atoms
      </div>
    </div>
  );
}
