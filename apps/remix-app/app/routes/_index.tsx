import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Three.js model loader setup. Place your .glb model in the public folder
 * and update the MODEL_PATH below to load it.
 */

export function meta() {
  return [
    { title: "Three.js Model Loader" },
    {
      name: "description",
      content: "A Three.js scene that can load custom 3D models.",
    },
  ];
}

// Path to your models in the public folder
const MODELS = [
  { name: "Porsche 911", path: "/models/model.glb" },
  { name: "Nissan Skyline R34", path: "/models/model1.glb" },
  { name: "Honda NSX (1990)", path: "/models/modal2.glb" },
] as const;

export default function Index() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [selectedSpecIndex, setSelectedSpecIndex] = useState(0);
  const [modelIndex, setModelIndex] = useState(0);
  const modelOffsetsRef = useRef<number[]>([]);
  const modelInfoRef = useRef<{ radius: number; midY: number }[]>([]);
  const camTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const lookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const currentLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const topZoomRef = useRef<number[]>([]);
  const topViewRef = useRef<{ y: number; z: number }>({ y: 0, z: 0 });
  const topLookYRef = useRef<number>(0);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewsRef = useRef<
    { name: string; pos: THREE.Vector3; look: THREE.Vector3 }[]
  >([]);
  const goToIndex = (i: number) => {
    const views = viewsRef.current;
    if (!views || views.length === 0) return;
    const next = ((i % views.length) + views.length) % views.length;
    setViewIndex(next);

    const info = (modelInfoRef.current && modelInfoRef.current[modelIndex]) || {
      radius: 2,
      midY: 1,
    };
    const offX =
      (modelOffsetsRef.current && modelOffsetsRef.current[modelIndex]) || 0;

    const name = ["Top", "Front", "Right side", "Back", "Left side"][next];
    const r = info.radius;
    const midY = info.midY;
    let pos = new THREE.Vector3();
    switch (name) {
      case "Top":
        const zoom = topZoomRef.current[modelIndex] ?? 1;
        pos.set(0, topViewRef.current.y * zoom, topViewRef.current.z * zoom);
        break;
      case "Front":
        const frontZoom = topZoomRef.current[modelIndex] ?? 1;
        pos.set(0, r * 0.5, r * 1.2 * frontZoom);
        break;
      case "Right side":
        const rightZoom = topZoomRef.current[modelIndex] ?? 1;
        pos.set(r * 1.2 * rightZoom, r * 0.5, 0);
        break;
      case "Back":
        const backZoom = topZoomRef.current[modelIndex] ?? 1;
        pos.set(0, r * 0.5, -r * 1.2 * backZoom);
        break;
      case "Left side":
        const leftZoom = topZoomRef.current[modelIndex] ?? 1;
        pos.set(-r * 1.2 * leftZoom, r * 0.5, 0);
        break;
    }
    pos.x += offX;

    camTargetRef.current.set(pos.x, pos.y, pos.z);
    const lookY = name === "Top" ? topLookYRef.current : midY;
    lookTargetRef.current.set(offX, lookY, 0);
  };
  const goNext = () => goToIndex(viewIndex + 1);
  const goPrev = () => goToIndex(viewIndex - 1);

  useEffect(() => {
    let mounted = true;
    let animationId = 0;

    // Three.js objects (definite assignment assertions for init lifecycle)
    let renderer!: THREE.WebGLRenderer;
    let scene!: THREE.Scene;
    let camera!: THREE.PerspectiveCamera;
    let models: THREE.Object3D[] = [];
    let ambientLight!: THREE.AmbientLight;
    let directionalLight!: THREE.DirectionalLight;
    let fillLight!: THREE.DirectionalLight;
    /* ground removed */

    const cleanup = () => {
      cancelAnimationFrame(animationId);
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      try {
        window.removeEventListener("resize", handleResize);
      } catch {}
      try {
        // Cleanup model
        if (models && models.length) {
          for (const obj of models) {
            try {
              scene.remove(obj);
              obj.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                  child.geometry?.dispose();
                  const mats = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                  mats.forEach((mat: any) => mat?.dispose?.());
                }
              });
            } catch {}
          }
          models = [];
        }

        renderer?.dispose?.();
        if (
          renderer?.domElement &&
          containerRef.current?.contains(renderer.domElement)
        ) {
          containerRef.current?.removeChild(renderer.domElement);
        }
      } catch {}
    };

    const handleResize = () => {
      if (!renderer || !camera || !containerRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      camera.aspect = Math.max(w / Math.max(h, 1), 0.0001);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    };

    const init = async () => {
      if (!containerRef.current) return;

      setStatus("loading");

      if (!mounted || !containerRef.current) return;

      scene = new THREE.Scene();

      const { clientWidth: width, clientHeight: height } = containerRef.current;

      const FOV_DEG = 70;
      camera = new THREE.PerspectiveCamera(
        FOV_DEG,
        width / Math.max(height, 1),
        0.1,
        100,
      );
      camera.position.set(24, 12, 10);
      camera.lookAt(0, 0, 0);

      // Add lights for the model
      ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
      directionalLight.position.set(6, 10, 8);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Soft environment light to brighten PBR materials
      const hemiLight = new (THREE as any).HemisphereLight(
        0xffffff,
        0x444444,
        0.6,
      );
      hemiLight.position.set(0, 10, 0);
      scene.add(hemiLight);

      // Fill light to soften shadows and illuminate dark areas
      fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
      fillLight.position.set(-8, 6, -6);
      fillLight.castShadow = false;
      scene.add(fillLight);

      // Ground removed

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      // prefer new outputColorSpace, fallback to legacy encoding if needed
      (renderer as any).outputColorSpace =
        (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
      renderer.setSize(width, height, true);

      // Image-Based Lighting (IBL) using PMREM + RoomEnvironment
      // @ts-ignore - dynamic import without local type declarations
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(
        new RoomEnvironment() as unknown as THREE.Scene,
        0.04,
      ).texture;
      scene.environment = envTex;

      containerRef.current.appendChild(renderer.domElement);
      const canvas = renderer.domElement;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.right = "0";
      canvas.style.bottom = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";

      // Load both models and place them in the same scene
      const loader = new GLTFLoader();
      const loadOne = (path: string) =>
        new Promise<THREE.Object3D>((resolve, reject) => {
          loader.load(
            path,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => reject(err),
          );
        });

      try {
        const scenes = await Promise.all(MODELS.map((m) => loadOne(m.path)));
        const offsets: number[] = [];
        const infos: { radius: number; midY: number }[] = [];

        // Prepare and place models
        for (let i = 0; i < scenes.length; i++) {
          const obj = scenes[i];

          // Center and scale each model
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          obj.scale.setScalar(scale);

          const scaledBox = new THREE.Box3().setFromObject(obj);
          const scaledSize = scaledBox.getSize(new THREE.Vector3());
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

          // Center horizontally and place on ground y=0
          obj.position.x -= scaledCenter.x;
          obj.position.z -= scaledCenter.z;
          obj.position.y -= scaledBox.min.y;

          const radius =
            Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 0.5;
          const midY = scaledSize.y * 0.45;
          infos.push({ radius, midY });

          // Enable shadows and tweak materials
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
              mats.forEach((m: any) => {
                if ("envMapIntensity" in m) m.envMapIntensity = 1.5;
                if ("toneMapped" in m) m.toneMapped = true;
              });
            }
          });
        }

        // Compute horizontal offsets to lay them side-by-side
        if (scenes.length === 1) {
          offsets.push(0);
        } else if (scenes.length === 2) {
          const r0 = infos[0].radius;
          const r1 = infos[1].radius;
          // Place second model just outside current camera frustum on the +X side
          const camY = camera.position.y;
          const d = Math.max(camY, 0.001);
          const halfHeight = Math.tan((FOV_DEG * Math.PI) / 360) * d;
          const halfWidth = halfHeight * camera.aspect;
          const extra = Math.max(r0, r1) * 1.2;
          const hideOffset = halfWidth + r0 + r1 + extra;
          offsets.push(0);
          offsets.push(hideOffset);
        } else {
          let cursor = 0;
          const margin = Math.max(...infos.map((i) => i.radius)) * 1.2;
          for (let i = 0; i < scenes.length; i++) {
            offsets.push(cursor);
            cursor += infos[i].radius * 2 + margin;
          }
        }

        // Apply offsets and add to scene
        for (let i = 0; i < scenes.length; i++) {
          scenes[i].position.x += offsets[i];
          scene.add(scenes[i]);
        }

        // Persist refs
        modelOffsetsRef.current = offsets;
        modelInfoRef.current = infos;
        topZoomRef.current = infos.map((_, i) =>
          i === 1 || i === 2 ? 1.5 : 1,
        );

        // Prepare view ordering (names only; positions computed per model)
        viewsRef.current = [
          {
            name: "top",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "front",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "right",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "back",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "left",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
        ];

        // Set initial camera target to current model top view
        const offX = offsets[modelIndex] ?? 0;
        const r0 = infos[modelIndex]?.radius ?? 2;
        const mid0 = infos[modelIndex]?.midY ?? 1;
        camTargetRef.current.set(offX + 0, r0 * 2.0, 0.1);
        lookTargetRef.current.set(offX, mid0, 0);
        camera.position.set(offX + 0, r0 * 2.0, 0.1);
        camera.lookAt(offX, mid0, 0);
        currentLookRef.current.set(offX, mid0, 0);
        topViewRef.current = { y: camera.position.y, z: camera.position.z };
        topLookYRef.current = mid0;

        setStatus("ready");
      } catch (error) {
        console.warn("Model(s) failed to load, using fallback cube:", error);
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        modelOffsetsRef.current = [0];
        modelInfoRef.current = [{ radius: 0.5, midY: 0.45 }];
        topZoomRef.current = [1];
        viewsRef.current = [
          {
            name: "top",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "front",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "right",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "back",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
          {
            name: "left",
            pos: new THREE.Vector3(0, 0, 0),
            look: new THREE.Vector3(0, 0, 0),
          },
        ];
        camTargetRef.current.set(0, 0.5 * 2.0, 0.1);
        lookTargetRef.current.set(0, 0.45, 0);
        camera.position.set(0, 0.5 * 2.0, 0.1);
        camera.lookAt(0, 0.45, 0);
        currentLookRef.current.set(0, 0.45, 0);
        topViewRef.current = { y: camera.position.y, z: camera.position.z };
        topLookYRef.current = 0.45;
        setStatus("ready");
      }

      const animate = () => {
        if (!mounted) return;
        animationId = requestAnimationFrame(animate);

        // Safety guard in case of early unmount during init
        if (!renderer || !scene || !camera) return;

        // Smoothly move camera toward target view
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const tp = camTargetRef.current;

        // Use different speeds: slow for X (model sliding), fast for Y/Z (view changes)
        const slideSpeed = 0.12; // Keep slow for sliding between models
        const viewSpeed = 0.06; // Slower for changing views within same model

        camera.position.set(
          lerp(camera.position.x, tp.x, slideSpeed),
          lerp(camera.position.y, tp.y, viewSpeed),
          lerp(camera.position.z, tp.z, viewSpeed),
        );
        const lt = lookTargetRef.current;
        const cur = currentLookRef.current;
        cur.set(
          lerp(cur.x, lt.x, slideSpeed),
          lerp(cur.y, lt.y, viewSpeed),
          lerp(cur.z, lt.z, viewSpeed),
        );
        camera.lookAt(cur.x, cur.y, cur.z);

        renderer.render(scene, camera);
      };

      window.addEventListener("resize", handleResize);
      handleResize();
      animate();
    };

    init().catch((e) => {
      console.error(e);
      setError(e?.message || "Unknown error initializing Three.js");
      setStatus("error");
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    const offX = modelOffsetsRef.current[modelIndex] ?? 0;

    // Recompute position for current view and model to apply zoom
    goToIndex(viewIndex);
  }, [modelIndex, viewIndex]);

  return (
    <main className="min-h-screen flex flex-col gap-4 items-center justify-center p-4 bg-amber-50">
      <div className="flex flex-col items-center gap-3">
        {/* 3D Scene Container */}
        <section
          ref={containerRef}
          aria-label="Three.js Canvas Container"
          className="w-[min(80vw,800px)] h-[min(65vh,520px)] overflow-hidden relative"
        >
          {(status === "idle" || status === "loading") && (
            <div className="absolute inset-0 grid place-items-center text-gray-500 text-[0.95rem] backdrop-blur-[0.5px] pointer-events-auto">
              Loading model...
            </div>
          )}

          {status === "error" && (
            <div
              role="alert"
              className="absolute inset-0 grid place-items-center text-red-700 text-[0.95rem] p-4 text-center backdrop-blur-[0.5px] pointer-events-auto"
            >
              Failed to load: {error}
            </div>
          )}
          {/* Model pagination overlay (moved from bottom) */}
          <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-auto z-10 px-2">
            <div className="flex gap-3 pointer-events-auto">
              {MODELS.map((m, i) => {
                const active = modelIndex === i;
                return (
                  <button
                    key={m.path}
                    onClick={() => {
                      setSelectedSpecIndex(0);
                      goToIndex(0);
                      if (switchTimerRef.current) {
                        clearTimeout(switchTimerRef.current);
                      }
                      switchTimerRef.current = setTimeout(() => {
                        setModelIndex(i);
                        switchTimerRef.current = null;
                      }, 650);
                    }}
                    aria-pressed={active}
                    className="bg-transparent border-none cursor-pointer py-2 px-1"
                  >
                    <div
                      className={`h-1 rounded-full transition-all duration-200 ease-in-out ${
                        active
                          ? "w-24 bg-gray-900 opacity-100"
                          : "w-9 bg-gray-400 opacity-60"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section
          aria-label={MODELS[modelIndex].name + " Specs"}
          className="max-w-[900px] w-[min(90vw,900px)] mx-auto mt-5 py-1 text-gray-700"
        >
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-bold m-0">
              {MODELS[modelIndex].name}
            </h2>
            <span className="text-gray-500">Iconic rear‑engine sports car</span>
          </div>
          <div
            className="mt-3"
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {(() => {
              const spec = [
                { label: "Engine", value: "Twin‑turbo 3.0L flat‑6" },
                { label: "Power", value: "379–640 hp (varies by trim)" },
                { label: "Torque", value: "331–590 lb‑ft" },
                { label: "0–100 km/h", value: "~3.0–4.2 s" },
                { label: "Top speed", value: "293–330 km/h" },
              ][selectedSpecIndex] || { label: "", value: "" };
              return (
                <div
                  key={selectedSpecIndex}
                  className="spec-container flex flex-col gap-2.5"
                >
                  {/* Left-extend line animation */}
                  <div className="line-sweep h-1 w-35 bg-gray-900 rounded-full transition-all duration-300 ease-in-out" />
                  {/* Spec content with subtle slide + fade */}
                  <div className="spec-anim flex items-baseline gap-2.5 text-gray-700 translate-x-0 opacity-100 transition-all duration-300 ease-in-out">
                    <div className="spec-label text-gray-500 text-[0.85rem]">
                      {spec.label}
                    </div>
                    <div className="spec-value font-semibold">{spec.value}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      </div>

      {/* Minimalist Tabs (lines) */}
      <nav
        aria-label="View tabs"
        className="flex items-center justify-center gap-3 py-1"
        tabIndex={0}
        onKeyDown={(e) => {
          const total = 5;
          if (e.key === "ArrowRight") {
            const next = (viewIndex + 1) % total;
            setSelectedSpecIndex(next);
            goToIndex(next);
            e.preventDefault();
            e.stopPropagation();
          } else if (e.key === "ArrowLeft") {
            const prev = (viewIndex - 1 + total) % total;
            setSelectedSpecIndex(prev);
            goToIndex(prev);
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const active = viewIndex === i;
          return (
            <button
              key={i}
              onMouseEnter={() => {
                setSelectedSpecIndex(i);
                goToIndex(i);
              }}
              onFocus={() => {
                setSelectedSpecIndex(i);
                goToIndex(i);
              }}
              onClick={() => goToIndex(i)}
              aria-label={
                ["Top", "Front", "Right side", "Back", "Left side"][i]
              }
              className="bg-transparent border-none cursor-pointer py-2 px-1"
            >
              <div
                className={`line-transition h-1 rounded-full transition-all duration-200 ease-in-out ${
                  active
                    ? "w-24 bg-gray-900 opacity-100"
                    : "w-9 bg-gray-400 opacity-60"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Model pagination moved to top overlay */}
    </main>
  );
}
