const form = document.getElementById("emisForm");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const gradeSelect = document.getElementById("gradeSelect");
const sectionSelect = document.getElementById("sectionSelect");
const steps = [...document.querySelectorAll(".form-step")];
const stepDots = [...document.querySelectorAll(".step-dot")];
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const stepLabel = document.getElementById("stepLabel");
const progressFill = document.getElementById("formProgressFill");
const sendOverlay = document.getElementById("sendOverlay");
const sendPercent = document.getElementById("sendPercent");
const sendStatus = document.getElementById("sendStatus");
const sendBar = document.getElementById("sendBar");

let currentStep = 0;
let isSubmitting = false;

const STEP_TITLES = [
  "المعلومات الشخصية",
  "التواصل والوثائق",
  "عنوان السكن",
  "البيانات الدراسية",
  "المستمسكات والإرسال",
];

function updateSections() {
  if (!gradeSelect || !sectionSelect) return;
  const isFourth = gradeSelect.value === "الرابع الابتدائي";
  const current = sectionSelect.value;
  sectionSelect.innerHTML = isFourth
    ? '<option value="أ">أ</option><option value="ب">ب</option>'
    : '<option value="أ">أ</option>';
  if ([...sectionSelect.options].some((o) => o.value === current)) {
    sectionSelect.value = current;
  }
}

gradeSelect?.addEventListener("change", updateSections);
updateSections();

function showToast(message, type = "success") {
  toast.hidden = false;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 4500);
}

function showStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, i) => {
    step.classList.toggle("active", i === currentStep);
    step.classList.toggle("done", i < currentStep);
  });
  stepDots.forEach((dot, i) => {
    dot.classList.toggle("active", i === currentStep);
    dot.classList.toggle("done", i < currentStep);
  });
  if (stepLabel) stepLabel.textContent = `الخطوة ${currentStep + 1} من ${steps.length}: ${STEP_TITLES[currentStep]}`;
  if (progressFill) progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  if (prevBtn) prevBtn.disabled = currentStep === 0;
  if (nextBtn) nextBtn.hidden = currentStep === steps.length - 1;
  if (submitBtn) submitBtn.hidden = currentStep !== steps.length - 1;
  steps[currentStep]?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function validateStep(index) {
  const step = steps[index];
  if (!step) return true;
  const fields = [...step.querySelectorAll("input, select, textarea")].filter(
    (el) => el.willValidate !== false
  );
  let ok = true;
  fields.forEach((el) => {
    el.closest(".field")?.classList.remove("invalid");
    if (!el.checkValidity()) {
      ok = false;
      el.closest(".field")?.classList.add("invalid");
    }
  });
  if (!ok) {
    const first = step.querySelector(":invalid");
    first?.focus();
    showToast("أكمل الحقول المطلوبة في هذه الخطوة", "error");
  }
  return ok;
}

prevBtn?.addEventListener("click", () => showStep(currentStep - 1));
nextBtn?.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  showStep(currentStep + 1);
});

stepDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    const target = Number(dot.dataset.step || 0);
    if (target <= currentStep) return showStep(target);
    for (let i = currentStep; i < target; i += 1) {
      if (!validateStep(i)) return;
    }
    showStep(target);
  });
});

// معاينة الملفات المختارة
document.querySelectorAll('input[type="file"]').forEach((input) => {
  input.addEventListener("change", () => {
    const wrap = input.closest(".field");
    let preview = wrap?.querySelector(".file-preview");
    if (!preview && wrap) {
      preview = document.createElement("div");
      preview.className = "file-preview";
      wrap.appendChild(preview);
    }
    if (!preview) return;
    const file = input.files?.[0];
    if (!file) {
      preview.textContent = "";
      preview.hidden = true;
      return;
    }
    preview.hidden = false;
    preview.textContent = `✓ ${file.name} (${Math.max(1, Math.round(file.size / 1024))} ك.ب)`;
  });
});

function setSendProgress(percent, status) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  if (sendPercent) sendPercent.textContent = `${p}%`;
  if (sendBar) sendBar.style.width = `${p}%`;
  if (sendStatus) sendStatus.textContent = status;
}

function openSendOverlay(show) {
  if (!sendOverlay) return;
  sendOverlay.hidden = !show;
  sendOverlay.setAttribute("aria-hidden", show ? "false" : "true");
}

function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/submit");
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const ratio = e.loaded / e.total;
      // الرفع يمثل حتى 55% من الشريط
      onProgress(8 + ratio * 47, "جاري رفع البيانات والصور...");
    };

    xhr.onload = () => {
      const body = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve(body);
      else reject(new Error(body.error || `فشل الإرسال (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("تعذّر الاتصال بالخادم"));
    xhr.ontimeout = () => reject(new Error("انتهت مهلة الإرسال"));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(formData);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  for (let i = 0; i < steps.length; i += 1) {
    if (!validateStep(i)) {
      showStep(i);
      return;
    }
  }

  isSubmitting = true;
  submitBtn.disabled = true;
  nextBtn && (nextBtn.disabled = true);
  prevBtn && (prevBtn.disabled = true);

  const data = new FormData(form);
  data.append("submissionId", crypto.randomUUID());

  openSendOverlay(true);
  setSendProgress(5, "التحقق من البيانات...");

  // محاكاة مراحل ما بعد الرفع أثناء انتظار الخادم
  let fake = 56;
  const tick = setInterval(() => {
    if (fake < 90) {
      fake += 2;
      const msg =
        fake < 70
          ? "تجميع المستمسكات في صورة واحدة..."
          : fake < 82
            ? "حفظ السجل المحلي..."
            : "إرسال إلى تيليجرام...";
      setSendProgress(fake, msg);
    }
  }, 700);

  try {
    setSendProgress(8, "بدء رفع الملفات...");
    const json = await uploadWithProgress(data, setSendProgress);
    clearInterval(tick);
    setSendProgress(100, "تم الإرسال بنجاح");
    await new Promise((r) => setTimeout(r, 500));
    showToast("تم إرسال الاستمارة مرة واحدة بنجاح إلى تيليجرام", "success");
    form.reset();
    form.querySelector('[name="governorate"]').value = "ميسان";
    form.querySelector('[name="schoolName"]').value = "مدرسة قطر";
    updateSections();
    document.querySelectorAll(".file-preview").forEach((el) => {
      el.hidden = true;
      el.textContent = "";
    });
    showStep(0);
    console.debug("saved", json.saved);
  } catch (err) {
    clearInterval(tick);
    showToast(err.message || "حدث خطأ أثناء الإرسال", "error");
  } finally {
    clearInterval(tick);
    openSendOverlay(false);
    isSubmitting = false;
    submitBtn.disabled = false;
    nextBtn && (nextBtn.disabled = false);
    prevBtn && (prevBtn.disabled = false);
    submitBtn.textContent = "إرسال الاستمارة";
  }
});

showStep(0);
