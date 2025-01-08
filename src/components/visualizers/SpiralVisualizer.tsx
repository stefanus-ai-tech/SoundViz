import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpiralVisualizerProps {
  audioData: Uint8Array;
}

const SpiralVisualizer = ({ audioData }: SpiralVisualizerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene with black background
    sceneRef.current = new THREE.Scene();
    sceneRef.current.fog = new THREE.Fog(0x000000, 1, 30);
    
    // Setup camera
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current.position.z = 15;
    cameraRef.current.position.y = 5;
    cameraRef.current.lookAt(0, 0, 0);

    // Setup renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    rendererRef.current.setClearColor(0x000000, 0);
    containerRef.current.appendChild(rendererRef.current.domElement);

    // Create spiral points with brighter colors
    const colors = [0xff69b4, 0x00ff99, 0x4169e1, 0xffd700, 0xff6347];
    for (let i = 0; i < colors.length; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(128 * 3);
      const color = new THREE.Color(colors[i]);
      
      for (let j = 0; j < 128; j++) {
        const angle = (j / 128) * Math.PI * 8;
        const radius = 1 + (j / 128) * 4;
        positions[j * 3] = Math.cos(angle) * radius;
        positions[j * 3 + 1] = (j / 128) * 4 - 2;
        positions[j * 3 + 2] = Math.sin(angle) * radius;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.PointsMaterial({
        size: 0.15,
        color: color,
        transparent: true,
        opacity: 0.9,
      });

      const points = new THREE.Points(geometry, material);
      sceneRef.current.add(points);
      pointsRef.current.push(points);
    }

    // Add ground plane for reflection
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      shininess: 100,
      specular: 0x222222,
      transparent: true,
      opacity: 0.5
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    sceneRef.current.add(ground);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x111111);
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 15, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    
    sceneRef.current.add(ambientLight);
    sceneRef.current.add(spotLight);

    let frame = 0;
    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

      frame += 0.005;
      cameraRef.current.position.x = Math.sin(frame) * 15;
      cameraRef.current.position.z = Math.cos(frame) * 15;
      cameraRef.current.lookAt(0, 0, 0);

      pointsRef.current.forEach((points, i) => {
        points.rotation.y += 0.002 * (i + 1);
      });

      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  useEffect(() => {
    pointsRef.current.forEach((points, i) => {
      const positions = points.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < audioData.length; j++) {
        const idx = j * 3;
        const angle = (j / audioData.length) * Math.PI * 8;
        const radius = 1 + (j / audioData.length) * 4;
        const amplitude = (audioData[j] / 128.0) * 2;
        
        positions[idx] = Math.cos(angle) * (radius + amplitude);
        positions[idx + 1] = (j / audioData.length) * 4 - 2 + amplitude;
        positions[idx + 2] = Math.sin(angle) * (radius + amplitude);
      }
      points.geometry.attributes.position.needsUpdate = true;
    });
  }, [audioData]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default SpiralVisualizer;
