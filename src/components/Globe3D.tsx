import { useEffect, useRef } from "react";
import * as THREE from "three";
import { latLngToVector3, easeInOutCubic } from "../lib/geo";
import type { Incident } from "../lib/incidents";

interface GlobeProps {
  incidents: Incident[];
  onSelect: (id: string) => void;
  flyToToken: { id: string; nonce: number } | null;
  resetToken?: number | null;
  focusedId?: string | null;
  layerRoutes?: { from: { lat: number; lng: number }; to: { lat: number; lng: number }; active: boolean }[];
  layerResources?: { lat: number; lng: number; name: string }[];
}

const GLOBE_RADIUS = 2;

const NIGHT_TEXTURE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/b/b3/Solarsystemscope_texture_8k_earth_nightmap.jpg";

export default function Globe3D({
  incidents,
  onSelect,
  flyToToken,
  resetToken = null,
  focusedId = null,
  layerRoutes = [],
  layerResources = [],
}: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    globe?: THREE.Mesh;
    markersGroup?: THREE.Group;
    routesGroup?: THREE.Group;
    resourcesGroup?: THREE.Group;
    raycaster?: THREE.Raycaster;
    pointer?: THREE.Vector2;
    targetRotation?: THREE.Vector2;
    rotationVelocity?: THREE.Vector2;
    isDragging?: boolean;
    cameraAnim?: { from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number } | null;
    autoRotate?: boolean;
  }>({});

  // Setup scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Lights — dim ambient so the night texture's emissive city lights show
    scene.add(new THREE.AmbientLight(0x335577, 0.6));
    const dir = new THREE.DirectionalLight(0x6699cc, 0.5);
    dir.position.set(5, 3, 5);
    scene.add(dir);

    // Globe — real NASA night-earth texture
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    const textureLoader = new THREE.TextureLoader();
    const nightTexture = textureLoader.load(
      NIGHT_TEXTURE_URL,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      },
    );
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    const globeMat = new THREE.MeshPhongMaterial({
      map: nightTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: nightTexture,
      emissiveIntensity: 1.0,
      shininess: 5,
      specular: new THREE.Color(0x111111),
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Atmosphere glow — soft cyan/teal rim
    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.12, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(0.1, 0.6, 0.8, 1.0) * intensity;
        }
      `,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmo);

    // Markers group (added to globe so they rotate with it)
    const markersGroup = new THREE.Group();
    globe.add(markersGroup);

    const routesGroup = new THREE.Group();
    globe.add(routesGroup);

    const resourcesGroup = new THREE.Group();
    globe.add(resourcesGroup);

    // Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const targetRotation = new THREE.Vector2(0, 0);
    const rotationVelocity = new THREE.Vector2(0, 0);
    let isDragging = false;
    let lastPointer = { x: 0, y: 0 };
    let autoRotate = true;
    let cameraAnim: { from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      autoRotate = false;
      lastPointer = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (isDragging) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        rotationVelocity.x = dx * 0.005;
        rotationVelocity.y = dy * 0.005;
        targetRotation.x += dx * 0.005;
        targetRotation.y += dy * 0.005;
        lastPointer = { x: e.clientX, y: e.clientY };
      }
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const z = camera.position.z + e.deltaY * 0.005;
      camera.position.z = Math.max(3, Math.min(10, z));
    };
    const onClick = (e: MouseEvent) => {
      if (Math.abs(rotationVelocity.x) > 0.001 || Math.abs(rotationVelocity.y) > 0.001) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(markersGroup.children, true);
      if (hits.length > 0) {
        const obj = hits[0].object;
        const id = obj.userData.incidentId;
        if (id) onSelect(id);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (autoRotate && !isDragging) {
        targetRotation.x += 0.0015;
      }
      // ease rotation toward target
      globe.rotation.y += (targetRotation.x - globe.rotation.y) * 0.1;
      globe.rotation.x += (targetRotation.y - globe.rotation.x) * 0.1;
      // apply inertia
      if (!isDragging) {
        targetRotation.x += rotationVelocity.x;
        targetRotation.y += rotationVelocity.y;
        rotationVelocity.x *= 0.92;
        rotationVelocity.y *= 0.92;
      }

      // camera fly-to animation
      if (cameraAnim) {
        const p = Math.min(1, (performance.now() - cameraAnim.start) / cameraAnim.duration);
        const e = easeInOutCubic(p);
        camera.position.lerpVectors(cameraAnim.from, cameraAnim.to, e);
        if (p >= 1) cameraAnim = null;
      }

      // Update marker visibility (hide far-side) + pulse + focus dim
      const focusedIdNow: string | null = (stateRef.current as any)._focusedId ?? null;
      markersGroup.children.forEach((m) => {
        const worldPos = new THREE.Vector3();
        m.getWorldPosition(worldPos);
        const camDir = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(0,0,0)).normalize();
        const markerDir = worldPos.clone().normalize();
        const dot = markerDir.dot(camDir);
        const behindGlobe = dot < -0.1;
        (m as THREE.Mesh).visible = !behindGlobe;
        const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
        const isGlow = m.userData.isGlow as boolean | undefined;
        const isFocused = focusedIdNow === null || m.userData.incidentId === focusedIdNow;
        const dimFactor = isFocused ? 1.0 : 0.25;
        const scaleFactor = isFocused ? 1.0 : 0.6;
        m.scale.setScalar(scaleFactor);
        if (isGlow) {
          mat.opacity = isFocused ? (0.2 + Math.sin(t * 3) * 0.08) : 0.06;
        } else if (m.userData.severity === "CRITICAL") {
          mat.opacity = dimFactor * (0.7 + Math.sin(t * 4) * 0.3);
        } else if (m.userData.severity === "HIGH") {
          mat.opacity = dimFactor * (0.7 + Math.sin(t * 3) * 0.25);
        } else {
          mat.opacity = dimFactor * (0.75 + Math.sin(t * 2) * 0.2);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    stateRef.current = {
      scene,
      camera,
      renderer,
      globe,
      markersGroup,
      routesGroup,
      resourcesGroup,
      raycaster,
      pointer,
      targetRotation,
      rotationVelocity,
      isDragging: false,
      cameraAnim: null,
      autoRotate: true,
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("click", onClick);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync focusedId into stateRef for use inside the animation loop
  useEffect(() => {
    (stateRef.current as any)._focusedId = focusedId;
  }, [focusedId]);

  // Update markers when incidents change — solid dots with glow, no rings
  useEffect(() => {
    const { markersGroup } = stateRef.current;
    if (!markersGroup) return;
    // clear
    while (markersGroup.children.length > 0) {
      const c = markersGroup.children[0];
      markersGroup.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    incidents.forEach((inc) => {
      const pos = latLngToVector3(inc.lat, inc.lng, GLOBE_RADIUS * 1.01);
      const color =
        inc.severity === "CRITICAL" ? 0xef4444 : inc.severity === "HIGH" ? 0xf59e0b : 0x22d3ee;

      // Solid dot marker
      const dotGeo = new THREE.SphereGeometry(0.035, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.userData.incidentId = inc.id;
      dot.userData.severity = inc.severity;
      markersGroup.add(dot);

      // Soft glow halo (larger, semi-transparent, same color)
      const glowGeo = new THREE.SphereGeometry(0.07, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      glow.userData.incidentId = inc.id;
      glow.userData.severity = inc.severity;
      glow.userData.isGlow = true;
      markersGroup.add(glow);
    });
  }, [incidents]);

  // Update layer routes
  useEffect(() => {
    const { routesGroup, resourcesGroup } = stateRef.current;
    if (!routesGroup || !resourcesGroup) return;
    while (routesGroup.children.length > 0) {
      const c = routesGroup.children[0];
      routesGroup.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    while (resourcesGroup.children.length > 0) {
      const c = resourcesGroup.children[0];
      resourcesGroup.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    layerRoutes.forEach((r) => {
      const a = latLngToVector3(r.from.lat, r.from.lng, GLOBE_RADIUS * 1.02);
      const b = latLngToVector3(r.to.lat, r.to.lng, GLOBE_RADIUS * 1.02);
      // arc
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dist = a.distanceTo(b);
      mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.02 + dist * 0.3);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const points = curve.getPoints(40);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: r.active ? 0x22d3ee : 0x475569,
        transparent: true,
        opacity: r.active ? 0.85 : 0.35,
      });
      const line = new THREE.Line(geo, mat);
      routesGroup.add(line);
      if (!r.active) {
        // dotted effect via dashed line
        const dashed = new THREE.LineDashedMaterial({
          color: 0x475569,
          dashSize: 0.08,
          gapSize: 0.06,
          transparent: true,
          opacity: 0.4,
        });
        line.material = dashed;
        line.computeLineDistances();
      }
    });
    layerResources.forEach((res) => {
      const pos = latLngToVector3(res.lat, res.lng, GLOBE_RADIUS * 1.02);
      const geo = new THREE.SphereGeometry(0.035, 10, 10);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      resourcesGroup.add(m);
    });
  }, [layerRoutes, layerResources]);

  // Fly-to animation
  useEffect(() => {
    if (!flyToToken) return;
    const inc = incidents.find((i) => i.id === flyToToken.id);
    if (!inc) return;
    const { camera, globe } = stateRef.current;
    if (!camera || !globe) return;
    const desiredY = -((inc.lng + 180) * Math.PI) / 180 + Math.PI / 2;
    const desiredX = (inc.lat * Math.PI) / 180;
    const tr = stateRef.current.targetRotation!;
    tr.x = desiredY;
    tr.y = -desiredX;
    const from = camera.position.clone();
    const to = new THREE.Vector3(0, 0, 4.0);
    stateRef.current.cameraAnim = { from, to, start: performance.now(), duration: 1800 };
    stateRef.current.autoRotate = false;
  }, [flyToToken, incidents]);

  // Reset camera to global view
  useEffect(() => {
    if (resetToken == null) return;
    const { camera } = stateRef.current;
    if (!camera) return;
    const from = camera.position.clone();
    const to = new THREE.Vector3(0, 0, 6);
    stateRef.current.cameraAnim = { from, to, start: performance.now(), duration: 1600 };
    stateRef.current.autoRotate = true;
  }, [resetToken]);

  return <div ref={mountRef} className="w-full h-full" />;
}
