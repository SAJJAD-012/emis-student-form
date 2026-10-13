const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dataRoot = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const registryPath = path.join(dataRoot, "registry.json");
const studentsRoot = path.join(dataRoot, "students");
const collagesRoot = path.join(dataRoot, "collages");
const photosRoot = path.join(dataRoot, "photos");

function ensureDirs() {
  for (const dir of [dataRoot, studentsRoot, collagesRoot, photosRoot]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function safeSegment(value, fallback = "غير_محدد") {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_");
  return cleaned || fallback;
}

function loadRegistry() {
  ensureDirs();
  if (!fs.existsSync(registryPath)) {
    return { updatedAt: null, total: 0, grades: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (_) {
    return { updatedAt: null, total: 0, grades: {} };
  }
}

function saveRegistry(registry) {
  ensureDirs();
  registry.updatedAt = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
}

function makeRequestId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `QTR-${yy}${mm}${dd}-${rand}`;
}

async function saveStudentPhoto(photoPath, requestId, fullName) {
  if (!photoPath || !fs.existsSync(photoPath)) return null;
  ensureDirs();
  const fileName = `${requestId}-${safeSegment(fullName, "student")}.jpg`;
  const dest = path.join(photosRoot, fileName);
  await sharp(photoPath, { failOn: "none", limitInputPixels: false })
    .rotate()
    .resize({
      width: 900,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(dest);
  return path.join("photos", fileName).replace(/\\/g, "/");
}

function buildStudentRecord(body, fullName, { collageRelativePath, photoRelativePath, requestId }) {
  const id = requestId || makeRequestId();
  return {
    id,
    savedAt: new Date().toISOString(),
    fullName,
    personal: {
      studentName: body.studentName || "",
      fatherName: body.fatherName || "",
      grandfatherName: body.grandfatherName || "",
      greatGrandfatherName: body.greatGrandfatherName || "",
      surname: body.surname || "",
      motherName: body.motherName || "",
      maternalGrandfather: body.maternalGrandfather || "",
      maternalGreatGrandfather: body.maternalGreatGrandfather || "",
      birthDate: body.birthDate || "",
      birthPlace: body.birthPlace || "",
      gender: body.gender || "",
      nationality: body.nationality || "",
      motherTongue: body.motherTongue || "",
      bloodType: body.bloodType || "",
    },
    contact: {
      phone: body.phone || "",
      email: body.email || "",
      docType: body.docType || "",
      issueCountry: body.issueCountry || "",
      nationalId: body.nationalId || "",
    },
    address: {
      governorate: body.governorate || "",
      district: body.district || "",
      neighborhood: body.neighborhood || "",
      locality: body.locality || "",
      alley: body.alley || "",
      houseNumber: body.houseNumber || "",
      landmark: body.landmark || "",
    },
    academic: {
      schoolName: body.schoolName || "",
      grade: body.grade || "",
      section: body.section || "",
      studyLanguage: body.studyLanguage || "",
      socialGrant: body.socialGrant || "",
      livingLevel: body.livingLevel || "",
      notes: body.notes || "",
    },
    photo: photoRelativePath || null,
    collage: collageRelativePath || null,
  };
}

/**
 * يحفظ الطالب محلياً ويرتّبه حسب الصف والشعبة (مع صورة الطالب)
 */
async function saveStudentSubmission({ body, fullName, collagePath, photoPath, requestId }) {
  ensureDirs();

  const grade = body.grade || "غير محدد";
  const section = body.section || "أ";
  const gradeKey = safeSegment(grade);
  const sectionKey = safeSegment(section);
  const id = requestId || makeRequestId();

  const gradeDir = path.join(studentsRoot, gradeKey, sectionKey);
  fs.mkdirSync(gradeDir, { recursive: true });

  let collageRelative = null;
  if (collagePath && fs.existsSync(collagePath)) {
    const collageName = `${id}-${safeSegment(fullName, "student")}.jpg`;
    const dest = path.join(collagesRoot, collageName);
    fs.copyFileSync(collagePath, dest);
    collageRelative = path.join("collages", collageName).replace(/\\/g, "/");
  }

  const photoRelative = await saveStudentPhoto(photoPath, id, fullName);

  const record = buildStudentRecord(body, fullName, {
    collageRelativePath: collageRelative,
    photoRelativePath: photoRelative,
    requestId: id,
  });
  const fileName = `${record.id}.json`;
  const absoluteJson = path.join(gradeDir, fileName);
  fs.writeFileSync(absoluteJson, JSON.stringify(record, null, 2), "utf8");

  const relativeJson = path
    .join("students", gradeKey, sectionKey, fileName)
    .replace(/\\/g, "/");

  const registry = loadRegistry();
  if (!registry.grades[grade]) registry.grades[grade] = {};
  if (!registry.grades[grade][section]) registry.grades[grade][section] = [];

  registry.grades[grade][section] = registry.grades[grade][section].filter((s) => s.id !== record.id);
  registry.grades[grade][section].push({
    id: record.id,
    fullName: record.fullName,
    phone: record.contact.phone,
    nationalId: record.contact.nationalId,
    birthDate: record.personal.birthDate,
    gender: record.personal.gender,
    savedAt: record.savedAt,
    file: relativeJson,
    photo: photoRelative,
    collage: collageRelative,
  });

  registry.total = Object.values(registry.grades).reduce(
    (sum, secs) => sum + Object.values(secs).reduce((a, arr) => a + arr.length, 0),
    0
  );
  saveRegistry(registry);

  return {
    id: record.id,
    grade,
    section,
    file: relativeJson,
    photo: photoRelative,
    collage: collageRelative,
    syncedPaths: ["registry.json", relativeJson, photoRelative, collageRelative].filter(Boolean),
    record,
  };
}

function listStudents({ grade, section } = {}) {
  const registry = loadRegistry();
  const result = [];

  for (const [g, sections] of Object.entries(registry.grades || {})) {
    if (grade && g !== grade) continue;
    for (const [s, students] of Object.entries(sections || {})) {
      if (section && s !== section) continue;
      for (const stu of students) {
        result.push({ ...stu, grade: g, section: s });
      }
    }
  }

  result.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  return { registry, students: result };
}

function getStudentById(id) {
  const { students } = listStudents();
  const summary = students.find((s) => s.id === id);
  if (!summary?.file) return null;
  const abs = path.join(dataRoot, summary.file);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function unlinkQuiet(abs) {
  try {
    if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {}
}

/**
 * حذف استمارة طالب من السجل والملفات المرتبطة
 */
function deleteStudentById(id) {
  ensureDirs();
  const key = String(id || "").trim();
  if (!key) return { ok: false, error: "رقم الطلب مطلوب" };

  const { students } = listStudents();
  const summary = students.find((s) => s.id === key);
  if (!summary) return { ok: false, error: "الاستمارة غير موجودة" };

  let record = null;
  if (summary.file) {
    const absJson = path.join(dataRoot, summary.file);
    if (fs.existsSync(absJson)) {
      try {
        record = JSON.parse(fs.readFileSync(absJson, "utf8"));
      } catch (_) {}
    }
  }

  const removedPaths = [];
  const candidates = [
    summary.file,
    summary.photo,
    summary.collage,
    record?.photo,
    record?.collage,
  ].filter(Boolean);

  for (const rel of [...new Set(candidates.map((p) => String(p).replace(/\\/g, "/")))]) {
    unlinkQuiet(path.join(dataRoot, rel));
    removedPaths.push(rel);
  }

  const registry = loadRegistry();
  const grade = summary.grade;
  const section = summary.section;
  if (registry.grades?.[grade]?.[section]) {
    registry.grades[grade][section] = registry.grades[grade][section].filter((s) => s.id !== key);
    if (!registry.grades[grade][section].length) delete registry.grades[grade][section];
    if (!Object.keys(registry.grades[grade] || {}).length) delete registry.grades[grade];
  }
  registry.total = Object.values(registry.grades || {}).reduce(
    (sum, secs) => sum + Object.values(secs).reduce((a, arr) => a + arr.length, 0),
    0
  );
  saveRegistry(registry);

  return {
    ok: true,
    id: key,
    fullName: summary.fullName || record?.fullName || "",
    removedPaths,
    syncedPaths: ["registry.json", ...removedPaths],
  };
}

module.exports = {
  dataRoot,
  makeRequestId,
  saveStudentSubmission,
  listStudents,
  getStudentById,
  deleteStudentById,
  loadRegistry,
  ensureDirs,
};
