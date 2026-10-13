const fs = require("fs");
const path = require("path");

const dataRoot = path.join(__dirname, "data");
const registryPath = path.join(dataRoot, "registry.json");
const studentsRoot = path.join(dataRoot, "students");
const collagesRoot = path.join(dataRoot, "collages");

function ensureDirs() {
  for (const dir of [dataRoot, studentsRoot, collagesRoot]) {
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

function buildStudentRecord(body, fullName, collageRelativePath, requestId) {
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
    collage: collageRelativePath || null,
  };
}

/**
 * يحفظ الطالب محلياً ويرتّبه حسب الصف والشعبة
 */
function saveStudentSubmission({ body, fullName, collagePath, requestId }) {
  ensureDirs();

  const grade = body.grade || "غير محدد";
  const section = body.section || "أ";
  const gradeKey = safeSegment(grade);
  const sectionKey = safeSegment(section);

  const gradeDir = path.join(studentsRoot, gradeKey, sectionKey);
  fs.mkdirSync(gradeDir, { recursive: true });

  let collageRelative = null;
  if (collagePath && fs.existsSync(collagePath)) {
    const collageName = `${Date.now()}-${safeSegment(fullName, "student")}.jpg`;
    const dest = path.join(collagesRoot, collageName);
    fs.copyFileSync(collagePath, dest);
    collageRelative = path.join("collages", collageName).replace(/\\/g, "/");
  }

  const record = buildStudentRecord(body, fullName, collageRelative, requestId);
  const fileName = `${record.id}.json`;
  const absoluteJson = path.join(gradeDir, fileName);
  fs.writeFileSync(absoluteJson, JSON.stringify(record, null, 2), "utf8");

  const relativeJson = path
    .join("students", gradeKey, sectionKey, fileName)
    .replace(/\\/g, "/");

  const registry = loadRegistry();
  if (!registry.grades[grade]) registry.grades[grade] = {};
  if (!registry.grades[grade][section]) registry.grades[grade][section] = [];

  registry.grades[grade][section].push({
    id: record.id,
    fullName: record.fullName,
    phone: record.contact.phone,
    nationalId: record.contact.nationalId,
    savedAt: record.savedAt,
    file: relativeJson,
    collage: collageRelative,
  });

  registry.total = (registry.total || 0) + 1;
  saveRegistry(registry);

  return {
    id: record.id,
    grade,
    section,
    file: relativeJson,
    collage: collageRelative,
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

module.exports = {
  dataRoot,
  makeRequestId,
  saveStudentSubmission,
  listStudents,
  getStudentById,
  loadRegistry,
};
