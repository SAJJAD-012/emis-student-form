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
const sendBusy = document.getElementById("sendBusy");
const sendSuccess = document.getElementById("sendSuccess");
const requestIdValue = document.getElementById("requestIdValue");
const successOkBtn = document.getElementById("successOkBtn");

let currentStep = 0;
let isSubmitting = false;
let successResolve = null;

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
  if (show) {
    if (sendBusy) sendBusy.hidden = false;
    if (sendSuccess) sendSuccess.hidden = true;
  }
}

function resetFormDefaults() {
  form.reset();
  const gov = form.querySelector('[name="governorate"]');
  const school = form.querySelector('[name="schoolName"]');
  const tongue = form.querySelector('[name="motherTongue"]');
  if (gov) gov.value = "ميسان";
  if (school) school.value = "مدرسة قطر";
  if (tongue) tongue.value = "العربية";
  updateSections();
  document.querySelectorAll(".file-preview").forEach((el) => {
    el.hidden = true;
    el.textContent = "";
  });
  showStep(0);
}

function showSuccessDialog(requestId) {
  return new Promise((resolve) => {
    successResolve = resolve;
    if (sendBusy) sendBusy.hidden = true;
    if (sendSuccess) sendSuccess.hidden = false;
    if (requestIdValue) requestIdValue.textContent = requestId || "—";
    openSendOverlay(true);
  });
}

successOkBtn?.addEventListener("click", () => {
  openSendOverlay(false);
  if (successResolve) {
    successResolve();
    successResolve = null;
  }
});

function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/submit");
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const ratio = e.loaded / e.total;
      // الرفع: 5% → 55%
      onProgress(5 + ratio * 50, "جاري رفع البيانات والصور...");
    };

    xhr.upload.onload = () => onProgress(55, "اكتمل الرفع — بدء معالجة الخادم...");

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

function pollServerProgress(submissionId, onProgress) {
  let stopped = false;
  const timer = setInterval(async () => {
    if (stopped) return;
    try {
      const res = await fetch(`/api/progress/${encodeURIComponent(submissionId)}`);
      const data = await res.json();
      if (data?.percent != null) onProgress(data.percent, data.status || "جاري المعالجة...");
    } catch (_) {}
  }, 250);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
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

  const submissionId = crypto.randomUUID();
  const data = new FormData(form);
  data.append("submissionId", submissionId);

  openSendOverlay(true);
  setSendProgress(3, "التحقق من البيانات...");

  let stopPoll = null;
  try {
    setSendProgress(5, "بدء رفع الملفات...");
    // بعد اكتمال الرفع نتابع نسبة التقدم من الخادم (لا يتوقف عند 55)
    const uploadPromise = uploadWithProgress(data, (p, s) => {
      setSendProgress(p, s);
      if (p >= 55 && !stopPoll) stopPoll = pollServerProgress(submissionId, setSendProgress);
    });
    const json = await uploadPromise;
    if (stopPoll) stopPoll();
    setSendProgress(100, "تم الإرسال بنجاح");
    const requestId = json?.saved?.id || "—";
    await showSuccessDialog(requestId);
    resetFormDefaults();
    showToast(`تم الإرسال — رقم الطلب: ${requestId}`, "success");
  } catch (err) {
    if (stopPoll) stopPoll();
    openSendOverlay(false);
    showToast(err.message || "حدث خطأ أثناء الإرسال", "error");
  } finally {
    if (stopPoll) stopPoll();
    isSubmitting = false;
    submitBtn.disabled = false;
    nextBtn && (nextBtn.disabled = false);
    prevBtn && (prevBtn.disabled = false);
    submitBtn.textContent = "إرسال الاستمارة";
  }
});

showStep(0);
