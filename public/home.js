const STAFF = [
  { name: "زينب حسن ربيل حسين البهادلي", role: "هيئة تعليمية" },
  { name: "اسراء لفته عبدالرضا خليفه الصكر", role: "هيئة تعليمية" },
  { name: "شيماء كريم كاظم شاوي النصيري", role: "هيئة تعليمية" },
  { name: "سهاد كاظم ضمد جبار الجيزاني", role: "هيئة تعليمية" },
  { name: "حاتم صاحب طالب خلف الخرسة", role: "المعاون" },
  { name: "سيف احمد داود مهدي الجبوري", role: "هيئة تعليمية" },
  { name: "احمد جبار ابوريحة سبهان الساعدي", role: "هيئة تعليمية" },
  { name: "علي عبدالسادة عبد شناوة البهادلي", role: "هيئة تعليمية" },
  { name: "فقار اكرم ناصر هاشم الخرسة", role: "هيئة تعليمية" },
  { name: "مهدي رحيم شمخي علي الفريجي", role: "هيئة تعليمية" },
  { name: "علي رحيم جبر كاطع الساعدي", role: "هيئة تعليمية" },
  { name: "رضوان ريسان مونس رضيوي الربيعي", role: "هيئة تعليمية" },
  { name: "رحيم واحد حمادي خلف الخرسة", role: "مدير المدرسة" },
  { name: "سجاد علي فاخر مونس الربيعي", role: "مسؤول EMIS" },
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
  const items = STAFF.filter((s) => !q || s.name.includes(q) || s.role.includes(q));

  grid.innerHTML = items
    .map(
      (s) => `
      <article class="staff-card">
        <div class="staff-avatar" aria-hidden="true">${initials(s.name)}</div>
        <div>
          <strong>${s.name}</strong>
          <span>${s.role}</span>
        </div>
      </article>`
    )
    .join("");

  if (count) {
    count.textContent = q
      ? `النتيجة: ${items.length} من ${STAFF.length}`
      : `عدد الكادر: ${STAFF.length}`;
  }

  if (!items.length) {
    grid.innerHTML = `<div class="staff-card"><strong>لا توجد نتائج مطابقة</strong><span>جرّب جزءاً من الاسم</span></div>`;
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
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );
  nodes.forEach((el) => io.observe(el));
}

document.getElementById("staffSearch")?.addEventListener("input", (e) => {
  renderStaff(e.target.value);
});

renderStaff();
observeReveals();
