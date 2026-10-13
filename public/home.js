const STAFF = [
  // الرجال أولاً — القيادة ثم الهيئة
  { name: "رحيم واحد حمادي خلف الخرسة", role: "مدير المدرسة", group: "قيادة" },
  { name: "حاتم صاحب طالب خلف الخرسة", role: "المعاون", group: "قيادة" },
  { name: "سجاد علي فاخر مونس الربيعي", role: "مسؤول EMIS", group: "قيادة" },
  { name: "سيف احمد داود مهدي الجبوري", role: "هيئة تعليمية", group: "رجال" },
  { name: "احمد جبار ابوريحة سبهان الساعدي", role: "هيئة تعليمية", group: "رجال" },
  { name: "علي عبدالسادة عبد شناوة البهادلي", role: "هيئة تعليمية", group: "رجال" },
  { name: "فقار اكرم ناصر هاشم الخرسة", role: "هيئة تعليمية", group: "رجال" },
  { name: "مهدي رحيم شمخي علي الفريجي", role: "هيئة تعليمية", group: "رجال" },
  { name: "علي رحيم جبر كاطع الساعدي", role: "هيئة تعليمية", group: "رجال" },
  { name: "رضوان ريسان مونس رضيوي الربيعي", role: "هيئة تعليمية", group: "رجال" },
  // السيدات
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
    count.textContent = q
      ? `النتيجة: ${items.length} من ${STAFF.length}`
      : `${STAFF.length} عضواً — الرجال أولاً`;
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

/** خلفية دماغ روبوت / شبكة عصبية */
function initNeuralNet() {
  const canvas = document.getElementById("neuralCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let nodes = [];
  let pulses = [];
  let raf = 0;
  let t = 0;

  function resize() {
    const parent = canvas.parentElement;
    w = parent.clientWidth;
    h = parent.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.max(28, Math.floor((w * h) / 22000));
    nodes = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random();
      return {
        x: w * 0.5 + Math.cos(angle) * radius * w * 0.42,
        y: h * 0.48 + Math.sin(angle) * radius * h * 0.38,
        r: 1.4 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2,
      };
    });
    // نواة مركزية كـ "دماغ"
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      nodes.push({
        x: w * 0.5 + Math.cos(a) * Math.min(w, h) * 0.08,
        y: h * 0.45 + Math.sin(a) * Math.min(w, h) * 0.08,
        r: 2.8,
        vx: 0,
        vy: 0,
        phase: a,
        core: true,
      });
    }
  }

  function spawnPulse(a, b) {
    if (pulses.length > 18) return;
    pulses.push({ a, b, p: 0, speed: 0.012 + Math.random() * 0.02 });
  }

  function draw() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);

    // هالة دماغية
    const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, Math.min(w, h) * 0.45);
    g.addColorStop(0, "rgba(80, 180, 255, 0.12)");
    g.addColorStop(0.45, "rgba(193, 39, 45, 0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const linkDist = Math.min(150, Math.max(90, w * 0.12));

    // وصلات
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      if (!reduce) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 20 || n.x > w - 20) n.vx *= -1;
        if (n.y < 20 || n.y > h - 20) n.vy *= -1;
      }
      for (let j = i + 1; j < nodes.length; j += 1) {
        const m = nodes[j];
        const dx = n.x - m.x;
        const dy = n.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d < linkDist) {
          const alpha = (1 - d / linkDist) * 0.45;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = `rgba(120, 200, 255, ${alpha})`;
          ctx.lineWidth = n.core || m.core ? 1.2 : 0.7;
          ctx.stroke();
          if (!reduce && Math.random() < 0.002) spawnPulse(i, j);
        }
      }
    }

    // نبضات الإشارة
    pulses = pulses.filter((pulse) => {
      pulse.p += pulse.speed;
      if (pulse.p >= 1) return false;
      const a = nodes[pulse.a];
      const b = nodes[pulse.b];
      if (!a || !b) return false;
      const x = a.x + (b.x - a.x) * pulse.p;
      const y = a.y + (b.y - a.y) * pulse.p;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 120, 0.95)";
      ctx.shadowColor = "rgba(255, 80, 80, 0.8)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      return true;
    });

    // خلايا عصبية
    for (const n of nodes) {
      const glow = 0.55 + Math.sin(t * 2 + n.phase) * 0.35;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + (n.core ? 1.5 : 0), 0, Math.PI * 2);
      if (n.core) {
        ctx.fillStyle = `rgba(255, 90, 90, ${0.55 + glow * 0.35})`;
        ctx.shadowColor = "rgba(255, 70, 70, 0.7)";
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = `rgba(150, 220, 255, ${0.45 + glow * 0.4})`;
        ctx.shadowColor = "rgba(100, 200, 255, 0.55)";
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // حلقة دماغ مركزية
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.45, Math.min(w, h) * 0.11 + Math.sin(t) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(120, 200, 255, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.45, Math.min(w, h) * 0.16 + Math.cos(t * 0.8) * 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(193, 39, 45, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  if (reduce) {
    draw();
    cancelAnimationFrame(raf);
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
