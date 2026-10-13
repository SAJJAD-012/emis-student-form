const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const dir = path.join(__dirname, "..", "test-assets");
fs.mkdirSync(dir, { recursive: true });

function saveCard(filename, lines) {
  const canvas = createCanvas(1000, 620);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1000, 620);
  ctx.fillStyle = "#0b1f3a";
  ctx.fillRect(0, 0, 1000, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("Iraqi National ID - Test Card", 40, 50);
  ctx.fillStyle = "#111111";
  ctx.font = "28px sans-serif";
  let y = 140;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 48;
  }
  const out = path.join(dir, filename);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("wrote", out);
}

saveCard("student-front.png", [
  "Name: احمد علي محمد حسن",
  "Surname: العبودي",
  "Father Name: علي",
  "Mother Name: فاطمة كاظم جاسم",
  "DoB: 15/03/2015",
  "Sex: M",
  "Place of Birth: ميسان",
  "Blood: O+",
  "National ID: 199012345678",
]);

saveCard("student-back.png", ["National ID: 199012345678", "Blood: O+"]);
saveCard("father-front.png", ["Name: علي محمد حسن كريم", "Surname: العبودي", "Sex: M"]);
saveCard("mother-front.png", ["Name: فاطمة كاظم جاسم عبيد", "Father Name: كاظم جاسم", "Sex: F"]);
saveCard("residence-front.png", [
  "القضاء: العمارة",
  "الحي: الوحدة",
  "المحلة: 214",
  "الزقاق: 12",
  "رقم الدار: 8",
  "نقطة دالة: قرب مدرسة قطر",
]);
saveCard("blank.png", ["TEST PHOTO"]);
saveCard("student-photo.png", ["Student Photo"]);
