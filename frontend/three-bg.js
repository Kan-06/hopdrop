/* ── Three.js Interactive Premium Background ── */
(function initThreeJSBackground() {
    // 1. Create native canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-2';
    canvas.style.pointerEvents = 'none'; // Don't block UI clicks
    document.body.prepend(canvas);

    // 2. Hide old CSS orbs if they exist
    const oldBg = document.querySelector('.animated-bg');
    if (oldBg) oldBg.style.display = 'none';

    // 3. Three.js Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x09090b, 0.001); // Match the CSS dark background

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 600;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 4. Create Logistics "Delivery Nodes" Particle System
    // We will use a BufferGeometry to create a cluster of glowing particles
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0xFF2E93); // Primary Pink
    const color2 = new THREE.Color(0x00E4FF); // Secondary Cyan

    for (let i = 0; i < particleCount; i++) {
        // Random spherical distribution
        const r = 800 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Mix colors
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3]     = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create a circular glowing texture for particles programmatically
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = 64; ctx.canvas.height = 64;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const particleTexture = new THREE.CanvasTexture(ctx.canvas);

    const material = new THREE.PointsMaterial({
        size: 12,
        vertexColors: true,
        map: particleTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 5. Lines connecting close nodes (Logistics Web Effect)
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending
    });
    
    // We only connect a sparse subset to keep performance high
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = [];
    for(let i=0; i<300; i++) {
        const p1 = new THREE.Vector3(positions[i*3], positions[i*3+1], positions[i*3+2]);
        for(let j=i+1; j<300; j++) {
            const p2 = new THREE.Vector3(positions[j*3], positions[j*3+1], positions[j*3+2]);
            if(p1.distanceTo(p2) < 150) {
                linePositions.push(p1.x, p1.y, p1.z);
                linePositions.push(p2.x, p2.y, p2.z);
            }
        }
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMaterial);
    scene.add(lines);

    // 6. Interactive Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 7. Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Parallax effect on camera
        targetX = mouseX * 0.2;
        targetY = mouseY * 0.2;
        camera.position.x += (targetX - camera.position.x) * 0.02;
        camera.position.y += (-targetY - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        // Slowly rotate cluster
        particles.rotation.y = elapsedTime * 0.05;
        particles.rotation.x = elapsedTime * 0.02;
        
        lines.rotation.y = elapsedTime * 0.05;
        lines.rotation.x = elapsedTime * 0.02;

        // Bounding bounce logic for vertices is omitted for performance
        // The rotation gives a lovely 3D depth feeling.

        renderer.render(scene, camera);
    }
    animate();
})();
