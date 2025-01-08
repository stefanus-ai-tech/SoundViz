import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface WaveVisualizerProps {
  audioData: Uint8Array;
}

const WaveVisualizer = ({ audioData }: WaveVisualizerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const waveRef = useRef<THREE.Line | null>(null);

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

    // Create wave
    const points = new Float32Array(128 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    waveRef.current = new THREE.Line(geometry, material);
    sceneRef.current.add(waveRef.current);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    sceneRef.current.add(ambientLight);
    sceneRef.current.add(directionalLight);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

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
    if (!waveRef.current) return;

    const positions = waveRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < audioData.length; i++) {
      positions[i * 3] = (i / audioData.length) * 20 - 10;
      positions[i * 3 + 1] = (audioData[i] / 128.0) * 3;
      positions[i * 3 + 2] = 0;
    }
    waveRef.current.geometry.attributes.position.needsUpdate = true;
  }, [audioData]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WaveVisualizer;