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

// Path to your model in the public folder
const MODEL_PATH = "/models/model.glb"; // Change this to your model filename

export default function Index() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [selectedSpecIndex, setSelectedSpecIndex] = useState(0);
  const camTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const lookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const viewsRef = useRef<
    { name: string; pos: THREE.Vector3; look: THREE.Vector3 }[]
  >([]);
  const goToIndex = (i: number) => {
    const views = viewsRef.current;
    if (!views || views.length === 0) return;
    const next = ((i % views.length) + views.length) % views.length;
    setViewIndex(next);
    const v = views[next];
    camTargetRef.current.set(v.pos.x, v.pos.y, v.pos.z);
    lookTargetRef.current.set(v.look.x, v.look.y, v.look.z);
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
    let model: THREE.Object3D | null = null;
    let ambientLight!: THREE.AmbientLight;
    let directionalLight!: THREE.DirectionalLight;
    let fillLight!: THREE.DirectionalLight;
    /* ground removed */

    const cleanup = () => {
      cancelAnimationFrame(animationId);
      try {
        window.removeEventListener("resize", handleResize);
      } catch {}
      try {
        // Cleanup model
        if (model) {
          scene.remove(model);
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat?.dispose());
              } else {
                child.material?.dispose();
              }
            }
          });
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

      camera = new THREE.PerspectiveCamera(
        70,
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
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
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

      // Load the model
      const loader = new GLTFLoader();

      // Try to load model, fall back to cube if not found
      loader.load(
        MODEL_PATH,
        (gltf) => {
          if (!mounted) return;

          model = gltf.scene;

          // Center and scale the model
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Scale model to a consistent display size
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          model.scale.setScalar(scale);

          // Recompute bounds after scaling
          const scaledBox = new THREE.Box3().setFromObject(model);
          const scaledSize = scaledBox.getSize(new THREE.Vector3());
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

          // Center horizontally and place the model on the ground at y=0
          model.position.x -= scaledCenter.x;
          model.position.z -= scaledCenter.z;
          model.position.y -= scaledBox.min.y;

          // Frame camera to the right side of the car and look at its mid-height
          const radius =
            Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 0.5;
          const midY = scaledSize.y * 0.45;
          viewsRef.current = [
            {
              name: "left",
              pos: new THREE.Vector3(-radius * 1.2, radius * 0.5, 0),
              look: new THREE.Vector3(0, midY, 0),
            },
            {
              name: "back",
              pos: new THREE.Vector3(0, radius * 0.5, -radius * 1.2),
              look: new THREE.Vector3(0, midY, 0),
            },
            {
              name: "right",
              pos: new THREE.Vector3(radius * 1.2, radius * 0.5, 0),
              look: new THREE.Vector3(0, midY, 0),
            },
            {
              name: "front",
              pos: new THREE.Vector3(0, radius * 0.5, radius * 1.2),
              look: new THREE.Vector3(0, midY, 0),
            },
            {
              name: "top",
              pos: new THREE.Vector3(0, radius * 2.0, 0.1),
              look: new THREE.Vector3(0, midY, 0),
            },
          ];
          camTargetRef.current.set(
            viewsRef.current[0].pos.x,
            viewsRef.current[0].pos.y,
            viewsRef.current[0].pos.z,
          );
          lookTargetRef.current.set(0, midY, 0);
          camera.position.set(
            viewsRef.current[0].pos.x,
            viewsRef.current[0].pos.y,
            viewsRef.current[0].pos.z,
          );
          camera.lookAt(0, midY, 0);

          // Enable shadows
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(model);

          // Boost environment reflections on PBR materials to avoid dark look
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
              mats.forEach((m: any) => {
                if ("envMapIntensity" in m) m.envMapIntensity = 1.5;
                if ("toneMapped" in m) m.toneMapped = true;
              });
            }
          });

          setStatus("ready");
        },
        (progress) => {
          // Optional: track loading progress
        },
        (error) => {
          console.warn("Model not found, using fallback cube:", error);

          // Fallback: create a cube if model fails to load
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
          model = new THREE.Mesh(geometry, material);
          scene.add(model);
          setStatus("ready");
        },
      );

      const animate = () => {
        if (!mounted) return;
        animationId = requestAnimationFrame(animate);

        // Safety guard in case of early unmount during init
        if (!renderer || !scene || !camera) return;

        // Smoothly move camera toward target view
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const tp = camTargetRef.current;
        camera.position.set(
          lerp(camera.position.x, tp.x, 0.08),
          lerp(camera.position.y, tp.y, 0.08),
          lerp(camera.position.z, tp.z, 0.08),
        );
        const lt = lookTargetRef.current;
        camera.lookAt(lt.x, lt.y, lt.z);

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

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "#faf3e0",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* 3D Scene Container */}
        <section
          ref={containerRef}
          aria-label="Three.js Canvas Container"
          style={{
            width: "min(80vw, 800px)",
            height: "min(65vh, 520px)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {(status === "idle" || status === "loading") && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "#6b7280",
                fontSize: "0.95rem",
                backdropFilter: "blur(0.5px)",
                pointerEvents: "auto",
              }}
            >
              Loading model...
            </div>
          )}

          {status === "error" && (
            <div
              role="alert"
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "#b91c1c",
                fontSize: "0.95rem",
                padding: "1rem",
                textAlign: "center",
                background: "rgba(255,255,255,0.75)",
                pointerEvents: "auto",
              }}
            >
              Failed to load: {error}
            </div>
          )}
        </section>

        <section
          aria-label="Porsche 911 Specs"
          style={{
            maxWidth: "900px",
            width: "min(90vw, 900px)",
            margin: "1.25rem auto 0",
            padding: "4px 0",
            color: "#374151",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              Porsche 911
            </h2>
            <span style={{ color: "#6b7280" }}>
              Iconic rear‑engine sports car
            </span>
          </div>
          <div
            style={{
              marginTop: "12px",
            }}
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
                  className="spec-container"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Left-extend line animation */}
                  <div
                    style={{
                      height: "4px",
                      width: "140px",
                      backgroundColor: "#111827",
                      borderRadius: "9999px",
                      transition: "width 280ms ease",
                    }}
                    className="line-sweep"
                  />
                  {/* Spec content with subtle slide + fade */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                      color: "#374151",
                      transform: "translateX(0)",
                      opacity: 1,
                      transition: "transform 260ms ease, opacity 240ms ease",
                    }}
                    className="spec-anim"
                  >
                    <div
                      style={{ color: "#6b7280", fontSize: "0.85rem" }}
                      className="spec-label"
                    >
                      {spec.label}
                    </div>
                    <div style={{ fontWeight: 600 }} className="spec-value">
                      {spec.value}
                    </div>
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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "4px 0",
        }}
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
                ["Left side", "Back", "Right side", "Front", "Top"][i]
              }
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: "4px",
                  width: active ? "96px" : "36px",
                  backgroundColor: active ? "#111827" : "#9ca3af",
                  borderRadius: "9999px",
                  opacity: active ? 1 : 0.6,
                  transition: "all 220ms ease",
                }}
                className="line-transition"
              />
            </button>
          );
        })}
      </nav>
    </main>
  );
}
