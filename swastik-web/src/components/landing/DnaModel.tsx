'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useRef, useState } from 'react';
import type { Group } from 'three';

function Model() {
  const group = useRef<Group>(null);
  const { scene } = useGLTF('/models/dna-optimized-final.glb', '/draco-gltf/');

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.12;
      group.current.position.y = Math.sin(performance.now() * 0.0007) * 0.025;
    }
  });

  return (
    <group ref={group}>
      <Center>
        <primitive object={scene} scale={1.35} />
      </Center>
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial color="#2B806F" emissive="#BFE7D9" emissiveIntensity={1.4} />
    </mesh>
  );
}

class ModelErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#C18432" emissive="#FFF0C7" emissiveIntensity={1.2} />
        </mesh>
      );
    }

    return this.props.children;
  }
}

export default function DnaModel() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateVisibility = () => setIsDesktop(mediaQuery.matches);

    updateVisibility();
    mediaQuery.addEventListener('change', updateVisibility);
    return () => mediaQuery.removeEventListener('change', updateVisibility);
  }, []);

  if (!isDesktop) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute -inset-x-[6%] -top-[6%] bottom-0" aria-label="Interactive 3D DNA healthcare illustration" role="img">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 36 }}
        dpr={[1, 1.25]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        frameloop="always"
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 4]} intensity={2} color="#D9FFF4" />
        <directionalLight position={[-3, 1, 2]} intensity={1.4} color="#DCCFFF" />
        <ModelErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Model />
          </Suspense>
        </ModelErrorBoundary>
      </Canvas>
    </div>
  );
}
