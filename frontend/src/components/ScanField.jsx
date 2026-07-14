import { useEffect, useRef } from 'react';

/**
 * Ambient Three.js point-sphere: the product's "global scan field".
 * Lazy-loads three so it never blocks first paint, renders a single
 * static frame under prefers-reduced-motion, and disposes fully on unmount.
 */
function ScanField() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('three').then((THREE) => {
      if (disposed || !mount) return;

      const width = mount.clientWidth || 360;
      const height = mount.clientHeight || 320;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.z = 7;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      // Fibonacci-distributed points on a sphere
      const COUNT = 850;
      const R = 2.55;
      const positions = new Float32Array(COUNT * 3);
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < COUNT; i++) {
        const y = 1 - (i / (COUNT - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = golden * i;
        positions[i * 3] = Math.cos(theta) * r * R;
        positions[i * 3 + 1] = y * R;
        positions[i * 3 + 2] = Math.sin(theta) * r * R;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xbfe04d,
        size: 0.03,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);

      const wireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 0.86, 1));
      const wireMat = new THREE.LineBasicMaterial({ color: 0x2a2f37, transparent: true, opacity: 0.55 });
      const wire = new THREE.LineSegments(wireGeo, wireMat);

      const group = new THREE.Group();
      group.add(points);
      group.add(wire);
      group.rotation.z = 0.22;
      scene.add(group);

      let raf = 0;
      let targetTiltX = 0;
      let targetTiltY = 0;

      const onPointer = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        targetTiltY = nx * 0.45;
        targetTiltX = ny * 0.3;
      };

      const tick = () => {
        group.rotation.y += 0.0016;
        wire.rotation.y -= 0.0022;
        group.rotation.x += (targetTiltX - group.rotation.x) * 0.035;
        group.rotation.z += (0.22 + targetTiltY * 0.4 - group.rotation.z) * 0.035;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };

      const onResize = () => {
        const w = mount.clientWidth || width;
        const h = mount.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (reduce) renderer.render(scene, camera);
      };
      window.addEventListener('resize', onResize);

      if (reduce) {
        renderer.render(scene, camera);
      } else {
        window.addEventListener('pointermove', onPointer, { passive: true });
        tick();
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('resize', onResize);
        geo.dispose();
        mat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 55%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 55%, transparent 100%)',
      }}
    />
  );
}

export default ScanField;
