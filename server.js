require("dotenv").config();
const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { buildDocumentsCollage } = require("./collage");
const { saveStudentSubmission, listStudents, getStudentById, dataRoot, makeRequestId } = require("./storage");

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "qatar-emis-2026";
const ADMIN_COOKIE = "emis_admin";
if (!BOT_TOKEN) {
  console.warn("⚠️  ضع TELEGRAM_BOT_TOKEN في ملف .env");
}

function adminToken() {
  return crypto
    .createHmac("sha256", BOT_TOKEN || "emis-local-secret")
    .update(String(ADMIN_PASSWORD))
    .digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAdmin(req) {
  return parseCookies(req)[ADMIN_COOKIE] === adminToken();
}

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ ok: false, error: "غير مصرح — سجّل دخول الإدارة" });
  }
  return res.redirect("/admin-login.html");
}

const chatStorePath = path.join(__dirname, "telegram-chat.json");

function loadSavedChatId() {
  if (process.env.TELEGRAM_CHAT_ID) return String(process.env.TELEGRAM_CHAT_ID).trim();
  try {
    if (fs.existsSync(chatStorePath)) {
      const data = JSON.parse(fs.readFileSync(chatStorePath, "utf8"));
      if (data?.chatId) return String(data.chatId);
    }
  } catch (_) {}
  return "";
}

function saveChatId(chatId, meta = {}) {
  fs.writeFileSync(
    chatStorePath,
    JSON.stringify({ chatId: String(chatId), ...meta, savedAt: new Date().toISOString() }, null, 2)
  );
}

let activeChatId = loadSavedChatId();

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\u0600-\u06FF-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // حتى 100 ميغابايت للصورة
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("يُسمح بملفات الصور فقط"));
  },
});

const photoFields = [
  { name: "studentPhoto", maxCount: 1 },
  { name: "studentIdFront", maxCount: 1 },
  { name: "studentIdBack", maxCount: 1 },
  { name: "fatherIdFront", maxCount: 1 },
  { name: "fatherIdBack", maxCount: 1 },
  { name: "motherIdFront", maxCount: 1 },
  { name: "motherIdBack", maxCount: 1 },
  { name: "residenceFront", maxCount: 1 },
  { name: "residenceBack", maxCount: 1 },
];

app.use(express.json());

// حماية سجل الطلبة والإعدادات — للإدارة فقط
app.use((req, res, next) => {
  const p = req.path;
  const protectedPaths =
    p === "/students.html" ||
    p === "/setup.html" ||
    p.startsWith("/data-files") ||
    p.startsWith("/api/students") ||
    p.startsWith("/api/chat-id");
  if (protectedPaths) return requireAdmin(req, res, next);
  next();
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "كلمة المرور غير صحيحة" });
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(adminToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`
  );
  res.json({ ok: true, redirect: "/students.html" });
});

app.post("/api/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/data-files", express.static(dataRoot));

async function fetchChatsFromTelegram() {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100`);
  const data = await r.json();
  if (!data.ok) throw new Error(data.description || "فشل جلب التحديثات من تيليجرام");

  const chats = [];
  for (const update of data.result || []) {
    const msg = update.message || update.edited_message || update.channel_post;
    if (msg?.chat) {
      chats.push({
        id: msg.chat.id,
        name: [msg.chat.first_name, msg.chat.last_name, msg.chat.title].filter(Boolean).join(" "),
        username: msg.chat.username || null,
        type: msg.chat.type,
      });
    }
  }
  return [...new Map(chats.map((c) => [c.id, c])).values()];
}

async function resolveChatId() {
  if (activeChatId) return activeChatId;

  const chats = await fetchChatsFromTelegram();
  if (!chats.length) {
    throw new Error(
      "افتح البوت @qatar_emis_bot في تيليجرام وأرسل /start ثم أعد إرسال الاستمارة"
    );
  }

  const chosen = chats[chats.length - 1];
  activeChatId = String(chosen.id);
  saveChatId(activeChatId, { name: chosen.name, username: chosen.username });
  console.log(`✓ تم حفظ Chat ID تلقائياً: ${activeChatId} (${chosen.name || chosen.username || ""})`);
  return activeChatId;
}

async function sendTelegramMessage(text, chatId) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "فشل إرسال الرسالة");
  return data;
}

async function sendTelegramPhoto(filePath, caption, chatId) {
  // إرسال كمستند يحافظ على الجودة الكاملة بدون ضغط/قص تيليجرام للصور
  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) {
    form.append("caption", caption.slice(0, 1024));
    form.append("parse_mode", "HTML");
  }
  form.append("document", fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: "image/jpeg",
  });

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "فشل إرسال المستمسكات");
  return data;
}

