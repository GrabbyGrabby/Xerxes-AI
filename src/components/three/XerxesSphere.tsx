'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function SphereMesh({ size }: { size: 'small' | 'large' }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      // Fast, smooth rotation for dynamic response
      meshRef.current.rotation.y = time * 2.2;
      meshRef.current.rotation.x = time * 1.3;
      
      // orbital float path
      meshRef.current.position.y = Math.sin(time * 3) * 0.08;
      meshRef.current.position.x = Math.cos(time * 3) * 0.08;
      
      if (size === 'small') {
        const pulse = 0.95 + Math.sin(time * 8) * 0.05;
        meshRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.65, 64, 64]} />
      {/* Super shiny polished black chrome/silver metal */}
      <meshPhysicalMaterial
        color="#ffffff"
        roughness={0.1}      // highly glossy
        metalness={0.3}       // balanced to look white and shiny
        clearcoat={1.0}       // high reflective lacquer
        clearcoatRoughness={0.1}
        reflectivity={1.0}
      />
    </mesh>
  );
}

export default function XerxesSphere({ size = 'small' }: { size?: 'small' | 'large' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`shrink-0 rounded-full bg-zinc-900 ${size === 'small' ? 'w-5 h-5' : 'w-12 h-12'}`} />;
  }

  // Smaller dimensions as requested to fit perfectly
  const dimensions = size === 'small' ? 'w-5 h-5' : 'w-14 h-14';

  return (
    <div className={`${dimensions} shrink-0 select-none pointer-events-none overflow-hidden flex items-center justify-center`}>
      <Canvas 
        camera={{ position: [0, 0, 2.5], fov: 50 }} 
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        {/* Crisp directional light to bounce silver chrome highlights */}
        <directionalLight position={[4, 4, 3]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-4, -4, -3]} intensity={0.8} color="#ffffff" />
        <SphereMesh size={size} />
      </Canvas>
    </div>
  );
}
