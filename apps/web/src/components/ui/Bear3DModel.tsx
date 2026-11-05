"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, RotateCcw } from "lucide-react";

interface Bear3DModelProps {
  size?: number;
  className?: string;
  interactive?: boolean;
  showQuote?: boolean;
}

const BEAR_QUOTES = [
  "胸前的金黃 V 領，就是 VCP 波動收斂突破的最強訊號！",
  "主力洗盤震盪不用慌，看好 20MA 支撐與量價結構！",
  "我是熊霸 V-Bear，OmniTick 戰情哨兵為你守護每一筆交易！",
  "摸摸我！下單前嚴守紀律，嚴設停損，賺大賠小！",
  "盤中即時撮合 0 秒直連，主力爆量絕逃不過我的雙眼！",
];

export default function Bear3DModel({
  size = 280,
  className = "",
  interactive = true,
  showQuote = true,
}: Bear3DModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = size;
    const height = size;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x2a3852, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(4, 5, 5);
    scene.add(dirLight);

    // 金黃 V 領專屬反射光
    const goldLight = new THREE.PointLight(0xf59e0b, 2.5, 8);
    goldLight.position.set(0, -0.6, 2.5);
    scene.add(goldLight);

    // 科技青藍輪廓光 (Rim Light)
    const cyanRim = new THREE.DirectionalLight(0x00f2fe, 2.0);
    cyanRim.position.set(-5, 2, -2);
    scene.add(cyanRim);

    // 4. Materials
    // 黑曜岩毛皮材質
    const furMaterial = new THREE.MeshStandardMaterial({
      color: 0x161e2e,
      roughness: 0.55,
      metalness: 0.15,
    });

    const innerEarMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.4,
    });

    // 核心金黃 V 領材質 (極具光澤與微發光)
    const goldVMaterial = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.85,
    });

    // 科技護目鏡 / 雙眼材質
    const eyeVisorMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00f2fe,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });

    // 熊霸主體 Group
    const bearGroup = new THREE.Group();
    scene.add(bearGroup);

    // A. 頭部主體 (Head)
    const headGeo = new THREE.SphereGeometry(1.25, 32, 32);
    headGeo.scale(1, 0.94, 0.96);
    const headMesh = new THREE.Mesh(headGeo, furMaterial);
    headMesh.position.y = 0.55;
    bearGroup.add(headMesh);

    // B. 可愛圓潤雙耳 (Ears)
    const earGeo = new THREE.SphereGeometry(0.48, 24, 24);
    const innerEarGeo = new THREE.SphereGeometry(0.28, 20, 20);

    // 左耳
    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.position.set(-1.05, 1.48, -0.1);
    bearGroup.add(leftEar);

    const leftInnerEar = new THREE.Mesh(innerEarGeo, innerEarMaterial);
    leftInnerEar.position.set(-1.02, 1.48, 0.14);
    bearGroup.add(leftInnerEar);

    // 右耳
    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.position.set(1.05, 1.48, -0.1);
    bearGroup.add(rightEar);

    const rightInnerEar = new THREE.Mesh(innerEarGeo, innerEarMaterial);
    rightInnerEar.position.set(1.02, 1.48, 0.14);
    bearGroup.add(rightInnerEar);

    // C. 吻部 (Snout & Nose)
    const snoutGeo = new THREE.SphereGeometry(0.55, 24, 24);
    snoutGeo.scale(1.1, 0.72, 0.85);
    const snoutMesh = new THREE.Mesh(
      snoutGeo,
      new THREE.MeshStandardMaterial({ color: 0x222d42, roughness: 0.6 })
    );
    snoutMesh.position.set(0, 0.38, 0.92);
    bearGroup.add(snoutMesh);

    // 熊鼻 (Nose)
    const noseGeo = new THREE.SphereGeometry(0.18, 16, 16);
    noseGeo.scale(1.4, 0.8, 0.8);
    const noseMesh = new THREE.Mesh(
      noseGeo,
      new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 0.3 })
    );
    noseMesh.position.set(0, 0.52, 1.34);
    bearGroup.add(noseMesh);

    // D. 科技青藍發光雙眼 (Eyes)
    const eyeGeo = new THREE.SphereGeometry(0.14, 16, 16);
    eyeGeo.scale(1, 1.25, 0.75);

    const leftEye = new THREE.Mesh(eyeGeo, eyeVisorMaterial);
    leftEye.position.set(-0.46, 0.64, 1.05);
    bearGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeVisorMaterial);
    rightEye.position.set(0.46, 0.64, 1.05);
    bearGroup.add(rightEye);

    // E. 軀幹上半身 (Torso)
    const bodyGeo = new THREE.CylinderGeometry(1.0, 1.35, 1.6, 32);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
    bodyMesh.position.set(0, -0.75, 0);
    bearGroup.add(bodyMesh);

    // F. 靈魂標誌：胸前 3D 立體金黃「V」字領 (3D Golden V-Neck)
    const vGroup = new THREE.Group();

    // 建立 3D V 字左翼與右翼
    const vArmGeo = new THREE.BoxGeometry(0.26, 1.15, 0.18);
    
    // 左 V 臂 (斜向左上)
    const leftVArm = new THREE.Mesh(vArmGeo, goldVMaterial);
    leftVArm.position.set(-0.42, 0.35, 0);
    leftVArm.rotation.z = -0.68;
    vGroup.add(leftVArm);

    // 右 V 臂 (斜向右上)
    const rightVArm = new THREE.Mesh(vArmGeo, goldVMaterial);
    rightVArm.position.set(0.42, 0.35, 0);
    rightVArm.rotation.z = 0.68;
    vGroup.add(rightVArm);

    // V 底尖端光核
    const vTipGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const vTipMesh = new THREE.Mesh(vTipGeo, goldVMaterial);
    vTipMesh.position.set(0, -0.15, 0.04);
    vGroup.add(vTipMesh);

    vGroup.position.set(0, -0.62, 1.18);
    vGroup.rotation.x = 0.18; // 貼合胸部傾角
    bearGroup.add(vGroup);

    // G. 外圍 Omni 量子旋轉光環 (Quantum Orbit Ring)
    const haloGeo = new THREE.TorusGeometry(1.9, 0.04, 16, 100);
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.9,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2.3;
    haloMesh.position.y = -0.1;
    bearGroup.add(haloMesh);

    // H. 量子星塵粒子 (Data Spark Particles)
    const particleCount = 42;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.2 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      particlePositions[i] = radius * Math.cos(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi);
      particlePositions[i + 2] = radius * Math.cos(phi) * Math.sin(theta);
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. 互動與動畫循環
    let reqId: number;
    let clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / height) * 2 - 1);
      mouseX = Math.max(-1, Math.min(1, x));
      mouseY = Math.max(-1, Math.min(1, y));
      targetRotationY = mouseX * 0.45;
      targetRotationX = -mouseY * 0.3;
    };

    if (interactive) {
      container.addEventListener("mousemove", onMouseMove);
    }

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // 1. 浮動呼吸節奏
      bearGroup.position.y = Math.sin(elapsed * 2.2) * 0.08;
      
      // 2. 視角平滑跟隨 (Lerp Smoothing)
      if (spinRef.current > 0) {
        bearGroup.rotation.y += 0.22;
        spinRef.current -= 0.22;
        if (spinRef.current <= 0) {
          spinRef.current = 0;
          setIsSpinning(false);
        }
      } else {
        bearGroup.rotation.y += (targetRotationY - bearGroup.rotation.y) * 0.08;
        bearGroup.rotation.x += (targetRotationX - bearGroup.rotation.x) * 0.08;
      }

      // 3. 量子光環與粒子持續旋轉
      haloMesh.rotation.z = elapsed * 0.8;
      particles.rotation.y = elapsed * 0.15;

      // 4. V 領與金光呼吸微脈動
      goldLight.intensity = 2.2 + Math.sin(elapsed * 3.5) * 0.8;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      if (interactive) {
        container.removeEventListener("mousemove", onMouseMove);
      }
      scene.clear();
      renderer.dispose();
      headGeo.dispose();
      earGeo.dispose();
      bodyGeo.dispose();
      vArmGeo.dispose();
      haloGeo.dispose();
      particleGeo.dispose();
    };
  }, [size, interactive]);

  const handlePokeBear = () => {
    spinRef.current = Math.PI * 2;
    setIsSpinning(true);
    setQuoteIndex((prev) => (prev + 1) % BEAR_QUOTES.length);
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D 畫布容器 */}
      <div
        ref={containerRef}
        onClick={handlePokeBear}
        className="cursor-pointer transition-transform duration-200 active:scale-95 relative"
        style={{ width: size, height: size }}
        title="點擊戳一下 3D 熊霸，讓他旋轉並為你解盤！"
      />

      {/* 互動對話提示氣泡 */}
      {showQuote && (
        <div className="mt-1 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)]/90 border border-amber-500/30 text-primary backdrop-blur-md max-w-[280px] shadow-lg text-center animate-fade-in">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400 mb-0.5">
            <Sparkles size={12} />
            <span>熊霸 V-Bear 3D 量化解密</span>
            {isSpinning && <RotateCcw size={11} className="animate-spin text-accent ml-1" />}
          </div>
          <p className="text-xs text-secondary leading-snug">
            {BEAR_QUOTES[quoteIndex]}
          </p>
          <span className="text-[10px] text-muted block mt-1">
            （點擊熊霸 360° 旋轉切換箴言）
          </span>
        </div>
      )}
    </div>
  );
}