function cleanupFiles(files, extraPaths = []) {
  if (files) {
    Object.values(files)
      .flat()
      .forEach((f) => {
        try {
          fs.unlinkSync(f.path);
        } catch (_) {}
      });
  }
  for (const p of extraPaths) {
    try {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch (_) {}
  }
}

function row(label, value) {
  return `  ${label}: <b>${escapeHtml(value || "—")}</b>`;
}

/** تاريخ رقمي واضح بدون قلب كلمات عربية في تيليجرام */
function formatDateNumeric(value) {
  if (!value) return "—";
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatNowBaghdad() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function buildFormattedMessage(b, fullName, requestId) {
  const now = formatNowBaghdad();
  const birth = formatDateNumeric(b.birthDate);

  return `
🏫 <b>مدرسة قطر • نظام EMIS</b>
🎛 إدارة EMIS — الأستاذ سجاد علي
محافظة ميسان

════════════════════════
🧾 <b>استمارة بيانات طالب</b>
🔖 رقم الطلب: <b>${escapeHtml(requestId || "—")}</b>
════════════════════════

🔹 <b>الهوية الكاملة</b>
${row("الاسم الرباعي واللقب", fullName)}
${row("اسم الأم", b.motherName)}
${row("والد الأم", b.maternalGrandfather)}
${row("جد الأم", b.maternalGreatGrandfather)}

🔹 <b>التفاصيل الشخصية</b>
${row("تاريخ الولادة", birth)}
${row("محل الولادة", b.birthPlace)}
${row("الجنس", b.gender)}
${row("الجنسية", b.nationality)}
${row("اللغة الأم", b.motherTongue)}
${row("فئة الدم", b.bloodType)}

🔹 <b>الوثائق والتواصل</b>
${row("رقم الهاتف", b.phone)}
${row("البريد", b.email || "—")}
${row("نوع الوثيقة", b.docType)}
${row("بلد الإصدار", b.issueCountry)}
${row("رقم البطاقة الوطنية", b.nationalId)}

🔹 <b>عنوان السكن</b>
${row("المحافظة", b.governorate)}
${row("القضاء / الناحية", b.district)}
${row("الحي", b.neighborhood)}
${row("المحلة", b.locality)}
${row("الزقاق", b.alley)}
${row("رقم الدار", b.houseNumber)}
${row("أقرب نقطة دالة", b.landmark)}

🔹 <b>البيانات الدراسية</b>
${row("المدرسة", b.schoolName)}
${row("الصف", b.grade)}
${row("الشعبة", b.section)}
${row("لغة الدراسة", b.studyLanguage)}
${row("منحة الرعاية", b.socialGrant)}
${row("المستوى المعيشي", b.livingLevel)}
${row("ملاحظات", b.notes || "لا يوجد")}

════════════════════════
🖼 <i>المستمسكات مرفقة بصورة واحدة مجمّعة بالأسفل</i>
⏰ ${escapeHtml(now)}
`.trim();
}

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    telegramConfigured: Boolean(BOT_TOKEN && activeChatId),
    hasToken: Boolean(BOT_TOKEN),
    hasChatId: Boolean(activeChatId),
    chatId: activeChatId || null,
    bot: "@qatar_emis_bot",
  });
});

