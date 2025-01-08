import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CircularVisualizerProps {
  audioData: Uint8Array;
}

const CircularVisualizer = ({ audioData }: CircularVisualizerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    sceneRef.current = new THREE.Scene();
    
    // Setup camera
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current.position.z = 15;

    // Setup renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(rendererRef.current.domElement);

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(128 * 3);
    const colors = new Float32Array(128 * 3);

    for (let i = 0; i < 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * 5;
      positions[i * 3 + 1] = Math.sin(angle) * 5;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
    });

    pointsRef.current = new THREE.Points(geometry, material);
    sceneRef.current.add(pointsRef.current);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    sceneRef.current.add(ambientLight);
    sceneRef.current.add(directionalLight);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !pointsRef.current) return;

      pointsRef.current.rotation.z += 0.001;
      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Cleanup
    return () => {
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < audioData.length; i++) {
      const angle = (i / audioData.length) * Math.PI * 2;
      const radius = 5 + (audioData[i] / 128.0) * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  }, [audioData]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default CircularVisualizer;