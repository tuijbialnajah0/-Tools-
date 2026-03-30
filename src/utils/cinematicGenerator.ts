export const autoFormatToMarkdown = (text: string): string => {
  if (/^## /m.test(text)) {
    return text;
  }

  // Clean up common PDF extraction artifacts
  let cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/ n /g, '\n- ') // Fix 'n' bullet points often found in PDFs
    .replace(/•/g, '\n- ')
    .replace(/(\w)-\n(\w)/g, '$1$2') // Fix hyphenated line breaks
    .replace(/([a-z,;])\n([a-z])/gi, '$1 $2'); // Join lines that break mid-sentence

  const paragraphs = cleanText.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  
  let formattedText = '';
  let sectionCount = 0;
  let cardCount = 0;

  // If text is just one giant block, split it artificially
  if (paragraphs.length < 3) {
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    formattedText += `\n\n## Document Overview\n\n`;
    let currentChunk = '';
    let chunkIdx = 1;
    
    for (let i = 0; i < sentences.length; i++) {
      currentChunk += sentences[i].trim() + ' ';
      if (currentChunk.length > 300 || i === sentences.length - 1) {
        if (chunkIdx === 1) {
          formattedText += `${currentChunk}\n\n`;
        } else {
          formattedText += `\n\n### Part ${chunkIdx}\n\n${currentChunk}\n\n`;
        }
        currentChunk = '';
        chunkIdx++;
      }
    }
    return formattedText;
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    
    const isShort = p.length > 2 && p.length < 100;
    const isCapitalized = p === p.toUpperCase() && p.match(/[A-Z]/);
    const hasNoPunctuationAtEnd = !/[.!?]$/.test(p);
    
    // Heuristic for heading
    const isHeading = isShort && (isCapitalized || hasNoPunctuationAtEnd);

    if (isHeading) {
      const cleanHeading = p.replace(/[:.]$/, '').trim();
      // Promote to H2 if it's ALL CAPS or we don't have a section yet
      if (isCapitalized || sectionCount === 0 || cardCount > 3) {
        formattedText += `\n\n## ${cleanHeading}\n\n`;
        sectionCount++;
        cardCount = 0;
      } else {
        formattedText += `\n\n### ${cleanHeading}\n\n`;
        cardCount++;
      }
    } else {
      // Process paragraph content
      let processedP = p;
      
      // Detect inline definitions
      if (p.includes(':') && p.split(':')[0].length < 40 && !p.includes('\n')) {
        const parts = p.split(':');
        processedP = `**${parts[0].trim()}**: ${parts.slice(1).join(':').trim()}`;
      }
      
      if (i === 0 && sectionCount === 0) {
        formattedText += `\n\n## Introduction\n\n${processedP}\n\n`;
        sectionCount++;
      } else {
        // Create artificial cards for long paragraphs to make it look cinematic
        if (processedP.length > 300 && sectionCount > 0 && !processedP.includes('\n- ')) {
           const sentences = processedP.match(/[^.!?]+[.!?]+/g) || [processedP];
           let currentChunk = '';
           for (let j = 0; j < sentences.length; j++) {
             currentChunk += sentences[j].trim() + ' ';
             if (currentChunk.length > 200 || j === sentences.length - 1) {
               formattedText += `\n\n### Key Point ${cardCount + 1}\n\n${currentChunk}\n\n`;
               currentChunk = '';
               cardCount++;
             }
           }
        } else if (processedP.length > 100 && sectionCount > 0) {
           formattedText += `\n\n### Key Point ${cardCount + 1}\n\n${processedP}\n\n`;
           cardCount++;
        } else {
           formattedText += `${processedP}\n\n`;
        }
      }
    }
  }

  return formattedText;
};

