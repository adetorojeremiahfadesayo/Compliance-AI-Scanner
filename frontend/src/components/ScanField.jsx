import { useEffect, useMemo, useRef } from 'react';
import { buildSpatialModel } from '../utils/spatialModel';

const MODE_SETTINGS = {
  analysis: { cameraZ: 7.2, speed: 0.0012, tilt: 0.2 },
  configuration: { cameraZ: 7.8, speed: 0.0007, tilt: -0.08 },
  evidence: { cameraZ: 7.4, speed: 0.0009, tilt: 0.1 },
};

function ScanField({
  mode = 'analysis',
  projects = [],
  analyses = [],
  stages = [],
  findings = [],
  selections = {},
  focusId = null,
  className = '',
}) {
  const mountRef = useRef(null);
  const model = useMemo(() => buildSpatialModel({
    mode,
    projects,
    analyses,
    stages,
    findings,
    selections,
    focusId,
  }), [mode, projects, analyses, stages, findings, selections, focusId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let cleanup = () => {};
    mount.dataset.webglState = 'loading';

    import('three').then((THREE) => {
      if (disposed) return;

      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!context) throw new Error('WebGL unavailable');

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const settings = MODE_SETTINGS[mode] || MODE_SETTINGS.analysis;
        const styles = getComputedStyle(document.documentElement);
        const palette = {
          signal: styles.getPropertyValue('--three-signal').trim(),
          risk: styles.getPropertyValue('--three-risk').trim(),
          warning: styles.getPropertyValue('--three-warning').trim(),
          idle: styles.getPropertyValue('--three-idle').trim(),
          line: styles.getPropertyValue('--three-line').trim(),
        };
        const width = Math.max(mount.clientWidth, 1);
        const height = Math.max(mount.clientHeight, 1);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
        camera.position.z = settings.cameraZ;

        const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.5));
        renderer.setSize(width, height, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        const root = new THREE.Group();
        root.rotation.x = settings.tilt;
        scene.add(root);

        const ambientCount = window.innerWidth < 768 ? 260 : 620;
        const ambientPositions = new Float32Array(ambientCount * 3);
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let index = 0; index < ambientCount; index += 1) {
          const y = 1 - (index / Math.max(ambientCount - 1, 1)) * 2;
          const radius = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = golden * index;
          const depth = 2.85 + ((index * 17) % 29) / 100;
          ambientPositions[index * 3] = Math.cos(theta) * radius * depth;
          ambientPositions[index * 3 + 1] = y * depth;
          ambientPositions[index * 3 + 2] = Math.sin(theta) * radius * depth;
        }
        const ambientGeometry = new THREE.BufferGeometry();
        ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
        const ambientMaterial = new THREE.PointsMaterial({ color: palette.idle, size: 0.022, transparent: true, opacity: 0.32, depthWrite: false });
        const ambient = new THREE.Points(ambientGeometry, ambientMaterial);
        root.add(ambient);

        const nodePositions = new Float32Array(model.nodes.length * 3);
        const nodeColors = new Float32Array(model.nodes.length * 3);
        const color = new THREE.Color();
        model.nodes.forEach((node, index) => {
          nodePositions.set(node.position, index * 3);
          const value = node.severity === 'critical' || node.status === 'non_compliant'
            ? palette.risk
            : node.status === 'partial' || node.status === 'pending'
              ? palette.warning
              : palette.signal;
          color.set(value);
          nodeColors.set([color.r, color.g, color.b], index * 3);
        });
        const nodeGeometry = new THREE.BufferGeometry();
        nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
        nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
        const nodeMaterial = new THREE.PointsMaterial({ size: 0.115, vertexColors: true, transparent: true, opacity: 0.96, depthWrite: false, sizeAttenuation: true });
        const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
        root.add(nodes);

        const nodeMap = new Map(model.nodes.map((node) => [node.id, node.position]));
        const linkPositions = new Float32Array(model.links.length * 6);
        model.links.forEach((link, index) => {
          linkPositions.set(nodeMap.get(link.source) || [0, 0, 0], index * 6);
          linkPositions.set(nodeMap.get(link.target) || [0, 0, 0], index * 6 + 3);
        });
        const linkGeometry = new THREE.BufferGeometry();
        linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
        const linkMaterial = new THREE.LineBasicMaterial({ color: palette.line, transparent: true, opacity: 0.7 });
        const links = new THREE.LineSegments(linkGeometry, linkMaterial);
        root.add(links);

        const shellGeometry = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.48, 2));
        const shellMaterial = new THREE.LineBasicMaterial({ color: palette.line, transparent: true, opacity: 0.22 });
        const shell = new THREE.LineSegments(shellGeometry, shellMaterial);
        root.add(shell);

        const planeGeometry = new THREE.PlaneGeometry(5.2, 0.012);
        const planeMaterial = new THREE.MeshBasicMaterial({ color: palette.signal, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
        const scanPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        scanPlane.rotation.z = mode === 'configuration' ? Math.PI / 4 : 0;
        scanPlane.position.y = -2.6;
        root.add(scanPlane);

        const focusGeometry = new THREE.RingGeometry(0.17, 0.19, 48);
        const focusMaterial = new THREE.MeshBasicMaterial({ color: palette.signal, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
        const focusRing = new THREE.Mesh(focusGeometry, focusMaterial);
        const focusedPosition = nodeMap.get(model.focusId);
        focusRing.visible = Boolean(focusedPosition);
        if (focusedPosition) focusRing.position.set(...focusedPosition);
        root.add(focusRing);

        let frame = 0;
        let visible = true;
        let inView = true;
        let pointerX = 0;
        let pointerY = 0;
        let resizeFrame = 0;

        const render = (time = 0) => {
          root.rotation.y += settings.speed;
          root.rotation.x += (settings.tilt + pointerY * 0.08 - root.rotation.x) * 0.025;
          root.rotation.z += (pointerX * 0.08 - root.rotation.z) * 0.025;
          scanPlane.position.y = -2.6 + ((time * 0.00032) % 5.2);
          focusRing.rotation.z -= 0.008;
          renderer.render(scene, camera);
        };

        const tick = (time) => {
          if (!visible || !inView || reduceMotion) return;
          render(time);
          frame = requestAnimationFrame(tick);
        };

        const start = () => {
          cancelAnimationFrame(frame);
          if (reduceMotion) render(0);
          else if (visible && inView) frame = requestAnimationFrame(tick);
        };

        const onPointerMove = (event) => {
          const rect = mount.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
          pointerY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
        };

        const onVisibility = () => {
          visible = !document.hidden;
          start();
        };

        const resize = () => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            const nextWidth = Math.max(mount.clientWidth, 1);
            const nextHeight = Math.max(mount.clientHeight, 1);
            camera.aspect = nextWidth / nextHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(nextWidth, nextHeight, false);
            render(0);
          });
        };

        const intersectionObserver = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          start();
        }, { threshold: 0.01 });
        const resizeObserver = new ResizeObserver(resize);
        intersectionObserver.observe(mount);
        resizeObserver.observe(mount);
        mount.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        mount.dataset.webglState = model.nodes.length > 0 ? 'ready' : 'idle';
        start();

        cleanup = () => {
          cancelAnimationFrame(frame);
          cancelAnimationFrame(resizeFrame);
          intersectionObserver.disconnect();
          resizeObserver.disconnect();
          mount.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('visibilitychange', onVisibility);
          ambientGeometry.dispose();
          ambientMaterial.dispose();
          nodeGeometry.dispose();
          nodeMaterial.dispose();
          linkGeometry.dispose();
          linkMaterial.dispose();
          shellGeometry.dispose();
          shellMaterial.dispose();
          planeGeometry.dispose();
          planeMaterial.dispose();
          focusGeometry.dispose();
          focusMaterial.dispose();
          renderer.dispose();
          if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
        };
      } catch (error) {
        console.warn('Spatial field fallback:', error);
        mount.dataset.webglState = 'fallback';
      }
    }).catch(() => {
      if (!disposed) mount.dataset.webglState = 'fallback';
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [mode, model]);

  return (
    <div
      ref={mountRef}
      className={`spatial-field spatial-field--${mode} ${className}`.trim()}
      data-webgl-state="loading"
      aria-hidden="true"
    />
  );
}

export default ScanField;
