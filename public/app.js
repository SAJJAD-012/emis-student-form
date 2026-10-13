const form = document.getElementById("emisForm");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const gradeSelect = document.getElementById("gradeSelect");
const sectionSelect = document.getElementById("sectionSelect");

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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  form.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));

  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(":invalid");
    if (firstInvalid) {
      firstInvalid.closest(".field")?.classList.add("invalid");
      firstInvalid.focus();
    }
    showToast("يرجى تعبئة جميع الحقول المطلوبة", "error");
    return;
  }

  const data = new FormData(form);
  submitBtn.disabled = true;
  submitBtn.textContent = "جاري الإرسال...";

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      body: data,
    });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "فشل الإرسال");
    }

    showToast("تم إرسال الاستمارة بنجاح إلى تيليجرام", "success");
    form.reset();
    form.querySelector('[name="governorate"]').value = "ميسان";
    form.querySelector('[name="schoolName"]').value = "مدرسة قطر";
  } catch (err) {
    showToast(err.message || "حدث خطأ أثناء الإرسال", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "إرسال الاستمارة";
  }
});
