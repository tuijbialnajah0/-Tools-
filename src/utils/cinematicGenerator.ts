export const generateCinematicHTML = (title: string, markdown: string) => {
  const sections = markdown.split(/^## /m).filter(s => s.trim());
  const heroTitle = title.replace('.pdf', '');
  
  const themes = [
    {
      name: 'Classic Paper',
      colors: {
        ink: '#0a0a0a',
        paper: '#f8f7f3',
        accent: '#c94f2a',
        accent2: '#2a6bc9',
        border: '#ddd8cc',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#0a0a0a'
      },
      bgType: 'torus',
      bgColor: 0xc94f2a
    },
    {
      name: 'Midnight Neon',
      colors: {
        ink: '#e2e8f0',
        paper: '#0f172a',
        accent: '#38bdf8',
        accent2: '#818cf8',
        border: '#1e293b',
        card: '#1e293b',
        coverText: '#38bdf8',
        coverBg: '#020617'
      },
      bgType: 'particles',
      bgColor: 0x38bdf8
    },
    {
      name: 'Emerald Forest',
      colors: {
        ink: '#064e3b',
        paper: '#f0fdf4',
        accent: '#10b981',
        accent2: '#059669',
        border: '#dcfce7',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#064e3b'
      },
      bgType: 'spheres',
      bgColor: 0x10b981
    },
    {
      name: 'Cyberpunk',
      colors: {
        ink: '#ffffff',
        paper: '#000000',
        accent: '#ff00ff',
        accent2: '#00ffff',
        border: '#333333',
        card: '#111111',
        coverText: '#ff00ff',
        coverBg: '#000000'
      },
      bgType: 'grid',
      bgColor: 0xff00ff
    },
    {
      name: 'Sunset Glow',
      colors: {
        ink: '#431407',
        paper: '#fff7ed',
        accent: '#f97316',
        accent2: '#ea580c',
        border: '#ffedd5',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#431407'
      },
      bgType: 'waves',
      bgColor: 0xf97316
    }
  ];

  const theme = themes[Math.floor(Math.random() * themes.length)];
  
  const sectionHTML = sections.map((section, index) => {
    const lines = section.split('\n');
    const sectionTitle = lines[0].trim();
    const content = lines.slice(1).join('\n');
    
    // Split content by sub-headings (###) to create proper cards
    const subSections = content.split(/^### /m);
    const introContent = subSections[0].trim();
    const cards = subSections.slice(1).map(sub => {
      const subLines = sub.split('\n');
      const subTitle = subLines[0].trim();
      const subBody = subLines.slice(1).join('\n')
        .replace(/^\> (.*$)/gim, '<div class="note-box info gsap-up"><span class="note-icon">ℹ️</span><div>$1</div></div>')
        .replace(/\*\*(.*?)\*\*: (.*$)/gim, '<div class="def-box gsap-scale"><div class="def-label">Definition</div><div class="def-term">$1</div><div class="def-text">$2</div></div>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul class="gsap-up">$1</ul>');
      
      return `
        <div class="card gsap-up">
          <div class="card-accent-line"></div>
          <h3>${subTitle}</h3>
          <div class="card-body">${subBody}</div>
        </div>
      `;
    }).join('');

    const processedIntro = introContent
      .replace(/^\> (.*$)/gim, '<div class="note-box info gsap-up"><span class="note-icon">ℹ️</span><div>$1</div></div>')
      .replace(/\*\*(.*?)\*\*: (.*$)/gim, '<div class="def-box gsap-scale"><div class="def-label">Definition</div><div class="def-term">$1</div><div class="def-text">$2</div></div>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul class="gsap-up">$1</ul>');

    return `
      <section class="section" id="section-${index}">
        <div class="section-label gsap-left">${String(index + 1).padStart(2, '0')} — Section</div>
        <h2 class="section-title gsap-up">${sectionTitle}</h2>
        <div class="gsap-reveal">
          ${processedIntro}
          ${cards}
        </div>
      </section>
    `;
  }).join('');

  const tocHTML = sections.map((section, index) => {
    const sectionTitle = section.split('\n')[0].trim();
    return `<a class="toc-item" href="#section-${index}"><span class="toc-dot"></span>${sectionTitle}</a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${heroTitle} — Cinematic Study Experience</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<style>
:root {
  --ink:    ${theme.colors.ink};
  --paper:  ${theme.colors.paper};
  --accent: ${theme.colors.accent};
  --accent2:${theme.colors.accent2};
  --border: ${theme.colors.border};
  --card:   ${theme.colors.card};
  --cover-text: ${theme.colors.coverText};
  --cover-bg: ${theme.colors.coverBg};
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'DM Sans',sans-serif;background:var(--paper);color:var(--ink);font-size:15px;line-height:1.75;overflow-x:hidden;}
#webgl-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.3;}
.cover{min-height:100vh;background:var(--cover-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:40px 20px;}
.cover-title{font-family:'Playfair Display',serif;font-size:clamp(42px,9vw,108px);font-weight:900;color:var(--cover-text);text-align:center;line-height:1.04;letter-spacing:-2px;z-index:2;}
.cover-subtitle{font-size:15px;font-weight:300;color:rgba(255,255,255,0.5);text-align:center;margin-top:24px;max-width:540px;z-index:2;}
.toc-strip{position:sticky;top:0;z-index:100;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);display:flex;justify-content:center;overflow-x:auto;padding:0 10px;scrollbar-width:none;}
.toc-strip::-webkit-scrollbar{display:none;}
.toc-item{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.38);padding:15px 12px;white-space:nowrap;text-decoration:none;}
.toc-item.active{color:#fff;border-bottom:2px solid var(--accent);}
.main{max-width:940px;margin:0 auto;padding:60px 20px;position:relative;z-index:2;}
.section{margin-bottom:80px;}
.section-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:10px;}
.section-label::after{content:'';flex:1;height:1px;background:var(--border);}
.section-title{font-family:'Playfair Display',serif;font-size:clamp(28px,4.5vw,48px);font-weight:700;margin-bottom:30px;line-height:1.2;}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px 20px;margin-bottom:20px;transition:transform 0.4s;position:relative;overflow:hidden;width:100%;}
.card h3{font-size:20px;margin-bottom:16px;color:var(--accent);}
.card-body{font-size:14px;color:var(--ink);opacity:0.9;}
.card:hover{transform:translateY(-4px);}
.card-accent-line{position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent);border-radius:12px 0 0 12px;}
.note-box{border-radius:10px;padding:16px 18px;margin-bottom:20px;display:flex;gap:12px;background:rgba(0,0,0,0.03);border-left:3px solid var(--accent2);font-size:14px;}
.def-box{background:rgba(0,0,0,0.02);border:1px solid var(--border);border-radius:12px;padding:24px 20px;margin-bottom:20px;}
.def-label{font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--accent2);margin-bottom:8px;}
.def-term{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin-bottom:8px;}
.def-text{font-size:14px;opacity:0.85;}
.gsap-reveal{opacity:0;}

@media (min-width: 768px) {
  .main{padding:100px 32px;}
  .section{margin-bottom:120px;}
  .card{padding:32px 40px;}
  .def-box{padding:32px 40px;}
  .cover{padding:80px 40px;}
}

/* Theme Specific Tweaks */
${theme.name === 'Cyberpunk' ? `
  .card { border: 1px solid var(--accent); box-shadow: 0 0 10px var(--accent); }
  .cover-title { text-shadow: 0 0 20px var(--accent); }
` : ''}

${theme.name === 'Midnight Neon' ? `
  .card { background: #1e293b; border-color: #334155; }
  .note-box { background: #0f172a; border-color: var(--accent); }
` : ''}

</style>
</head>
<body>
<canvas id="webgl-bg"></canvas>
<section class="cover">
  <h1 class="cover-title">${heroTitle}</h1>
  <p class="cover-subtitle">Cinematic Study Notes — Theme: ${theme.name}</p>
</section>
<nav class="toc-strip">${tocHTML}</nav>
<main class="main">${sectionHTML}</main>
<script>
gsap.registerPlugin(ScrollTrigger);
gsap.utils.toArray('.gsap-up').forEach(el => {
  gsap.from(el, { y: 50, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: 'top 90%' } });
});
gsap.utils.toArray('.gsap-left').forEach(el => {
  gsap.from(el, { x: -50, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: 'top 90%' } });
});
gsap.utils.toArray('.gsap-reveal').forEach(el => {
  gsap.to(el, { opacity: 1, duration: 1, scrollTrigger: { trigger: el, start: 'top 85%' } });
});

// Three.js Background Logic
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('webgl-bg'), alpha: true, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 30;

const bgType = '${theme.bgType}';
const bgColor = ${theme.bgColor};
let mesh;

if (bgType === 'torus') {
  const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
  const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true});
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
} else if (bgType === 'particles') {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  for (let i = 0; i < 5000; i++) {
    vertices.push(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({color: bgColor, size: 0.5});
  mesh = new THREE.Points(geometry, material);
  scene.add(mesh);
} else if (bgType === 'spheres') {
  mesh = new THREE.Group();
  for (let i = 0; i < 20; i++) {
    const geometry = new THREE.SphereGeometry(Math.random() * 2, 16, 16);
    const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true, transparent: true, opacity: 0.3});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60));
    mesh.add(sphere);
  }
  scene.add(mesh);
} else if (bgType === 'grid') {
  const geometry = new THREE.PlaneGeometry(200, 200, 20, 20);
  const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true});
  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  scene.add(mesh);
} else if (bgType === 'waves') {
  const geometry = new THREE.PlaneGeometry(100, 100, 50, 50);
  const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true});
  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 3;
  scene.add(mesh);
}

function animate() {
  requestAnimationFrame(animate);
  if (mesh) {
    if (bgType === 'torus') {
      mesh.rotation.x += 0.01;
      mesh.rotation.y += 0.005;
    } else if (bgType === 'particles') {
      mesh.rotation.y += 0.001;
    } else if (bgType === 'spheres') {
      mesh.rotation.y += 0.002;
      mesh.children.forEach(s => s.rotation.x += 0.01);
    } else if (bgType === 'grid') {
      mesh.position.z += 0.1;
      if (mesh.position.z > 20) mesh.position.z = 0;
    } else if (bgType === 'waves') {
      const time = Date.now() * 0.001;
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, Math.sin(x * 0.2 + time) * 2 + Math.cos(y * 0.2 + time) * 2);
      }
      pos.needsUpdate = true;
    }
  }
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
</script>
</body>
</html>`;
};

