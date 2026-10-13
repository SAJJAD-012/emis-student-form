const STAFF = [
  { name: "رحيم واحد حمادي خلف الخرسة", role: "مدير المدرسة", group: "قيادة" },
  { name: "حاتم صاحب طالب خلف الخرسة", role: "المعاون", group: "قيادة" },
  { name: "سجاد علي فاخر مونس الربيعي", role: "مسؤول EMIS", group: "قيادة" },
  { name: "علي عبدالسادة عبد شناوة البهادلي", role: "رئيس اللجنة الامتحانية", group: "قيادة" },
  { name: "سيف احمد داود مهدي الجبوري", role: "هيئة تعليمية", group: "رجال" },
  { name: "احمد جبار ابوريحة سبهان الساعدي", role: "هيئة تعليمية", group: "رجال" },
  { name: "فقار اكرم ناصر هاشم الخرسة", role: "هيئة تعليمية", group: "رجال" },
  { name: "مهدي رحيم شمخي علي الفريجي", role: "هيئة تعليمية", group: "رجال" },
  { name: "علي رحيم جبر كاطع الساعدي", role: "هيئة تعليمية", group: "رجال" },
  { name: "رضوان ريسان مونس رضيوي الربيعي", role: "هيئة تعليمية", group: "رجال" },
  { name: "زينب حسن ربيل حسين البهادلي", role: "هيئة تعليمية", group: "سيدات" },
  { name: "اسراء لفته عبدالرضا خليفه الصكر", role: "هيئة تعليمية", group: "سيدات" },
  { name: "شيماء كريم كاظم شاوي النصيري", role: "هيئة تعليمية", group: "سيدات" },
  { name: "سهاد كاظم ضمد جبار الجيزاني", role: "هيئة تعليمية", group: "سيدات" },
];

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts[1] || "")[0] || "").replace(/\s/g, "");
}

function renderStaff(filter = "") {
  const grid = document.getElementById("staffGrid");
  const count = document.getElementById("staffCount");
  if (!grid) return;

  const q = filter.trim();
  const items = STAFF.filter((s) => !q || s.name.includes(q) || s.role.includes(q) || s.group.includes(q));

  if (!items.length) {
    grid.innerHTML =
      '<div class="staff-card" style="animation:none;opacity:1;transform:none"><strong>لا توجد نتائج مطابقة</strong><span>جرّب جزءاً من الاسم</span></div>';
  } else {
    let html = "";
    let lastGroup = null;
    let i = 0;
    for (const s of items) {
      if (s.group !== lastGroup) {
        lastGroup = s.group;
        html += `<div class="staff-group-title">${s.group}</div>`;
      }
      html += `
      <article class="staff-card" style="--i:${i}">
        <div class="staff-avatar" aria-hidden="true">${initials(s.name)}</div>
        <div>
          <strong>${s.name}</strong>
          <span>${s.role}</span>
        </div>
      </article>`;
      i += 1;
    }
    grid.innerHTML = html;
  }

  if (count) {
    count.textContent = q ? `النتيجة: ${items.length} من ${STAFF.length}` : `${STAFF.length} عضواً في الكادر`;
  }
}

function observeReveals() {
  const nodes = [
    ...document.querySelectorAll(".reveal"),
    ...document.querySelectorAll(".goal-item"),
  ];
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  nodes.forEach((el) => io.observe(el));
}

