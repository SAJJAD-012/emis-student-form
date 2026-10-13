const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// أقصى سرعة: صور أصغر + جودة أخف + بدون mozjpeg
const MAX_W = 420;
const MAX_H = 280;
const LABEL_H = 28;
const GAP = 8;
const PAD = 12;
const COLS = 3;
const JPEG_Q = 55;

const DOC_ORDER = [
  { field: "studentPhoto", label: "صورة الطالب" },
  { field: "studentIdFront", label: "طالب — وجه" },
  { field: "studentIdBack", label: "طالب — ظهر" },
  { field: "fatherIdFront", label: "أب — وجه" },
  { field: "fatherIdBack", label: "أب — ظهر" },
  { field: "motherIdFront", label: "أم — وجه" },
  { field: "motherIdBack", label: "أم — ظهر" },
  { field: "residenceFront", label: "سكن — وجه" },
  { field: "residenceBack", label: "سكن — ظهر" },
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelSvg(text) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${MAX_W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#123056"/>
  <text x="${MAX_W - 10}" y="20" text-anchor="end" font-family="Segoe UI, Tahoma, Arial" font-size="14" fill="#fff">${escapeXml(text)}</text>
</svg>`);
}

async function makeFastTile(filePath, label) {
  let imageBuf;
  if (filePath && fs.existsSync(filePath)) {
    imageBuf = await sharp(filePath, { failOn: "none", sequentialRead: true })
      .rotate()
      .resize({
        width: MAX_W,
        height: MAX_H,
        fit: "inside",
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .jpeg({ quality: JPEG_Q, chromaSubsampling: "4:2:0" })
      .toBuffer();
  } else {
    imageBuf = await sharp({
      create: { width: MAX_W, height: 120, channels: 3, background: { r: 230, g: 235, b: 240 } },
    })
      .jpeg({ quality: 50 })
      .toBuffer();
  }

  const imgMeta = await sharp(imageBuf).metadata();
  const imgH = imgMeta.height || 120;
  const imgW = imgMeta.width || MAX_W;
  const left = Math.max(0, Math.floor((MAX_W - imgW) / 2));
  const tileH = LABEL_H + 4 + imgH;

  const buf = await sharp({
    create: {
      width: MAX_W,
      height: tileH,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: labelSvg(label), top: 0, left: 0 },
      { input: imageBuf, top: LABEL_H + 4, left },
    ])
    .jpeg({ quality: JPEG_Q, chromaSubsampling: "4:2:0" })
    .toBuffer();

  return { buf, height: tileH, width: MAX_W };
}

function detailsSvg(width, details = {}, fullName = "") {
  const lines = [
    fullName || "—",
    `${details.grade || "—"} / ${details.section || "—"} | ${details.phone || "—"} | ${details.nationalId || "—"}`,
  ];
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="56" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b1f3a"/>
  <text x="${width - 12}" y="22" text-anchor="end" font-family="Segoe UI, Tahoma, Arial" font-size="15" fill="#fff">${escapeXml(lines[0])}</text>
  <text x="${width - 12}" y="44" text-anchor="end" font-family="Segoe UI, Tahoma, Arial" font-size="12" fill="#b8c7dc">${escapeXml(lines[1])}</text>
</svg>`);
}

/**
 * تجميع سريع للمستمسكات (شبكة 3 أعمدة + صور مضغوطة)
 */
async function buildDocumentsCollage(files, { fullName, schoolName, outDir, details = {} }) {
  const tiles = await Promise.all(
    DOC_ORDER.map((doc) => makeFastTile(files?.[doc.field]?.[0]?.path, doc.label))
  );

  const rows = Math.ceil(tiles.length / COLS);
  const rowHeights = [];
  for (let r = 0; r < rows; r += 1) {
    let h = 0;
    for (let c = 0; c < COLS; c += 1) {
      const t = tiles[r * COLS + c];
      if (t) h = Math.max(h, t.height);
    }
    rowHeights.push(h);
  }

  const gridW = COLS * MAX_W + (COLS - 1) * GAP;
  const gridH = rowHeights.reduce((a, b) => a + b, 0) + GAP * Math.max(0, rows - 1);
  const headerH = 56;
  const totalW = gridW + PAD * 2;
  const totalH = headerH + PAD + gridH + PAD;

  const composites = [
    {
      input: detailsSvg(totalW, details, `${fullName || "طالب"} • ${schoolName || "مدرسة قطر"}`),
      top: 0,
      left: 0,
    },
  ];

  let y = headerH + PAD;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const t = tiles[r * COLS + c];
      if (!t) continue;
      composites.push({
        input: t.buf,
        top: y,
        left: PAD + c * (MAX_W + GAP),
      });
    }
    y += rowHeights[r] + GAP;
  }

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
    .jpeg({ quality: JPEG_Q, chromaSubsampling: "4:2:0" })
    .toFile(outPath);

  return outPath;
}

module.exports = { buildDocumentsCollage, DOC_ORDER };
