const fs = require("fs");
const path = require("path");

function visitorsPath(dataRoot) {
  return path.join(dataRoot, "visitors.json");
}

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
}

function loadVisitors(dataRoot) {
  const file = visitorsPath(dataRoot);
  if (!fs.existsSync(file)) {
    return { total: 0, today: 0, todayDate: todayKey(), updatedAt: null };
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data.todayDate !== todayKey()) {
      data.today = 0;
      data.todayDate = todayKey();
    }
    return {
      total: Number(data.total) || 0,
      today: Number(data.today) || 0,
      todayDate: data.todayDate || todayKey(),
      updatedAt: data.updatedAt || null,
    };
  } catch (_) {
    return { total: 0, today: 0, todayDate: todayKey(), updatedAt: null };
  }
}

function saveVisitors(dataRoot, data) {
  if (!fs.existsSync(dataRoot)) fs.mkdirSync(dataRoot, { recursive: true });
  fs.writeFileSync(visitorsPath(dataRoot), JSON.stringify(data, null, 2), "utf8");
}

/**
 * يسجّل زيارة جديدة إن لم تُحسب اليوم لهذا الزائر (عبر كوكي)
 */
function recordVisit(dataRoot, alreadyCountedToday) {
  const stats = loadVisitors(dataRoot);
  let counted = false;
  if (!alreadyCountedToday) {
    stats.total += 1;
    stats.today += 1;
    stats.todayDate = todayKey();
    stats.updatedAt = new Date().toISOString();
    saveVisitors(dataRoot, stats);
    counted = true;
  }
  return { ...stats, counted };
}

function getVisitorStats(dataRoot) {
  return loadVisitors(dataRoot);
}

module.exports = {
  recordVisit,
  getVisitorStats,
  visitorsPath,
};
