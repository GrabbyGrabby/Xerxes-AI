'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

function RotatingChromeSphere() {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (sphereRef.current) {
      // Slow elegant rotation
      sphereRef.current.rotation.y = time * 0.15;
      sphereRef.current.rotation.x = Math.sin(time * 0.05) * 0.1;
      
      // Floating motion
      sphereRef.current.position.y = Math.sin(time * 0.8) * 0.25;
    }
  });

  return (
    <mesh ref={sphereRef} position={[1.3, 0.1, -1]} scale={0.6}>
      <sphereGeometry args={[1, 128, 128]} />
      {/* High reflectivity metallic black sphere */}
      <meshPhysicalMaterial
        color="#111111"
        roughness={0.05}
        metalness={1.0}
        clearcoat={1.0}
        clearcoatRoughness={0.0}
        reflectivity={1.0}
      />
    </mesh>
  );
}

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);

  const count = 600;
  const [positions, colorArray] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = THREE.MathUtils.randFloat(0, Math.PI);
      const radius = THREE.MathUtils.randFloat(4, 15);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      const isTerracotta = Math.random() > 0.7;
      if (isTerracotta) {
        cols[i * 3] = 0.82;
        cols[i * 3 + 1] = 0.36;
        cols[i * 3 + 2] = 0.26;
      } else {
        cols[i * 3] = 0.95;
        cols[i * 3 + 1] = 0.85;
        cols[i * 3 + 2] = 0.75;
      }
    }
    return [pos, cols];
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

interface AmbientSceneProps {
  bgType?: 'login' | 'workspace';
}

export default function AmbientScene({ bgType = 'workspace' }: AmbientSceneProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bgHex = bgType === 'login' ? '#FAF9F6' : '#B5CBB7';

  if (!mounted) {
    return <div className="absolute inset-0 z-[-2]" style={{ backgroundColor: bgHex }} />;
  }

  return (
    <div className="absolute inset-0 z-[-2] overflow-hidden pointer-events-none select-none" style={{ backgroundColor: bgHex }}>
      {/* Light warm sunbeam overlays (subdued for milky/pista green) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.6} />
        {/* Powerful lights to create reflections on the metallic sphere */}
        <directionalLight position={[5, 5, 4]} intensity={2.8} color="#ffffff" />
        <directionalLight position={[-5, 3, -2]} intensity={1.0} color="#e5e5e5" />
        <pointLight position={[0, -4, 2]} intensity={0.5} />
        
        {/* City mirror HDRI environment for the sphere */}
        <Environment preset="city" />
        
        <RotatingChromeSphere />
        <ParticleField />
      </Canvas>
    </div>
  );
}