export const generateCinematicHTML = (title: string, markdown: string, themeIndex?: number) => {
  const sections = markdown.split(/^## /m).filter(s => s.trim());
  const heroTitle = title.replace('.pdf', '');
  
  const themes = [
    {
      name: 'Classic Paper',
      colors: {
        ink: '#1a1a1a',
        paper: '#fdfcf8',
        accent: '#c94f2a',
        accent2: '#2a6bc9',
        border: '#e5e1d5',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#1a1a1a'
      },
      bgType: 'torus',
      bgColor: 0xc94f2a
    },
    {
      name: 'Midnight Neon',
      colors: {
        ink: '#f8fafc',
        paper: '#020617',
        accent: '#38bdf8',
        accent2: '#818cf8',
        border: '#1e293b',
        card: '#0f172a',
        coverText: '#38bdf8',
        coverBg: '#000000'
      },
      bgType: 'particles',
      bgColor: 0x38bdf8
    },
    {
      name: 'Emerald Forest',
      colors: {
        ink: '#022c22',
        paper: '#f0fdf4',
        accent: '#059669',
        accent2: '#047857',
        border: '#d1fae5',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#022c22'
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
        border: '#222222',
        card: '#0a0a0a',
        coverText: '#ff00ff',
        coverBg: '#000000'
      },
      bgType: 'grid',
      bgColor: 0xff00ff
    },
    {
      name: 'Royal Velvet',
      colors: {
        ink: '#ffffff',
        paper: '#1a0b2e',
        accent: '#ffd700',
        accent2: '#ff8c00',
        border: '#3d1c5c',
        card: '#2d144d',
        coverText: '#ffd700',
        coverBg: '#1a0b2e'
      },
      bgType: 'spheres',
      bgColor: 0xffd700
    },
    {
      name: 'Sakura Blossom',
      colors: {
        ink: '#4a2c2a',
        paper: '#fff5f7',
        accent: '#ff85a2',
        accent2: '#ffb7c5',
        border: '#ffe4e9',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#ff85a2'
      },
      bgType: 'particles',
      bgColor: 0xff85a2
    },
    {
      name: 'Oceanic Depth',
      colors: {
        ink: '#f0f9ff',
        paper: '#082f49',
        accent: '#0ea5e9',
        accent2: '#22d3ee',
        border: '#0c4a6e',
        card: '#075985',
        coverText: '#0ea5e9',
        coverBg: '#082f49'
      },
      bgType: 'waves',
      bgColor: 0x0ea5e9
    },
    {
      name: 'High Contrast',
      colors: {
        ink: '#000000',
        paper: '#ffffff',
        accent: '#000000',
        accent2: '#000000',
        border: '#000000',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#000000'
      },
      bgType: 'grid',
      bgColor: 0x000000
    }
  ];

  const theme = (themeIndex !== undefined && themeIndex >= 0 && themeIndex < themes.length) 
    ? themes[themeIndex] 
    : themes[Math.floor(Math.random() * themes.length)];
  
  const sectionHTML = sections.map((section, index) => {
    const lines = section.split('\n');
    const sectionTitle = lines[0].trim();
    const content = lines.slice(1).join('\n');
    
    const subSections = content.split(/^### /m);
    const introContent = subSections[0].trim();
    const processMarkdown = (text: string) => {
      return text
        .replace(/^\> (.*$)/gim, '<div class="note-box info gsap-up"><span class="note-icon">ℹ️</span><div>$1</div></div>')
        .replace(/\*\*(.*?)\*\*: (.*$)/gim, '<div class="def-box gsap-scale"><div class="def-label">Definition</div><div class="def-term">$1</div><div class="def-text">$2</div></div>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(?:<li>.*<\/li>\n?)+/g, match => `<ul class="gsap-up">${match}</ul>`)
        .replace(/(\|.*\|)\n(\|[:\-\s|]*\|)\n((?:\|.*\|\n?)*)/g, (match, header, separator, rows) => {
          const headerCols = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
          const bodyRows = rows.split('\n').filter((r: string) => r.trim()).map((row: string) => {
            const cols = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
            return `<tr>${cols}</tr>`;
          }).join('');
          return `<div class="table-container gsap-up"><table class="cinematic-table"><thead><tr>${headerCols}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
        });
    };

    const cards = subSections.slice(1).map(sub => {
      const subLines = sub.split('\n');
      const subTitle = subLines[0].trim();
      const subBody = processMarkdown(subLines.slice(1).join('\n'));
      
      return `
        <div class="card-wrapper">
          <div class="card gsap-up">
            <div class="card-accent-line"></div>
            <div class="card-header">
              <h3>${subTitle}</h3>
            </div>
            <div class="card-body">${subBody}</div>
          </div>
        </div>
      `;
    }).join('');

    const processedIntro = processMarkdown(introContent);

    return `
      <section class="section" id="section-${index}">
        <div class="section-parallax-bg" data-speed="-0.1"></div>
        <div class="section-content">
          <div class="section-label gsap-left">${String(index + 1).padStart(2, '0')} — Section</div>
          <h2 class="section-title gsap-up">${sectionTitle}</h2>
          <div class="gsap-reveal">
            ${processedIntro}
            <div class="cards-grid">
              ${cards}
            </div>
          </div>
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
  --glass: rgba(255, 255, 255, 0.03);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{overflow-x:hidden;width:100%;}
body{font-family:'DM Sans',sans-serif;background:var(--paper);color:var(--ink);font-size:16px;line-height:1.8;overflow-x:hidden;width:100%;-webkit-font-smoothing:antialiased;}

/* Table Styles */
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 32px 0;
  border-radius: 20px;
  border: 2px solid var(--border);
  background: var(--card);
  max-width: 100%;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  position: relative;
}
.cinematic-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: left;
  min-width: 800px; /* Increased for better visibility */
}
.cinematic-table th {
  background: var(--accent);
  color: white;
  padding: 16px 20px;
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1.5px;
  font-weight: 700;
  white-space: nowrap; /* Prevent header wrapping */
}
.cinematic-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  color: var(--ink);
  font-weight: 500;
  min-width: 120px; /* Ensure columns have enough space */
}
.cinematic-table tr:last-child td {
  border-bottom: none;
}
.cinematic-table tr:hover td {
  background: rgba(0,0,0,0.01);
}

#webgl-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.3;}

/* Progress Bar */
#progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 0%;
  height: 4px;
  background: linear-gradient(to right, var(--accent), var(--accent2));
  z-index: 1000;
  transition: width 0.1s;
}

.cover{min-height:100vh;background:var(--cover-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:40px 20px;}
.cover-title{font-family:'Playfair Display',serif;font-size:clamp(42px,9vw,108px);font-weight:900;color:var(--cover-text);text-align:center;line-height:1.04;letter-spacing:-2px;z-index:2;word-break:break-word;}
.cover-subtitle{font-size:15px;font-weight:300;color:rgba(255,255,255,0.5);text-align:center;margin-top:24px;max-width:540px;z-index:2;}

.toc-strip{position:sticky;top:0;z-index:100;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);display:flex;justify-content:center;overflow-x:auto;padding:0 10px;scrollbar-width:none;}
.toc-strip::-webkit-scrollbar{display:none;}
.toc-item{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.38);padding:15px 12px;white-space:nowrap;text-decoration:none;transition: color 0.3s;}
.toc-item.active{color:#fff;border-bottom:2px solid var(--accent);}
.toc-item:hover{color:rgba(255,255,255,0.8);}

.main{max-width:1100px;margin:0 auto;padding:60px 20px;position:relative;z-index:2;}

.section{margin-bottom:120px;position:relative;scroll-margin-top:80px;}
.section-parallax-bg {
  position: absolute;
  top: 0;
  left: -10%;
  width: 120%;
  height: 100%;
  background: radial-gradient(circle at center, var(--accent) 0%, transparent 70%);
  opacity: 0.03;
  z-index: -1;
  pointer-events: none;
}

.section-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:12px;display:flex;align-items:center;gap:10px;}
.section-label::after{content:'';flex:1;height:1px;background:var(--border);}
.section-title{font-family:'Playfair Display',serif;font-size:clamp(28px,4.5vw,48px);font-weight:700;margin-bottom:40px;line-height:1.2;word-break:break-word;}

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}
@media (min-width: 900px) {
  .cards-grid { grid-template-columns: 1fr 1fr; }
}

.card-wrapper { perspective: 1000px; }
.card{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:32px;transition:all 0.5s cubic-bezier(0.23, 1, 0.32, 1);position:relative;overflow:hidden;width:100%;box-shadow: 0 10px 30px rgba(0,0,0,0.02);}
.card:hover{transform: translateY(-10px) rotateX(2deg); box-shadow: 0 20px 50px rgba(0,0,0,0.05); border-color: var(--accent);}

.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 15px; margin-bottom: 20px; }
.card h3{font-size:22px;line-height:1.3;color:var(--accent);font-weight: 700;}

.card-body{font-size:15px;color:var(--ink);font-weight: 400; line-height: 1.7; transition: opacity 0.3s, filter 0.3s;}

.card-accent-line{position:absolute;left:0;top:0;bottom:0;width:8px;background:linear-gradient(to bottom, var(--accent), var(--accent2));border-radius:24px 0 0 24px;}

.note-box{border-radius:20px;padding:24px;margin-bottom:32px;display:flex;gap:18px;background:rgba(0,0,0,0.03);border-left:6px solid var(--accent2);font-size:15px; box-shadow: inset 0 0 30px rgba(0,0,0,0.02); color: var(--ink); font-weight: 500;}
.def-box{background:rgba(0,0,0,0.02);border:2px solid var(--border);border-radius:24px;padding:28px;margin-bottom:32px; transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);}
.def-box:hover { background: var(--card); border-color: var(--accent); transform: scale(1.03) translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.08); }
.def-label{font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;color:var(--accent);margin-bottom:12px; font-weight: 900; letter-spacing: 2px;}
.def-term{font-family:'Playfair Display',serif;font-size:26px;font-weight:900;margin-bottom:12px; color: var(--ink);}
.def-text{font-size:15px; color: var(--ink); line-height: 1.7; font-weight: 400;}

