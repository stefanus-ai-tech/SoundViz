import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BarVisualizerProps {
  audioData: Uint8Array;
}

const BarVisualizer = ({ audioData }: BarVisualizerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);

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

    // Create bars
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

    for (let i = 0; i < 32; i++) {
      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = i - 16;
      sceneRef.current.add(bar);
      barsRef.current.push(bar);
    }

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
    // Update bars based on audio data
    barsRef.current.forEach((bar, i) => {
      if (audioData && audioData[i]) {
        bar.scale.y = (audioData[i] / 128.0) * 3;
      }
    });
  }, [audioData]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default BarVisualizer;