app.get("/api/chat-id", async (_req, res) => {
  try {
    const chats = await fetchChatsFromTelegram();
    if (chats.length) {
      const chosen = chats[chats.length - 1];
      activeChatId = String(chosen.id);
      saveChatId(activeChatId, { name: chosen.name, username: chosen.username });
    }
    res.json({ ok: true, chats, activeChatId: activeChatId || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/chat-id", express.json(), (req, res) => {
  const id = String(req.body?.chatId || "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "chatId مطلوب" });
  activeChatId = id;
  saveChatId(id);
  res.json({ ok: true, chatId: id });
});

app.get("/api/students", (req, res) => {
  try {
    const { grade, section } = req.query;
    const data = listStudents({ grade, section });
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/students/:id", (req, res) => {
  try {
    const student = getStudentById(req.params.id);
    if (!student) return res.status(404).json({ ok: false, error: "الطالب غير موجود" });
    res.json({ ok: true, student });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const recentSubmissionIds = new Map();
const progressJobs = new Map();

function setProgress(id, percent, status) {
  const key = String(id || "").trim();
  if (!key) return;
  progressJobs.set(key, {
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    status,
    updatedAt: Date.now(),
  });
}

function releasePendingClaim(id) {
  const key = String(id || "").trim();
  if (!key) return;
  const prev = recentSubmissionIds.get(key);
  if (prev?.pending) recentSubmissionIds.delete(key);
}

function claimSubmissionId(id) {
  const key = String(id || "").trim();
  if (!key) return { ok: true, duplicate: false };
  const prev = recentSubmissionIds.get(key);
  if (prev) return { ok: false, duplicate: true, saved: prev.pending ? null : prev };
  // قفل فوري لمنع الإرسال المزدوج أثناء المعالجة
  recentSubmissionIds.set(key, { pending: true });
  setProgress(key, 56, "تم استلام الملفات...");
  return { ok: true, duplicate: false };
}

function rememberSubmissionId(id, saved) {
  const key = String(id || "").trim();
  if (!key) return;
  recentSubmissionIds.set(key, saved);
  setTimeout(() => {
    recentSubmissionIds.delete(key);
    progressJobs.delete(key);
  }, 15 * 60 * 1000);
}

app.get("/api/progress/:id", (req, res) => {
  const job = progressJobs.get(String(req.params.id || ""));
  res.json({
    ok: true,
    percent: job?.percent ?? 55,
    status: job?.status || "جاري المعالجة على الخادم...",
  });
});

app.post("/api/submit", upload.fields(photoFields), async (req, res) => {
  if (!BOT_TOKEN) {
    cleanupFiles(req.files);
    return res.status(500).json({ ok: false, error: "توكن البوت غير موجود" });
  }

  let collagePath = null;
  const submissionId = req.body?.submissionId;

  try {
    const claim = claimSubmissionId(submissionId);
    if (claim.duplicate) {
      cleanupFiles(req.files);
      return res.json({
        ok: true,
        duplicate: true,
        message: "تم استلام هذا الطلب مسبقاً — لم يُرسل مرة ثانية",
        saved: claim.saved,
      });
    }

    setProgress(submissionId, 58, "تم استلام الملفات...");
    const chatId = await resolveChatId();
    const b = req.body;
    const fullName = [b.studentName, b.fatherName, b.grandfatherName, b.greatGrandfatherName, b.surname]
      .filter(Boolean)
      .join(" ");
    const requestId = makeRequestId();

    // رسالة كاملة + كولاج في نفس الوقت لتوفير الوقت
    setProgress(submissionId, 65, "إرسال البيانات وتجهيز المستمسكات...");
    const message = buildFormattedMessage(b, fullName, requestId);
    const collagePromise = buildDocumentsCollage(req.files, {
      fullName,
      schoolName: b.schoolName || "مدرسة قطر",
      outDir: uploadDir,
      details: b,
    });
    await sendTelegramMessage(message, chatId);
    setProgress(submissionId, 78, "إنهاء صورة المستمسكات...");
    collagePath = await collagePromise;

    setProgress(submissionId, 86, "حفظ السجل...");
    const saved = saveStudentSubmission({
      body: b,
      fullName,
      collagePath,
      requestId,
    });

    setProgress(submissionId, 92, "رفع المستمسكات إلى تيليجرام...");
    await sendTelegramPhoto(
      collagePath,
      `🔖 ${escapeHtml(requestId)}\n🖼 مستمسكات: ${escapeHtml(fullName)} | ${escapeHtml(b.grade || "")} / ${escapeHtml(b.section || "")}`,
      chatId
    );

    setProgress(submissionId, 100, "اكتمل الإرسال");
    rememberSubmissionId(submissionId, {
      id: saved.id,
      grade: saved.grade,
      section: saved.section,
    });

    cleanupFiles(req.files, [collagePath]);
    res.json({
      ok: true,
      message: "تم إرسال البيانات الكاملة والمستمسكات",
      saved: {
        id: saved.id,
        grade: saved.grade,
        section: saved.section,
      },
    });
  } catch (err) {
    cleanupFiles(req.files, [collagePath]);
    console.error(err);
    releasePendingClaim(submissionId);
    setProgress(submissionId, 0, err.message || "فشل الإرسال");
    res.status(500).json({ ok: false, error: err.message || "حدث خطأ أثناء الإرسال" });
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ ok: false, error: "حجم الصورة كبير جداً (الحد الأقصى 100 ميغابايت)" });
    }
  }
  res.status(400).json({ ok: false, error: err.message || "خطأ في الطلب" });
});

app.listen(PORT, () => {
  console.log(`EMIS form running at http://localhost:${PORT}`);
  console.log(`Bot token: ...${BOT_TOKEN.slice(-8)}`);
  if (activeChatId) {
    console.log(`Chat ID جاهز: ${activeChatId}`);
  } else {
    console.warn("أرسل /start إلى @qatar_emis_bot ثم اضغط إرسال في الاستمارة");
  }
});