ul { padding-left: 24px; margin-bottom: 24px; list-style-type: none; }
li { position: relative; margin-bottom: 12px; padding-left: 8px; }
li::before { content: '•'; position: absolute; left: -16px; color: var(--accent); font-weight: bold; font-size: 18px; line-height: 1; top: 2px; }

.gsap-reveal{opacity:0;}

@media (min-width: 768px) {
  .main{padding:100px 32px;}
  .section{margin-bottom:160px;}
  .cover{padding:80px 40px;}
}

/* Theme Specific Tweaks */
${theme.name === 'Cyberpunk' ? `
  .card { border: 1px solid var(--accent); box-shadow: 0 0 20px rgba(255, 0, 255, 0.1); }
  .cover-title { text-shadow: 0 0 30px var(--accent); }
` : ''}

${theme.name === 'Midnight Neon' ? `
  .card { background: #1e293b; border-color: #334155; }
  .note-box { background: #0f172a; border-color: var(--accent); }
` : ''}

</style>
</head>
<body>
<div id="progress-bar"></div>
<canvas id="webgl-bg"></canvas>

<section class="cover">
  <h1 class="cover-title">${heroTitle}</h1>
  <p class="cover-subtitle">Powered by 𝙱𝙹𝙴 ~ Clan — Theme: ${theme.name}</p>
