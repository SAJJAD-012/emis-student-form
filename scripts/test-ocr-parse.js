const sample = `
البطاقة الوطنية الموحدة - جمهورية العراق
الاسم: احمد علي محمد حسن
اللقب: العبودي
اسم الاب: علي
اسم الام: فاطمة كاظم جاسم
تاريخ الميلاد: 15/03/2015
الجنس: ذكر
محل الولادة: ميسان
فصيلة الدم: O+
رقم البطاقة: 199012345678
`;

function cleanValue(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function valueAfterLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n|\\s)(?:${label})\\s*[:：\\-–]?\\s*([^\\n]+)`, "im");
    const m = text.match(re);
    if (m?.[1]) return cleanValue(m[1]);
  }
  return "";
}

function splitName(full) {
  const parts = cleanValue(full).split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", second: parts[1] || "", third: parts[2] || "", fourth: parts[3] || "" };
}

const fullName = valueAfterLabel(sample, ["الاسم"]);
const names = splitName(fullName);
const motherRaw = valueAfterLabel(sample, ["اسم\\s*(?:الأم|الام|ام)"]);
const result = {
  studentName: names.first,
  fatherName: valueAfterLabel(sample, ["اسم\\s*(?:الأب|الاب|اب)"]) || names.second,
  grandfatherName: names.third,
  greatGrandfatherName: names.fourth,
  surname: valueAfterLabel(sample, ["اللقب"]),
  motherName: splitName(motherRaw).first,
  birthDate: (() => {
    const m = sample.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
  })(),
  birthPlace: valueAfterLabel(sample, ["محل\\s*الولادة"]),
  gender: /ذكر/.test(sample) ? "ذكر" : "",
  bloodType: (sample.match(/فصيلة\s*الدم\s*[:：]?\s*([ABO]{1,2}\s*[+-])/i) || [])[1]?.replace(/\s/g, ""),
  nationalId: (sample.match(/رقم\s*البطاقة[^\d]{0,12}(\d{10,14})/) || [])[1],
};

console.log(JSON.stringify(result, null, 2));
const required = ["studentName", "fatherName", "surname", "motherName", "birthDate", "nationalId", "bloodType"];
const missing = required.filter((k) => !result[k]);
if (missing.length) {
  console.error("FAIL missing:", missing.join(", "));
  process.exit(1);
}
console.log("PASS Arabic OCR parse");
