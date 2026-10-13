/**
 * نسخة دائمة للسجل على GitHub (لأن قرص Render المجاني يُمسح مع كل نشر)
 */
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const OWNER = process.env.GITHUB_DATA_OWNER || "SAJJAD-012";
const REPO = process.env.GITHUB_DATA_REPO || "emis-student-data";
const BRANCH = process.env.GITHUB_DATA_BRANCH || "main";
const TOKEN = process.env.GITHUB_DATA_TOKEN || process.env.GITHUB_TOKEN || "";

function enabled() {
  return Boolean(TOKEN);
}

function apiHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "emis-student-form",
  };
}

async function gh(pathname, options = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: { ...apiHeaders(), ...(options.headers || {}) },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || text || res.statusText;
    const err = new Error(`GitHub ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function toPosix(p) {
  return String(p).replace(/\\/g, "/");
}

function encodeRepoPath(relPath) {
  return toPosix(relPath)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function walkFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) out.push(...walkFiles(abs, base));
    else out.push({ abs, rel: toPosix(path.relative(base, abs)) });
  }
  return out;
}

async function getFileSha(relPath) {
  try {
    const data = await gh(
      `/repos/${OWNER}/${REPO}/contents/${encodeRepoPath(relPath)}?ref=${BRANCH}`
    );
    return data?.sha || null;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function putFile(relPath, contentBuffer, message) {
  const sha = await getFileSha(relPath);
  const body = {
    message,
    content: Buffer.from(contentBuffer).toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  await gh(`/repos/${OWNER}/${REPO}/contents/${encodeRepoPath(relPath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function ensureRepoReady() {
  if (!enabled()) return false;
  try {
    await gh(`/repos/${OWNER}/${REPO}`);
    return true;
  } catch (err) {
    console.warn("⚠️  مستودع النسخ الاحتياطي غير متاح:", err.message);
    return false;
  }
}

/**
 * يرفع ملفات محددة بعد حفظ طالب
 */
async function syncStudentFiles(dataRoot, relativePaths, requestId) {
  if (!enabled()) return { ok: false, skipped: true };
  const paths = [...new Set(relativePaths.filter(Boolean).map(toPosix))];
  for (const rel of paths) {
    const abs = path.join(dataRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const buf = fs.readFileSync(abs);
    // حد GitHub Contents API ~100MB لكن نتجنب الملفات الضخمة جداً
    if (buf.length > 40 * 1024 * 1024) {
      console.warn(`تخطّي ملف كبير للنسخ: ${rel}`);
      continue;
    }
    await putFile(rel, buf, `EMIS sync ${requestId || ""} — ${rel}`);
  }
  return { ok: true, count: paths.length };
}

/**
 * يسترجع كل ملفات المستودع إلى مجلد البيانات المحلي عند الإقلاع
 */
async function restoreFromGitHub(dataRoot) {
  if (!enabled()) {
    console.log("ℹ️  النسخ الاحتياطي على GitHub غير مفعّل (لا يوجد GITHUB_DATA_TOKEN)");
    return { ok: false, skipped: true };
  }
  if (!(await ensureRepoReady())) return { ok: false };

  let tree;
  try {
    const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const commitSha = ref.object.sha;
    const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${commitSha}`);
    tree = await gh(`/repos/${OWNER}/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
  } catch (err) {
    if (err.status === 409 || /Git Repository is empty/i.test(err.message)) {
      console.log("ℹ️  مستودع النسخ الاحتياطي فارغ — سيُملأ مع أول طالب");
      return { ok: true, restored: 0 };
    }
    throw err;
  }

  const blobs = (tree.tree || []).filter((t) => t.type === "blob");
  let restored = 0;
  for (const item of blobs) {
    const rel = item.path;
    const abs = path.join(dataRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const file = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeRepoPath(rel)}?ref=${BRANCH}`);
    if (!file?.content) continue;
    const buf = Buffer.from(file.content, file.encoding === "base64" ? "base64" : "utf8");
    fs.writeFileSync(abs, buf);
    restored += 1;
  }
  console.log(`✓ استرجاع ${restored} ملف من GitHub → ${dataRoot}`);
  return { ok: true, restored };
}

module.exports = {
  enabled,
  restoreFromGitHub,
  syncStudentFiles,
  walkFiles,
};
