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

    // Create wave with gradient colors
    const points = new Float32Array(128 * 3);
    const colors = new Float32Array(128 * 3);
    const geometry = new THREE.BufferGeometry();
    
    for (let i = 0; i < 128; i++) {
      const hue = (i / 128) * 360;
      const color = new THREE.Color(`hsl(${hue}, 100%, 70%)`);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({ 
      vertexColors: true,
      linewidth: 2,
    });
    
    waveRef.current = new THREE.Line(geometry, material);
    sceneRef.current.add(waveRef.current);

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
    if (!waveRef.current) return;

    const positions = waveRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < audioData.length; i++) {
      const angle = (i / audioData.length) * Math.PI * 2;
      const radius = 8 + (audioData[i] / 128.0) * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (audioData[i] / 128.0) * 3;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    waveRef.current.geometry.attributes.position.needsUpdate = true;
  }, [audioData]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WaveVisualizer;
