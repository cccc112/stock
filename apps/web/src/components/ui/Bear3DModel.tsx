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
  "胸前正宗台灣黑熊金黃 V 領，就是 VCP 突破與絕地反轉的最強訊號！",
  "我是熊霸 V-Bear！右下角也是我，盤中 0 秒哨兵隨時守護你的交易！",
  "主力洗盤震盪不用慌，看好 20MA 支撐與量價結構！",
  "摸摸我！下單前嚴守交易紀律，停損第一，賺大賠小！",
  "台股 1,900+ 檔即時成交雷達，爆量飆股絕逃不過我的雙眼！",
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
    camera.position.set(0, 0, 6.8);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Lighting
    // 環境柔光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // 主方向光 (照亮五官立體感)
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(3.5, 4.5, 5);
    scene.add(dirLight);

    // 金黃 V 領專屬反射光 (微暖金芒)
    const goldLight = new THREE.PointLight(0xf59e0b, 2.8, 8);
    goldLight.position.set(0, -0.6, 2.5);
    scene.add(goldLight);

    // 科技天藍輪廓光 (Rim Light，呼應全站夜空天藍調)
    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.8);
    cyanRim.position.set(-4, 3, -2);
    scene.add(cyanRim);

    // 4. Materials (嚴格依照右下角台灣黑熊設定)
    // 墨夜黑毛皮材質 (深黑溫潤微絨感)
    const furMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.65,
      metalness: 0.1,
    });

    // 內耳粉嫩材質 (與右下角 #fda4af 一模一樣)
    const innerEarMaterial = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      roughness: 0.5,
      metalness: 0.05,
    });

    // 靈動大眼睛：眼白材質 (純白溫潤)
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.05,
    });

    // 靈動大眼睛：黑色大眼珠材質 (深邃高光)
    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.15,
      metalness: 0.15,
    });

    // 眼睛白色晶亮高光點 (與右下角高光圓點一致)
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // 圓滾滾粉紅腮紅材質 (與右下角 #f43f5e 一致)
    const blushMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      transparent: true,
      opacity: 0.48,
    });

    // 乳白色凸出吻部 (與右下角 #f1f5f9 一致)
    const muzzleMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.55,
      metalness: 0.05,
    });

    // 黑色倒三角鼻子與嘴角材質
    const darkFeatureMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.15,
    });

    // 頭頂天線材質 (天藍發光)
    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const antennaTipMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });

    // ★ 核心靈魂標誌：胸前巨大白色/金黃「V」字胸標 (勝利 Victory & VCP 突破) ★
    const vNeckMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0.5,
      roughness: 0.22,
      metalness: 0.65,
    });

    // 5. 構建台灣黑熊 3D 結構
    const bearGroup = new THREE.Group();
    scene.add(bearGroup);

    // --- A. 頭部組件 (Head Group) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.45, 0);
    bearGroup.add(headGroup);

    // 頭部主體 (圓潤飽滿黑熊大頭)
    const headGeo = new THREE.SphereGeometry(1.22, 36, 36);
    headGeo.scale(1.05, 0.98, 0.95);
    const headMesh = new THREE.Mesh(headGeo, furMaterial);
    headGroup.add(headMesh);

    // 雙耳 (圓圓大外耳 + 粉嫩內耳)
    const earGeo = new THREE.SphereGeometry(0.44, 24, 24);
    const innerEarGeo = new THREE.SphereGeometry(0.26, 20, 20);
    innerEarGeo.scale(1, 1, 0.25);

    // 左耳
    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.position.set(-0.96, 0.95, -0.05);
    headGroup.add(leftEar);

    const leftInnerEar = new THREE.Mesh(innerEarGeo, innerEarMaterial);
    leftInnerEar.position.set(-0.94, 0.95, 0.22);
    headGroup.add(leftInnerEar);

    // 右耳
    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.position.set(0.96, 0.95, -0.05);
    headGroup.add(rightEar);

    const rightInnerEar = new THREE.Mesh(innerEarGeo, innerEarMaterial);
    rightInnerEar.position.set(0.94, 0.95, 0.22);
    headGroup.add(rightInnerEar);

    // 科技耳機天線 (量化雷達感應器 - 橫跨頭頂的弧環與感應珠)
    const antennaGeo = new THREE.TorusGeometry(1.04, 0.038, 16, 48, Math.PI * 0.72);
    const antennaMesh = new THREE.Mesh(antennaGeo, antennaMaterial);
    antennaMesh.rotation.z = -Math.PI * 0.86;
    antennaMesh.rotation.x = -0.12;
    antennaMesh.position.set(0, 0.32, 0);
    headGroup.add(antennaMesh);

    const tipGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const tipMesh = new THREE.Mesh(tipGeo, antennaTipMaterial);
    tipMesh.position.set(0, 1.38, 0);
    headGroup.add(tipMesh);

    // 靈動大眼睛 (右下角同款：大白眼球 + 黑色瞳孔 + 純白高光)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.22, 24, 24);
    eyeWhiteGeo.scale(1, 1, 0.35);

    const pupilGeo = new THREE.SphereGeometry(0.13, 20, 20);
    pupilGeo.scale(1, 1, 0.4);

    const highlightGeo = new THREE.SphereGeometry(0.055, 12, 12);

    // 左眼
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMaterial);
    leftEyeWhite.position.set(-0.42, 0.14, 1.05);
    headGroup.add(leftEyeWhite);

    const leftPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    leftPupil.position.set(-0.40, 0.12, 1.13);
    headGroup.add(leftPupil);

    const leftHighlight = new THREE.Mesh(highlightGeo, highlightMaterial);
    leftHighlight.position.set(-0.37, 0.16, 1.18);
    headGroup.add(leftHighlight);

    // 右眼
    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMaterial);
    rightEyeWhite.position.set(0.42, 0.14, 1.05);
    headGroup.add(rightEyeWhite);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    rightPupil.position.set(0.44, 0.12, 1.13);
    headGroup.add(rightPupil);

    const rightHighlight = new THREE.Mesh(highlightGeo, highlightMaterial);
    rightHighlight.position.set(0.47, 0.16, 1.18);
    headGroup.add(rightHighlight);

    // 圓滾滾粉紅腮紅 (兩頰可愛紅暈)
    const blushGeo = new THREE.SphereGeometry(0.18, 16, 16);
    blushGeo.scale(1, 0.8, 0.15);

    const leftBlush = new THREE.Mesh(blushGeo, blushMaterial);
    leftBlush.position.set(-0.70, -0.16, 0.95);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMaterial);
    rightBlush.position.set(0.70, -0.16, 0.95);
    headGroup.add(rightBlush);

    // 乳白色凸出吻部 (Muzzle)
    const muzzleGeo = new THREE.SphereGeometry(0.54, 28, 28);
    muzzleGeo.scale(1.18, 0.78, 0.7);
    const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMaterial);
    muzzleMesh.position.set(0, -0.14, 0.96);
    headGroup.add(muzzleMesh);

    // 倒三角形小黑鼻
    const noseGeo = new THREE.CylinderGeometry(0.04, 0.14, 0.14, 16);
    noseGeo.scale(1.3, 0.8, 0.8);
    const noseMesh = new THREE.Mesh(noseGeo, darkFeatureMaterial);
    noseMesh.rotation.x = Math.PI / 2.2;
    noseMesh.position.set(0, 0.02, 1.34);
    headGroup.add(noseMesh);

    // 微笑嘴角
    const mouthGeo = new THREE.TorusGeometry(0.11, 0.022, 12, 24, Math.PI);
    const mouthMesh = new THREE.Mesh(mouthGeo, darkFeatureMaterial);
    mouthMesh.rotation.z = Math.PI;
    mouthMesh.position.set(0, -0.18, 1.32);
    headGroup.add(mouthMesh);

    // --- B. 圓滾滾身軀 (Body Group) ---
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.85, 0);
    bearGroup.add(bodyGroup);

    // 憨厚圓滾滾身軀
    const bodyGeo = new THREE.SphereGeometry(1.26, 32, 32);
    bodyGeo.scale(1.02, 1.12, 0.95);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
    bodyMesh.position.set(0, -0.35, 0);
    bodyGroup.add(bodyMesh);

    // 圓圓小熊手 (Paws)
    const pawGeo = new THREE.SphereGeometry(0.36, 20, 20);
    pawGeo.scale(0.85, 1.1, 0.9);

    const leftPaw = new THREE.Mesh(pawGeo, furMaterial);
    leftPaw.position.set(-1.08, -0.45, 0.35);
    leftPaw.rotation.z = 0.4;
    bodyGroup.add(leftPaw);

    const rightPaw = new THREE.Mesh(pawGeo, furMaterial);
    rightPaw.position.set(1.08, -0.45, 0.35);
    rightPaw.rotation.z = -0.4;
    bodyGroup.add(rightPaw);

    // --- C. ★ 靈魂亮點：胸前立體大「V」字胸標 ★ ---
    const vGroup = new THREE.Group();
    const vArmGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.12, 20);

    // 左 V 臂
    const leftVArm = new THREE.Mesh(vArmGeo, vNeckMaterial);
    leftVArm.position.set(-0.40, 0.18, 0);
    leftVArm.rotation.z = -0.66;
    vGroup.add(leftVArm);

    // 右 V 臂
    const rightVArm = new THREE.Mesh(vArmGeo, vNeckMaterial);
    rightVArm.position.set(0.40, 0.18, 0);
    rightVArm.rotation.z = 0.66;
    vGroup.add(rightVArm);

    // V 尖端球體銜接
    const vTipGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const vTipMesh = new THREE.Mesh(vTipGeo, vNeckMaterial);
    vTipMesh.position.set(0, -0.28, 0.02);
    vGroup.add(vTipMesh);

    // V 頂端左右兩顆圓角封頭
    const vCapLeft = new THREE.Mesh(vTipGeo, vNeckMaterial);
    vCapLeft.position.set(-0.73, 0.62, -0.02);
    vGroup.add(vCapLeft);

    const vCapRight = new THREE.Mesh(vTipGeo, vNeckMaterial);
    vCapRight.position.set(0.73, 0.62, -0.02);
    vGroup.add(vCapRight);

    // 貼合圓滾滾胸膛
    vGroup.position.set(0, -0.38, 1.02);
    vGroup.rotation.x = 0.22;
    bodyGroup.add(vGroup);

    // --- D. 科技守護量子光環 (Quantum Halo) ---
    const haloGeo = new THREE.TorusGeometry(1.85, 0.03, 16, 80);
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2.3;
    haloMesh.position.y = -0.3;
    bearGroup.add(haloMesh);

    // 粒子微塵 (Data Spark Particles)
    const particleCount = 36;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.1 + Math.random() * 1.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      particlePositions[i] = radius * Math.cos(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi);
      particlePositions[i + 2] = radius * Math.cos(phi) * Math.sin(theta);
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.07,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. 互動與動畫循環
    let reqId: number;
    const clock = new THREE.Clock();
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
      targetRotationY = mouseX * 0.42;
      targetRotationX = -mouseY * 0.25;
    };

    if (interactive) {
      container.addEventListener("mousemove", onMouseMove);
    }

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // 1. 浮動呼吸微起伏
      bearGroup.position.y = Math.sin(elapsed * 2.2) * 0.08;

      // 2. 視角平滑跟隨 (Lerp) / 點擊 360° 歡快翻轉
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

      // 3. 頭頂雷達感應珠呼吸微脈動
      tipMesh.scale.setScalar(1 + Math.sin(elapsed * 4.0) * 0.12);

      // 4. 光環與星塵粒子微旋轉
      haloMesh.rotation.z = elapsed * 0.6;
      particles.rotation.y = elapsed * 0.12;

      // 5. V 領專屬反射金光脈動
      goldLight.intensity = 2.4 + Math.sin(elapsed * 3.2) * 0.8;

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
      innerEarGeo.dispose();
      antennaGeo.dispose();
      tipGeo.dispose();
      eyeWhiteGeo.dispose();
      pupilGeo.dispose();
      highlightGeo.dispose();
      blushGeo.dispose();
      muzzleGeo.dispose();
      noseGeo.dispose();
      mouthGeo.dispose();
      bodyGeo.dispose();
      pawGeo.dispose();
      vArmGeo.dispose();
      vTipGeo.dispose();
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
        title="點擊戳一下正宗台灣黑熊 3D 熊霸，讓他旋轉為你解盤！"
      />

      {/* 互動對話提示氣泡 */}
      {showQuote && (
        <div className="mt-1 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)]/90 border border-amber-500/30 text-primary backdrop-blur-md max-w-[280px] shadow-lg text-center animate-fade-in">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400 mb-0.5">
            <Sparkles size={12} />
            <span>台灣黑熊 熊霸 3D 量化解密</span>
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
