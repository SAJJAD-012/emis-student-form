const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

// نسخ منطق الاستخراج من public/ocr.js بشكل مبسط للاختبار
function valueAfterLabel(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n|\\s)(?:${label})\\s*[:：\\-–]?\\s*([^\\n]+)`, "im");
    const m = text.match(re);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim();
  }
  return "";
}

(async () => {
  const img = path.join(__dirname, "..", "test-assets", "student-front.png");
  console.log("OCR on", img);
  const result = await Tesseract.recognize(img, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") process.stdout.write(`\rprogress ${Math.round((m.progress || 0) * 100)}%   `);
    },
  });
  const text = result.data.text;
  console.log("\n--- OCR TEXT ---\n" + text + "\n---------------");

  const data = {
    name: valueAfterLabel(text, ["Name", "Full\\s*Name"]),
    father: valueAfterLabel(text, ["Father(?:'?s)?\\s*Name", "Father\\s*Name"]),
    mother: valueAfterLabel(text, ["Mother(?:'?s)?\\s*Name", "Mother\\s*Name"]),
    surname: valueAfterLabel(text, ["Surname"]),
    dob: (text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/) || []).slice(1).join("/"),
    nationalId: (text.match(/National\s*ID[^\d]{0,12}(\d{10,14})/i) || [])[1],
    blood: (text.match(/Blood\s*[:：]?\s*([ABO]{1,2}\s*[+-])/i) || [])[1],
  };
  console.log("Parsed:", data);

  const ok = data.name && data.nationalId && data.dob;
  console.log(ok ? "PASS image OCR autofill signals" : "FAIL weak OCR extraction");
  process.exit(ok ? 0 : 3);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
