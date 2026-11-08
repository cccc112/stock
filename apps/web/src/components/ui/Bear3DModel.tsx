"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Sparkles, RotateCcw, Heart, Eye } from "lucide-react";

interface Bear3DModelProps {
  size?: number;
  className?: string;
  interactive?: boolean;
  showQuote?: boolean;
  compact?: boolean;
}

const BEAR_QUOTES = [
  "胸前的純白 V 領，是正宗台灣黑熊的象徵與 Victory 絕地反轉最強訊號！",
  "我是熊霸 V-Bear！右下角也是我，盤中 0 秒哨兵為你守護每一筆交易！",
  "主力洗盤震盪不用慌，看好 20MA 支撐與量價結構！",
  "摸摸我！下單前嚴守交易紀律，嚴設停損，賺大賠小！",
  "全市場 1,900+ 檔即時成交雷達，爆量飆股絕逃不過我的雙眼！",
];

export default function Bear3DModel({
  size = 280,
  className = "",
  interactive = true,
  showQuote = true,
  compact = false,
}: Bear3DModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isHappy, setIsHappy] = useState(false);
  const spinVelocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  const triggerCelebrate = useCallback(() => {
    setIsHappy(true);
    spinVelocityRef.current = Math.PI * 2.2; // 順暢 360 度歡樂轉一圈
    setQuoteIndex((prev) => (prev + 1) % BEAR_QUOTES.length);
    setTimeout(() => setIsHappy(false), 1200);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = size;
    const height = size;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 6.2);

    // 2. WebGL Renderer (極致抗鋸齒與膠片級色調對比)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting (高級手辦影棚級光影系統)
    // 溫和漫射環境光 (柔和提亮暗部)
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 1.8);
    scene.add(ambientLight);

    // 主陽光 (Key Light - 暖白 45 度雕刻立體輪廓)
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    // 側補光 (Fill Light - 柔和天藍消弭死黑)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-4, 2, 4);
    scene.add(fillLight);

    // 輪廓邊界光 (Rim Light - 背後高光，勾勒黑毛立體感)
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // 胸前純白 V 領專屬柔光
    const vChestLight = new THREE.PointLight(0xffffff, 2.0, 5);
    vChestLight.position.set(0, -0.4, 2.2);
    scene.add(vChestLight);

    // 4. 精緻材質庫 (玩具手辦與溫潤毛皮微光感)
    // 黑熊墨夜皮毛材質 (深邃高質感微潤膠感)
    const furMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.38,
      metalness: 0.08,
    });

    // 內耳粉撲材質
    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      roughness: 0.45,
      metalness: 0.04,
    });

    // 象牙白圓潤吻部 (Muzzle)
    const muzzleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05,
    });

    // 水潤黑鼻子與嘴角
    const blackGlossMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.12,
      metalness: 0.3,
    });

    // 靈動大眼睛：眼白 (微透純白)
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.05,
    });

    // 靈動大眼睛：深邃眼眸 (雙層光感)
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      roughness: 0.1,
      metalness: 0.2,
    });

    // 晶瑩瞳孔中心
    const innerPupilMat = new THREE.MeshBasicMaterial({ color: 0x020617 });

    // 眼睛高光點 (璀璨高光星辰)
    const eyeSparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // 臉頰粉紅腮紅
    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      transparent: true,
      opacity: 0.55,
    });

    // ★ 標誌純白月牙大 V 領 (正宗台灣黑熊靈魂胸標，純白微自發光) ★
    const vBadgeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.1,
    });

    // 科技量化耳機鈦合金屬
    const headsetMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.18,
      metalness: 0.88,
    });

    // 科技全息發光光環與天線珠
    const cyberGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.5,
    });

    // 5. 構建超精緻 3D 台灣黑熊手辦 (Designer Toy Proportions)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // --- 地面接觸陰影 (Soft Contact Shadow) ---
    const shadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(2, 6, 23, 0.55)");
      grad.addColorStop(0.5, "rgba(2, 6, 23, 0.2)");
      grad.addColorStop(1, "rgba(2, 6, 23, 0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.72;
    rootGroup.add(shadowMesh);

    const bearMain = new THREE.Group();
    rootGroup.add(bearMain);

    // ==========================================
    // A. 頭部組件 (Head Group)
    // ==========================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.38, 0);
    bearMain.add(headGroup);

    // 1. 圓滾滾飽滿大頭
    const headGeo = new THREE.SphereGeometry(1.22, 48, 48);
    headGeo.scale(1.08, 1.0, 0.98);
    const headMesh = new THREE.Mesh(headGeo, furMat);
    headGroup.add(headMesh);

    // 2. 圓圓萌耳 (左耳與右耳)
    const earGeo = new THREE.SphereGeometry(0.46, 32, 32);
    const innerEarGeo = new THREE.SphereGeometry(0.28, 24, 24);
    innerEarGeo.scale(1, 1, 0.22);

    // 左耳組
    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(-0.95, 0.95, -0.05);
    const leftEar = new THREE.Mesh(earGeo, furMat);
    const leftInnerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    leftInnerEar.position.set(0.02, 0, 0.22);
    leftEarGroup.add(leftEar, leftInnerEar);
    headGroup.add(leftEarGroup);

    // 右耳組
    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(0.95, 0.95, -0.05);
    const rightEar = new THREE.Mesh(earGeo, furMat);
    const rightInnerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    rightInnerEar.position.set(-0.02, 0, 0.22);
    rightEarGroup.add(rightEar, rightInnerEar);
    headGroup.add(rightEarGroup);

    // 3. 科技量化耳機與天線 (Cyber Quant Headset)
    const bandGeo = new THREE.TorusGeometry(1.12, 0.045, 16, 48, Math.PI * 0.76);
    const bandMesh = new THREE.Mesh(bandGeo, headsetMetalMat);
    bandMesh.rotation.z = -Math.PI * 0.88;
    bandMesh.rotation.x = -0.15;
    bandMesh.position.set(0, 0.32, 0);
    headGroup.add(bandMesh);

    // 耳罩兩側金屬銘牌
    const earpadGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24);
    const leftEarpad = new THREE.Mesh(earpadGeo, headsetMetalMat);
    leftEarpad.rotation.z = Math.PI / 2;
    leftEarpad.position.set(-1.18, 0.42, 0);
    const rightEarpad = new THREE.Mesh(earpadGeo, headsetMetalMat);
    rightEarpad.rotation.z = Math.PI / 2;
    rightEarpad.position.set(1.18, 0.42, 0);
    headGroup.add(leftEarpad, rightEarpad);

    // 天線頂端發光感應球
    const tipGeo = new THREE.SphereGeometry(0.12, 20, 20);
    const tipMesh = new THREE.Mesh(tipGeo, cyberGlowMat);
    tipMesh.position.set(0, 1.45, 0);
    headGroup.add(tipMesh);

    // 天線周圍的全息量化微光軌道環
    const haloGeo = new THREE.TorusGeometry(0.24, 0.02, 12, 32);
    const haloMesh = new THREE.Mesh(haloGeo, cyberGlowMat);
    haloMesh.rotation.x = Math.PI / 2.5;
    haloMesh.position.set(0, 1.45, 0);
    headGroup.add(haloMesh);

    // 4. 靈動大眼睛 (雙眼組件，具備眼皮與眨眼能力)
    const eyesGroup = new THREE.Group();
    headGroup.add(eyesGroup);

    const eyeWhiteGeo = new THREE.SphereGeometry(0.24, 24, 24);
    eyeWhiteGeo.scale(1, 1, 0.4);

    const pupilGeo = new THREE.SphereGeometry(0.15, 24, 24);
    pupilGeo.scale(1, 1, 0.45);

    const innerPupilGeo = new THREE.SphereGeometry(0.08, 16, 16);
    innerPupilGeo.scale(1, 1, 0.48);

    const starHighlightGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const miniHighlightGeo = new THREE.SphereGeometry(0.028, 8, 8);

    // 左眼
    const leftEye = new THREE.Group();
    leftEye.position.set(-0.42, 0.14, 1.05);
    const lWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    const lPupil = new THREE.Mesh(pupilGeo, pupilMat);
    lPupil.position.set(0.02, -0.02, 0.08);
    const lCore = new THREE.Mesh(innerPupilGeo, innerPupilMat);
    lCore.position.set(0.02, -0.02, 0.11);
    const lStar = new THREE.Mesh(starHighlightGeo, eyeSparkleMat);
    lStar.position.set(0.05, 0.03, 0.14);
    const lMini = new THREE.Mesh(miniHighlightGeo, eyeSparkleMat);
    lMini.position.set(-0.04, -0.04, 0.13);
    leftEye.add(lWhite, lPupil, lCore, lStar, lMini);
    eyesGroup.add(leftEye);

    // 右眼
    const rightEye = new THREE.Group();
    rightEye.position.set(0.42, 0.14, 1.05);
    const rWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    const rPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rPupil.position.set(-0.02, -0.02, 0.08);
    const rCore = new THREE.Mesh(innerPupilGeo, innerPupilMat);
    rCore.position.set(-0.02, -0.02, 0.11);
    const rStar = new THREE.Mesh(starHighlightGeo, eyeSparkleMat);
    rStar.position.set(0.01, 0.03, 0.14);
    const rMini = new THREE.Mesh(miniHighlightGeo, eyeSparkleMat);
    rMini.position.set(-0.06, -0.04, 0.13);
    rightEye.add(rWhite, rPupil, rCore, rStar, rMini);
    eyesGroup.add(rightEye);

    // 5. 臉部粉紅腮紅
    const blushGeo = new THREE.SphereGeometry(0.18, 16, 16);
    blushGeo.scale(1, 0.7, 0.12);
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.72, -0.16, 0.96);
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.72, -0.16, 0.96);
    headGroup.add(leftBlush, rightBlush);

    // 6. 乳白色凸起圓潤吻部 (Muzzle)
    const muzzleGeo = new THREE.SphereGeometry(0.58, 32, 32);
    muzzleGeo.scale(1.18, 0.75, 0.72);
    const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzleMesh.position.set(0, -0.14, 0.96);
    headGroup.add(muzzleMesh);

    // 7. 黑鼻子與微笑小嘴
    const noseGeo = new THREE.SphereGeometry(0.13, 20, 20);
    noseGeo.scale(1.25, 0.85, 0.95);
    const noseMesh = new THREE.Mesh(noseGeo, blackGlossMat);
    noseMesh.position.set(0, 0.04, 1.37);
    headGroup.add(noseMesh);

    const mouthGeo = new THREE.TorusGeometry(0.13, 0.024, 12, 28, Math.PI);
    const mouthMesh = new THREE.Mesh(mouthGeo, blackGlossMat);
    mouthMesh.rotation.z = Math.PI;
    mouthMesh.position.set(0, -0.16, 1.34);
    headGroup.add(mouthMesh);

    // ==========================================
    // B. 身軀與四肢組件 (Body & Limbs Group)
    // ==========================================
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.78, 0);
    bearMain.add(bodyGroup);

    // 1. 胖嘟嘟圓潤身軀
    const bodyGeo = new THREE.SphereGeometry(1.15, 40, 40);
    bodyGeo.scale(1.02, 1.08, 0.96);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMat);
    bodyMesh.position.set(0, -0.25, 0);
    bodyGroup.add(bodyMesh);

    // 2. 短萌小熊手臂 (Paws)
    const armGeo = new THREE.CapsuleGeometry(0.26, 0.52, 16, 24);

    // 左手臂
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.95, -0.32, 0.28);
    const leftArm = new THREE.Mesh(armGeo, furMat);
    leftArm.rotation.z = 0.55;
    leftArm.rotation.x = -0.35;
    leftArmGroup.add(leftArm);
    bodyGroup.add(leftArmGroup);

    // 右手臂 (揮手招手微動)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.95, -0.32, 0.28);
    const rightArm = new THREE.Mesh(armGeo, furMat);
    rightArm.rotation.z = -0.55;
    rightArm.rotation.x = -0.35;
    rightArmGroup.add(rightArm);
    bodyGroup.add(rightArmGroup);

    // 3. 穩固呆萌坐姿小短腿 (Feet with Paw Pads)
    const legGeo = new THREE.CapsuleGeometry(0.32, 0.45, 16, 24);
    const pawPadGeo = new THREE.SphereGeometry(0.12, 16, 16);
    pawPadGeo.scale(1, 1.15, 0.2);

    // 左腳
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.65, -1.05, 0.45);
    const lLegMesh = new THREE.Mesh(legGeo, furMat);
    lLegMesh.rotation.x = Math.PI / 2.3;
    const lPad = new THREE.Mesh(pawPadGeo, innerEarMat);
    lPad.position.set(0, -0.05, 0.36);
    leftLeg.add(lLegMesh, lPad);
    bodyGroup.add(leftLeg);

    // 右腳
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.65, -1.05, 0.45);
    const rLegMesh = new THREE.Mesh(legGeo, furMat);
    rLegMesh.rotation.x = Math.PI / 2.3;
    const rPad = new THREE.Mesh(pawPadGeo, innerEarMat);
    rPad.position.set(0, -0.05, 0.36);
    rightLeg.add(rLegMesh, rPad);
    bodyGroup.add(rightLeg);

    // 4. 背後小圓尾巴
    const tailGeo = new THREE.SphereGeometry(0.22, 20, 20);
    const tailMesh = new THREE.Mesh(tailGeo, furMat);
    tailMesh.position.set(0, -0.65, -0.98);
    bodyGroup.add(tailMesh);

    // ==========================================
    // C. ★ 純白正宗弧形月牙「V」領胸標 (Iconic Taiwan Bear V-Neck) ★
    // ==========================================
    // 使用 ExtrudeGeometry 與平滑 Shape 打造有機貼合胸口的月牙 V 字型，絕非硬梆梆的方管
    const vShape = new THREE.Shape();
    // 繪製順滑月牙 V 字路徑
    vShape.moveTo(0, -0.36);
    vShape.bezierCurveTo(-0.15, -0.28, -0.52, 0.05, -0.68, 0.45);
    vShape.bezierCurveTo(-0.62, 0.50, -0.48, 0.48, -0.42, 0.35);
    vShape.bezierCurveTo(-0.30, 0.05, -0.10, -0.16, 0, -0.18);
    vShape.bezierCurveTo(0.10, -0.16, 0.30, 0.05, 0.42, 0.35);
    vShape.bezierCurveTo(0.48, 0.48, 0.62, 0.50, 0.68, 0.45);
    vShape.bezierCurveTo(0.52, 0.05, 0.15, -0.28, 0, -0.36);

    const vExtrudeSettings = {
      steps: 2,
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 4,
    };
    const vGeo = new THREE.ExtrudeGeometry(vShape, vExtrudeSettings);
    const vMesh = new THREE.Mesh(vGeo, vBadgeMat);
    vMesh.scale.set(1.15, 1.15, 1.0);
    vMesh.position.set(0, -0.18, 0.98);
    vMesh.rotation.x = -0.18;
    bodyGroup.add(vMesh);

    // ==========================================
    // 6. 動畫循環與互動邏輯
    // ==========================================
    let reqId: number;
    const clock = new THREE.Clock();
    let targetRotationX = 0;
    let targetRotationY = 0;
    let blinkTimer = 0;
    let isBlinking = false;

    // 滑鼠游標平滑追蹤
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / height) * 2 - 1);
      targetRotationY = Math.max(-0.6, Math.min(0.6, x * 0.55));
      targetRotationX = Math.max(-0.35, Math.min(0.35, -y * 0.35));
    };

    // 支援滑鼠 360 度任意拖曳旋轉手辦 (Orbit Drag)
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseDrag = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      bearMain.rotation.y += deltaX * 0.015;
      bearMain.rotation.x = Math.max(-0.4, Math.min(0.4, bearMain.rotation.x + deltaY * 0.01));
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    // 觸控拖曳支援 (Mobile Touch)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;
      bearMain.rotation.y += deltaX * 0.02;
      bearMain.rotation.x = Math.max(-0.4, Math.min(0.4, bearMain.rotation.x + deltaY * 0.01));
      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    if (interactive) {
      container.addEventListener("mousemove", onMouseMove);
      container.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseDrag);
      window.addEventListener("mouseup", onMouseUp);
      container.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onMouseUp);
    }

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // 1. 浮動呼吸微起伏 (Organic breathing & bobbing)
      const breath = Math.sin(elapsed * 2.2);
      bearMain.position.y = breath * 0.07;
      bodyMesh.scale.set(1.02 + breath * 0.015, 1.08 + breath * 0.01, 0.96);

      // 2. 視角跟隨 / 歡樂旋轉 (Lerp Tracking & Celebration Spin)
      if (spinVelocityRef.current > 0.01) {
        bearMain.rotation.y += spinVelocityRef.current * 0.12;
        spinVelocityRef.current *= 0.93; // 柔順減速阻尼
      } else if (!isDraggingRef.current) {
        bearMain.rotation.y += (targetRotationY - bearMain.rotation.y) * 0.07;
        bearMain.rotation.x += (targetRotationX - bearMain.rotation.x) * 0.07;
      }

      // 3. 有機 3D 眨眼循環 (Every ~3.8 seconds)
      blinkTimer += 0.016;
      if (blinkTimer > 3.6) {
        isBlinking = true;
        eyesGroup.scale.y = 0.15; // 閉眼
        if (blinkTimer > 3.75) {
          eyesGroup.scale.y = 1.0; // 睜開
          isBlinking = false;
          blinkTimer = 0;
        }
      }

      // 4. 耳朵呆萌微律動 (Cute Ear Wiggle)
      leftEarGroup.rotation.z = Math.sin(elapsed * 3.5) * 0.05;
      rightEarGroup.rotation.z = -Math.sin(elapsed * 3.5) * 0.05;

      // 5. 右手招手動作 (Gentle paw waving)
      rightArmGroup.rotation.x = -0.35 + Math.sin(elapsed * 4.0) * 0.15;

      // 6. 全息光環旋轉與呼吸微脈衝
      haloMesh.rotation.z = elapsed * 1.5;
      tipMesh.scale.setScalar(1.0 + Math.sin(elapsed * 4.5) * 0.14);
      vChestLight.intensity = 2.0 + Math.sin(elapsed * 3.0) * 0.4;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      if (interactive) {
        container.removeEventListener("mousemove", onMouseMove);
        container.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseDrag);
        window.removeEventListener("mouseup", onMouseUp);
        container.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onMouseUp);
      }
      scene.clear();
      renderer.dispose();
    };
  }, [size, interactive]);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D WebGL Canvas 容器 */}
      <div
        ref={containerRef}
        onClick={triggerCelebrate}
        style={{ width: size, height: size }}
        className="cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] active:scale-95 drop-shadow-2xl relative"
        title="可按住滑鼠或觸控 360 度旋轉熊霸；點擊一下有歡樂驚喜！"
      />

      {/* 3D 互動小提示標籤 */}
      {interactive && !compact && (
        <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-muted bg-[var(--bg-tertiary)]/70 px-3 py-1 rounded-full border border-[var(--border)]">
          <Eye size={12} className="text-accent animate-pulse" />
          <span>按住可 360° 拖曳旋轉 · 點擊戳戳有驚喜</span>
          <button
            onClick={triggerCelebrate}
            className="text-amber-400 hover:text-amber-300 ml-1 transition-transform active:scale-90"
            title="歡樂轉圈"
          >
            <RotateCcw size={12} className={isHappy ? "animate-spin" : ""} />
          </button>
        </div>
      )}

      {/* 熊霸說話氣泡 */}
      {showQuote && !compact && (
        <div
          onClick={triggerCelebrate}
          className="mt-2.5 max-w-[260px] p-2.5 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-xs text-secondary text-center shadow-lg backdrop-blur-md cursor-pointer hover:border-amber-400/50 transition-all group"
        >
          <div className="flex items-center justify-center gap-1 font-bold text-primary text-[11px] mb-0.5">
            <Sparkles size={12} className="text-amber-400" />
            <span>熊霸 V-Bear 碎碎念</span>
            <Heart size={11} className="text-rose-500 group-hover:scale-125 transition-transform" />
          </div>
          <p className="leading-relaxed line-clamp-2">{BEAR_QUOTES[quoteIndex]}</p>
        </div>
      )}
    </div>
  );
}
