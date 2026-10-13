const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const MAX_WIDTH = 1800; // عرض أقصى بدون تكبير — الصور الأصغر تبقى بحجمها
const LABEL_H = 52;
const GAP = 20;
const PAD = 28;

const DOC_ORDER = [
  { field: "studentPhoto", label: "صورة الطالب" },
  { field: "studentIdFront", label: "بطاقة الطالب — الوجه" },
  { field: "studentIdBack", label: "بطاقة الطالب — الظهر" },
  { field: "fatherIdFront", label: "بطاقة الأب — الوجه" },
  { field: "fatherIdBack", label: "بطاقة الأب — الظهر" },
  { field: "motherIdFront", label: "بطاقة الأم — الوجه" },
  { field: "motherIdBack", label: "بطاقة الأم — الظهر" },
  { field: "residenceFront", label: "بطاقة السكن — الوجه" },
  { field: "residenceBack", label: "بطاقة السكن — الظهر" },
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function headerSvg(width, title, subtitle) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1f3a"/>
      <stop offset="100%" stop-color="#123056"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="0" y="0" width="10" height="120" fill="#2f6fed"/>
  <text x="${width - 32}" y="48" text-anchor="end" font-family="Segoe UI, Tahoma, Arial" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
  <text x="${width - 32}" y="86" text-anchor="end" font-family="Segoe UI, Tahoma, Arial" font-size="18" fill="#b8c7dc">${escapeXml(subtitle)}</text>
</svg>`);
}

function labelSvg(width, text) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="10" ry="10" fill="#123056"/>
  <text x="${width - 20}" y="${LABEL_H / 2 + 7}" text-anchor="end" font-family="Segoe UI, Tahoma, Arial" font-size="20" font-weight="600" fill="#ffffff">${escapeXml(text)}</text>
</svg>`);
}

function placeholderSvg(width, height, text) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="12" ry="12" fill="#e8eef6" stroke="#c5d0e0" stroke-width="2"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Tahoma, Arial" font-size="22" fill="#7a8aa0">${escapeXml(text)}</text>
</svg>`);
}

/**
 * يجهّز الصورة كاملة بدون قص — تصغير العرض فقط إذا تجاوز الحد
 */
async function loadFullImage(filePath) {
  const base = sharp(filePath, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const srcW = meta.width || MAX_WIDTH;
  const srcH = meta.height || Math.round(MAX_WIDTH * 0.7);

  const targetW = Math.min(srcW, MAX_WIDTH);
  const pipeline =
    srcW > MAX_WIDTH
      ? base.resize({
          width: MAX_WIDTH,
          withoutEnlargement: true,
          fit: "inside", // يحافظ على النسبة كاملة بلا قص
        })
      : base;

  const buf = await pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  const outMeta = await sharp(buf).metadata();
  return {
    buf,
    width: outMeta.width || targetW,
    height: outMeta.height || Math.round((targetW * srcH) / srcW),
  };
}

async function makeBlock(filePath, label, canvasWidth) {
  const labelBuf = await sharp(labelSvg(canvasWidth, label)).png().toBuffer();

  let imageBuf;
  let imgW;
  let imgH;

  if (filePath && fs.existsSync(filePath)) {
    const loaded = await loadFullImage(filePath);
    imageBuf = loaded.buf;
    imgW = loaded.width;
    imgH = loaded.height;
  } else {
    imgW = canvasWidth;
    imgH = 280;
    imageBuf = await sharp(placeholderSvg(imgW, imgH, "غير متوفر")).png().toBuffer();
  }

  // ضع الصورة في منتصف العرض إن كانت أضيق من اللوحة — بدون قص
  const left = Math.max(0, Math.floor((canvasWidth - imgW) / 2));
  const blockH = LABEL_H + 12 + imgH + 12;

  const panelBuf = await sharp(
    Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}" height="${imgH + 24}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="12" ry="12" fill="#f3f5f8" stroke="#d5dde8" stroke-width="2"/>
</svg>`)
  )
    .png()
    .toBuffer();

  const frame = await sharp({
    create: {
      width: canvasWidth,
      height: blockH,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: labelBuf, top: 0, left: 0 },
      { input: panelBuf, top: LABEL_H, left: 0 },
      { input: imageBuf, top: LABEL_H + 12, left },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  const frameMeta = await sharp(frame).metadata();
  return { buf: frame, height: frameMeta.height || blockH };
}

/**
 * يجمع المستمسكات عمودياً — كل صورة كاملة وواضحة بدون قص
 */
async function buildDocumentsCollage(files, { fullName, schoolName, outDir }) {
  // حدّد عرض اللوحة حسب أكبر صورة (بعد التصغير الآمن)
  let contentWidth = 900;
  for (const doc of DOC_ORDER) {
    const file = files?.[doc.field]?.[0];
    if (!file?.path || !fs.existsSync(file.path)) continue;
    try {
      const meta = await sharp(file.path).rotate().metadata();
      const w = Math.min(meta.width || 900, MAX_WIDTH);
      if (w > contentWidth) contentWidth = w;
    } catch (_) {}
  }

  const totalW = contentWidth + PAD * 2;
  const blocks = [];
  for (const doc of DOC_ORDER) {
    const file = files?.[doc.field]?.[0];
    blocks.push(await makeBlock(file?.path, doc.label, contentWidth));
  }

  const headerH = 120;
  const footerH = 52;
  const blocksH = blocks.reduce((sum, b) => sum + b.height, 0) + GAP * Math.max(0, blocks.length - 1);
  const totalH = headerH + PAD + blocksH + PAD + footerH;

  const composites = [
    {
      input: await sharp(
        headerSvg(totalW, "مستمسكات الطالب — EMIS", `${fullName || "طالب"} • ${schoolName || "مدرسة قطر"}`)
      )
        .png()
        .toBuffer(),
      top: 0,
      left: 0,
    },
  ];

  let y = headerH + PAD;
  for (const block of blocks) {
    composites.push({ input: block.buf, top: y, left: PAD });
    y += block.height + GAP;
  }

  const stamp = new Date().toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" });
  const footer = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${totalW}" height="${footerH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b1f3a"/>
  <text x="${totalW / 2}" y="32" text-anchor="middle" font-family="Segoe UI, Tahoma, Arial" font-size="15" fill="#9eb0c7">صور كاملة بدون قص • مدرسة قطر • ميسان • ${escapeXml(stamp)}</text>
</svg>`);

  composites.push({
    input: await sharp(footer).png().toBuffer(),
    top: totalH - footerH,
    left: 0,
  });

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `collage-${Date.now()}.jpg`);

  await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 3,
      background: { r: 243, g: 245, b: 248 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(outPath);

  return outPath;
}

module.exports = { buildDocumentsCollage, DOC_ORDER };
