'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface ModelViewerProps {
  modelUrl: string | null;
}

export default function ModelViewer({ modelUrl }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  if (!modelUrl) {
    return (
      <div className="w-full h-[28rem] rounded-2xl border border-cyan-200/70 bg-[radial-gradient(circle_at_30%_30%,#ecfeff_0,#dbeafe_55%,#e2e8f0_100%)] shadow-md flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-white/80 border border-cyan-200 flex items-center justify-center text-cyan-700 font-bold">
            3D
          </div>
          <p className="text-slate-900 font-semibold text-lg">Terrain Preview Ready</p>
          <p className="text-slate-600 text-sm mt-2">
            Choose a location and click Generate Map to render a real-elevation terrain model.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf7ff);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      4000
    );
    camera.position.set(140, 130, 140);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 10, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    directionalLight.position.set(120, 160, 60);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0xb3e8ff, 0.6);
    rimLight.position.set(-100, 90, -120);
    scene.add(rimLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(600, 600);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6edf7,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }

    if (!modelUrl) return;

    loadSTL(sceneRef.current, modelUrl);
  }, [modelUrl]);

  const loadSTL = (scene: THREE.Scene, url: string) => {
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();

        const initialBox = new THREE.Box3().setFromBufferAttribute(
          geometry.attributes.position as THREE.BufferAttribute
        );
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const initialCenter = initialBox.getCenter(new THREE.Vector3());

        // Keep STL base at z=0 and center in x/y before rotating to Three.js Y-up.
        geometry.translate(-initialCenter.x, -initialCenter.y, -initialBox.min.z);

        const maxAxis = Math.max(initialSize.x, initialSize.y) || 1;
        const targetSize = 140;
        const scale = targetSize / maxAxis;

        const material = new THREE.MeshStandardMaterial({
          color: 0x0f766e,
          metalness: 0.08,
          roughness: 0.58,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.setScalar(scale);
        mesh.position.y = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        modelRef.current = mesh;
      },
      undefined,
      (error) => {
        console.error('Failed to load STL:', error);
      }
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-[28rem] bg-gradient-to-br from-cyan-100 to-slate-100 rounded-2xl shadow-md border border-cyan-200/70 flex items-center justify-center"
    >
      {!modelUrl && (
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold">3D Model Viewer</p>
          <p className="text-sm">Generate a map to view the 3D model here</p>
        </div>
      )}
    </div>
  );
}
