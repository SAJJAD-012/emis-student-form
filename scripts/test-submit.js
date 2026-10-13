const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

const assets = path.join(__dirname, "..", "test-assets");
const form = new FormData();

const fields = {
  studentName: "احمد",
  fatherName: "علي",
  grandfatherName: "محمد",
  greatGrandfatherName: "حسن",
  surname: "العبودي",
  motherName: "فاطمة",
  maternalGrandfather: "كاظم",
  maternalGreatGrandfather: "جاسم",
  birthDate: "2015-03-15",
  birthPlace: "ميسان",
  gender: "ذكر",
  nationality: "العراق",
  motherTongue: "العربية",
  bloodType: "O+",
  phone: "07701234567",
  email: "test@emis.local",
  docType: "البطاقة الوطنية الموحدة",
  issueCountry: "العراق",
  nationalId: "199012345678",
  governorate: "ميسان",
  district: "العمارة",
  neighborhood: "الوحدة",
  locality: "214",
  alley: "12",
  houseNumber: "8",
  landmark: "قرب مدرسة قطر",
  schoolName: "مدرسة قطر",
  grade: "الأول الابتدائي",
  section: "أ",
  studyLanguage: "العربية",
  socialGrant: "لا",
  livingLevel: "الطبقة الوسطى",
  notes: "إرسال تجريبي من اختبار النظام",
};

for (const [k, v] of Object.entries(fields)) form.append(k, v);

const files = {
  studentPhoto: "student-photo.png",
  studentIdFront: "student-front.png",
  studentIdBack: "student-back.png",
  fatherIdFront: "father-front.png",
  fatherIdBack: "blank.png",
  motherIdFront: "mother-front.png",
  motherIdBack: "blank.png",
  residenceFront: "residence-front.png",
  residenceBack: "blank.png",
};

for (const [field, file] of Object.entries(files)) {
  form.append(field, fs.createReadStream(path.join(assets, file)));
}

(async () => {
  console.log("1) status...");
  const status = await fetch("http://localhost:3000/api/status").then((r) => r.json());
  console.log(status);

  console.log("2) refresh chat-id...");
  const chats = await fetch("http://localhost:3000/api/chat-id").then((r) => r.json());
  console.log(chats);

  console.log("3) submit test form...");
  const res = await fetch("http://localhost:3000/api/submit", { method: "POST", body: form });
  const body = await res.json();
  console.log("HTTP", res.status, body);
  process.exit(body.ok ? 0 : 2);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