</section>

<nav class="toc-strip">${tocHTML}</nav>

<main class="main">
  ${sectionHTML}
</main>

<script>
gsap.registerPlugin(ScrollTrigger);

// GSAP Animations
gsap.utils.toArray('.gsap-up').forEach(el => {
  gsap.from(el, { y: 60, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: el, start: 'top 92%' } });
});
gsap.utils.toArray('.gsap-left').forEach(el => {
  gsap.from(el, { x: -60, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: el, start: 'top 92%' } });
});
gsap.utils.toArray('.gsap-reveal').forEach(el => {
  gsap.to(el, { opacity: 1, duration: 1.5, scrollTrigger: { trigger: el, start: 'top 85%' } });
});

// Parallax Logic
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  
  // Progress Bar
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolledPercent = (winScroll / height) * 100;
  document.getElementById("progress-bar").style.width = scrolledPercent + "%";

  // Parallax Elements
  document.querySelectorAll('.parallax-element').forEach(el => {
    const speed = el.getAttribute('data-speed');
    const yPos = -(scrolled * speed);
    el.style.transform = \`translateY(\${yPos}px)\`;
  });

  document.querySelectorAll('.section-parallax-bg').forEach(el => {
    const speed = el.getAttribute('data-speed');
    const yPos = (scrolled * speed);
    el.style.transform = \`translateY(\${yPos}px)\`;
  });
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