function setupNavScroll() {
  const nav = document.getElementById("siteNav");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/** خلفية دماغ روبوت تفاعلية مع شعار خلف الشبكة */
function initNeuralNet() {
  const canvas = document.getElementById("neuralCanvas");
  const hero = canvas?.parentElement;
  if (!canvas || !hero) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let nodes = [];
  let pulses = [];
  let t = 0;
  const mouse = { x: null, y: null, active: false };
  const logo = new Image();
  logo.src = "school-logo.png";

  function resize() {
    w = hero.clientWidth;
    h = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.max(36, Math.floor((w * h) / 16000));
    nodes = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.15 + Math.random() * 0.85;
      return {
        x: w * 0.5 + Math.cos(angle) * radius * w * 0.46,
        y: h * 0.5 + Math.sin(angle) * radius * h * 0.4,
        ox: 0,
        oy: 0,
        r: 1.2 + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        phase: Math.random() * Math.PI * 2,
      };
    });
    nodes.forEach((n) => {
      n.ox = n.x;
      n.oy = n.y;
    });
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const rad = Math.min(w, h) * (0.07 + (i % 2) * 0.035);
      nodes.push({
        x: w * 0.5 + Math.cos(a) * rad,
        y: h * 0.48 + Math.sin(a) * rad,
        ox: w * 0.5 + Math.cos(a) * rad,
        oy: h * 0.48 + Math.sin(a) * rad,
        r: 3.2,
        vx: 0,
        vy: 0,
        phase: a,
        core: true,
      });
    }
  }

  function spawnPulse(a, b) {
    if (pulses.length > 28) return;
    pulses.push({ a, b, p: 0, speed: 0.014 + Math.random() * 0.028 });
  }

  function onPointer(e) {
    const rect = hero.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    mouse.x = point.clientX - rect.left;
    mouse.y = point.clientY - rect.top;
    mouse.active = true;
  }

  function draw() {
    t += 0.018;
    ctx.clearRect(0, 0, w, h);

    // هالة خلفية
    const g = ctx.createRadialGradient(w * 0.5, h * 0.48, 8, w * 0.5, h * 0.48, Math.min(w, h) * 0.5);
    g.addColorStop(0, "rgba(94, 200, 255, 0.16)");
    g.addColorStop(0.35, "rgba(193, 39, 45, 0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // شعار خلف العقل
    if (logo.complete && logo.naturalWidth) {
      const size = Math.min(w, h) * 0.34;
      ctx.save();
      ctx.globalAlpha = 0.14 + Math.sin(t * 0.7) * 0.04;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, size * 0.58, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, w * 0.5 - size / 2, h * 0.48 - size / 2, size, size);
      ctx.restore();
    }

    const linkDist = Math.min(170, Math.max(100, w * 0.13));

    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      if (!reduce) {
        if (n.core) {
          const orbit = Math.min(w, h) * (0.07 + (i % 2) * 0.035);
          const spin = n.phase + t * 0.55;
          n.x = w * 0.5 + Math.cos(spin) * orbit;
          n.y = h * 0.48 + Math.sin(spin) * orbit;
        } else {
          n.vx += (Math.random() - 0.5) * 0.02;
          n.vy += (Math.random() - 0.5) * 0.02;
          // انجذاب خفيف للمركز (شكل دماغ)
          n.vx += (n.ox - n.x) * 0.002;
          n.vy += (n.oy - n.y) * 0.002;
          if (mouse.active) {
            const dx = mouse.x - n.x;
            const dy = mouse.y - n.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 180) {
              n.vx += (dx / d) * 0.08;
              n.vy += (dy / d) * 0.08;
            }
          }
          n.vx *= 0.96;
          n.vy *= 0.96;
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 12 || n.x > w - 12) n.vx *= -1;
          if (n.y < 12 || n.y > h - 12) n.vy *= -1;
        }
      }

      for (let j = i + 1; j < nodes.length; j += 1) {
        const m = nodes[j];
        const dx = n.x - m.x;
        const dy = n.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d < linkDist) {
          const alpha = (1 - d / linkDist) * 0.55;
          const grad = ctx.createLinearGradient(n.x, n.y, m.x, m.y);
          grad.addColorStop(0, `rgba(120, 210, 255, ${alpha})`);
          grad.addColorStop(1, `rgba(255, 110, 110, ${alpha * 0.7})`);
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = n.core || m.core ? 1.35 : 0.75;
          ctx.stroke();
          if (!reduce && Math.random() < 0.004) spawnPulse(i, j);
        }
      }
    }

    // إشارة نحو المؤشر
    if (mouse.active && !reduce) {
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 18 + Math.sin(t * 4) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(94, 200, 255, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 120, 0.9)";
      ctx.fill();
    }

    pulses = pulses.filter((pulse) => {
      pulse.p += pulse.speed;
      if (pulse.p >= 1) return false;
      const a = nodes[pulse.a];
      const b = nodes[pulse.b];
      if (!a || !b) return false;
      const x = a.x + (b.x - a.x) * pulse.p;
      const y = a.y + (b.y - a.y) * pulse.p;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 140, 140, 1)";
      ctx.shadowColor = "rgba(255, 80, 80, 0.95)";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      return true;
    });

    for (const n of nodes) {
      const glow = 0.55 + Math.sin(t * 2.4 + n.phase) * 0.4;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + (n.core ? 1.8 : 0), 0, Math.PI * 2);
      if (n.core) {
        ctx.fillStyle = `rgba(255, 95, 95, ${0.6 + glow * 0.35})`;
        ctx.shadowColor = "rgba(255, 70, 70, 0.85)";
        ctx.shadowBlur = 16;
      } else {
        ctx.fillStyle = `rgba(150, 225, 255, ${0.5 + glow * 0.4})`;
        ctx.shadowColor = "rgba(100, 210, 255, 0.7)";
        ctx.shadowBlur = 10;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // حلقات دماغ نابضة
    for (let ring = 0; ring < 3; ring += 1) {
      const rr = Math.min(w, h) * (0.1 + ring * 0.05) + Math.sin(t + ring) * (3 + ring);
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, rr, 0, Math.PI * 2);
      ctx.strokeStyle = ring % 2 === 0 ? "rgba(120, 210, 255, 0.22)" : "rgba(193, 39, 45, 0.18)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  hero.addEventListener("pointermove", onPointer, { passive: true });
  hero.addEventListener("touchmove", onPointer, { passive: true });
  hero.addEventListener("pointerleave", () => {
    mouse.active = false;
  });
  if (reduce) {
    draw();
  } else {
    draw();
  }
}

document.getElementById("staffSearch")?.addEventListener("input", (e) => {
  renderStaff(e.target.value);
});

renderStaff();
observeReveals();
setupNavScroll();
initNeuralNet();
