/* ============================================================
   AutoCare AI — Frontend Logic
   Vanilla JS · No framework
   ============================================================ */

const API_BASE =
  window.location.protocol === "file:"
    ? "http://127.0.0.1:8000"
    : window.location.origin;

/* ---------- helpers ---------- */

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  localStorage.setItem("access_token", token);
}

function clearToken() {
  localStorage.removeItem("access_token");
}

function authHeaders(extra = {}, requireAuth = true) {
  const headers = { ...extra };
  if (requireAuth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function apiFetch(path, options = {}) {
  const { requireAuth = true, ...rest } = options;
  const response = await fetch(API_BASE + path, {
    ...rest,
    headers: authHeaders(rest.headers || {}, requireAuth)
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!response.ok) {
    const message =
      payload?.detail || payload?.message ||
      "Request failed (" + response.status + ")";
    throw new Error(message);
  }
  return payload;
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* ---------- toasts ---------- */

function toast(message, type = "info") {
  const el = qs("#toast");
  if (!el) return;
  el.className = "toast toast-" + type;
  el.textContent = message;
  el.classList.remove("hidden");
  el.classList.remove("removing");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    el.classList.add("removing");
    setTimeout(() => el.classList.add("hidden"), 320);
  }, 3200);
}

/* ---------- status ---------- */

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error-msg", "success-msg");
  if (isError) element.classList.add("error-msg");
  else if (message) element.classList.add("success-msg");
}

/* ---------- button loading spinner ---------- */

function setBtnLoading(btn, loading) {
  if (!btn) return;
  const spinner = btn.querySelector(".spinner");
  const label = btn.querySelector(".btn-label");
  if (!spinner) return;
  spinner.classList.toggle("hidden", !loading);
  if (label) label.style.opacity = loading ? "0.6" : "1";
  btn.disabled = loading;
}

/* ---------- auth redirect ---------- */

function redirectIfLoggedIn() {
  const hasToken = !!getToken();
  const page = window.location.pathname.split("/").pop();
  if (hasToken && page === "login.html") {
    window.location.href = "dashboard.html";
  }
  if (!hasToken && page === "dashboard.html") {
    window.location.href = "login.html";
  }
}

/* ---------- state ---------- */

let carsCache = [];
let servicesCache = [];
let predictionsCache = [];

/* ============================================================
   AUTH PAGE
   ============================================================ */

function initAuthPage() {
  const loginForm = qs("#loginForm");
  const registerForm = qs("#registerForm");
  const statusEl = qs("#authStatus");

  /* tabs */
  const tabLogin = qs("#tabLogin");
  const tabRegister = qs("#tabRegister");
  [tabLogin, tabRegister].forEach((tab) => {
    if (!tab) return;
    tab.addEventListener("click", () => {
      const isLogin = tab === tabLogin;
      tabLogin.classList.toggle("active", isLogin);
      tabRegister.classList.toggle("active", !isLogin);
      loginForm.classList.toggle("hidden", !isLogin);
      registerForm.classList.toggle("hidden", isLogin);
      setStatus(statusEl, "");
    });
  });

  /* password visibility toggles */
  qsa(".eye-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = qs("#" + btn.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  /* password strength meter */
  const pwInput = qs("#registerPassword");
  const strengthFill = qs("#strengthFill");
  const strengthLabel = qs("#strengthLabel");
  const strengthMeter = qs(".strength-meter");
  if (pwInput && strengthFill && strengthLabel && strengthMeter) {
    const level = (val) => {
      let score = 0;
      if (val.length >= 8) score++;
      if (val.length >= 12) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;
      return score;
    };
    const colors = ["#ef4444", "#f59e0b", "#f59e0b", "#22c55e", "#22c55e", "#10b981"];
    const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
    pwInput.addEventListener("input", () => {
      const val = pwInput.value;
      if (!val) {
        strengthMeter.classList.add("hidden");
        return;
      }
      strengthMeter.classList.remove("hidden");
      const score = level(val);
      strengthFill.style.width = (Math.min(score, 5) / 5) * 100 + "%";
      strengthFill.style.background = colors[Math.min(score, 5)];
      strengthLabel.textContent = labels[score];
    });
  }

  /* LOGIN */
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const username = qs("#username").value.trim();
      const password = qs("#password").value;
      if (!username || !password) {
        setStatus(statusEl, "Username and password are required.", true);
        return;
      }
      try {
        setBtnLoading(btn, true);
        setStatus(statusEl, "");
        const result = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
          requireAuth: false
        });
        setToken(result.access_token);
        toast("Welcome back, " + username + "!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (error) {
        setStatus(statusEl, error.message, true);
      } finally {
        setBtnLoading(btn, false);
      }
    });
  }

  /* REGISTER */
  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const username = qs("#registerUsername").value.trim();
      const password = qs("#registerPassword").value;
      const confirm = qs("#registerConfirm").value;
      if (!username || !password) {
        setStatus(statusEl, "All fields are required.", true);
        return;
      }
      if (password !== confirm) {
        setStatus(statusEl, "Passwords do not match.", true);
        return;
      }
      try {
        setBtnLoading(btn, true);
        setStatus(statusEl, "");
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, password }),
          requireAuth: false
        });
        setStatus(statusEl, "Account created! Redirecting to sign in…");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1300);
      } catch (error) {
        setStatus(statusEl, error.message, true);
      } finally {
        setBtnLoading(btn, false);
      }
    });
  }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

/* ---------- rendering helpers ---------- */

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emptyState(icon, text) {
  return `
    <div class="empty-state">
      ${icon}
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function skeletonCards(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += '<div class="skeleton-card"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div>';
  }
  return html;
}

function statusBadge(status) {
  const cls = "badge-" + String(status).toLowerCase().replace(/\s+/g, "-");
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function riskBadge(risk) {
  const cls = "badge-risk-" + String(risk).toLowerCase();
  return `<span class="badge ${cls}">${escapeHtml(risk)}</span>`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatKm(n) {
  return Number(n || 0).toLocaleString();
}

function carInitials(car) {
  return ((car.brand || "?").charAt(0) + (car.model || "?").charAt(0)).toUpperCase();
}

/* ---------- stats ---------- */

function updateStats() {
  const elCars = qs("#statCars");
  const elServices = qs("#statServices");
  const elAtRisk = qs("#statAtRisk");
  const elPredictions = qs("#statPredictions");

  if (elCars) {
    elCars.textContent = carsCache.length;
  }
  if (elServices) {
    const active = servicesCache.filter(
      (s) => !["Completed", "Cancelled"].includes(s.status)
    ).length;
    elServices.textContent = active;
  }
  if (elAtRisk) {
    const atRisk = carsCache.filter((c) => {
      const lastPred = predictionsCache
        .filter((p) => p.car_id === c.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return lastPred && lastPred.risk_level === "HIGH";
    }).length;
    elAtRisk.textContent = atRisk;
  }
  if (elPredictions) {
    elPredictions.textContent = predictionsCache.length;
  }
}

/* ---------- car select options ---------- */

function fillCarSelects() {
  qsa("#serviceCar, #predictCar").forEach((sel) => {
    const current = sel.value;
    sel.innerHTML = '<option value="">Choose a car…</option>';
    carsCache.forEach((car) => {
      const opt = document.createElement("option");
      opt.value = car.id;
      opt.textContent = car.brand + " " + car.model + " (" + car.year + ")";
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
}

/* ---------- cars ---------- */

function renderCars() {
  const list = qs("#carsList");
  if (!list) return;

  if (carsCache.length === 0) {
    list.innerHTML = emptyState(
      '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
      "No cars yet. Click “Add car” to get started!"
    );
    updateStats();
    return;
  }

  list.innerHTML = carsCache
    .map((car) => {
      const lastPred = predictionsCache
        .filter((p) => p.car_id === car.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return `
        <div class="car-card pop-in" data-id="${car.id}">
          <div class="car-card-left">
            <div class="car-avatar">${escapeHtml(carInitials(car))}</div>
            <div class="car-info">
              <p class="car-name">${escapeHtml(car.brand + " " + car.model)}</p>
              <div class="car-meta">
                <span title="Year">📅 ${car.year}</span>
                <span title="Fuel">⛽ ${escapeHtml(car.fuel_type || "—")}</span>
                <span title="Driven">🛣️ ${formatKm(car.km_driven)} km</span>
                <span title="Last service">🔧 ${formatKm(car.last_service_km)} km</span>
                ${lastPred
                  ? `<span title="Latest AI risk" class="badge badge-risk-${lastPred.risk_level.toLowerCase()}">${escapeHtml(lastPred.risk_level)} risk</span>`
                  : ""}
              </div>
            </div>
          </div>
          <div class="car-actions">
            <button class="btn btn-ghost btn-sm edit-car-btn" data-id="${car.id}">Edit</button>
            <button class="btn btn-danger btn-sm del-car-btn" data-id="${car.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  updateStats();
}

async function loadCars() {
  const list = qs("#carsList");
  if (!list) return;
  list.innerHTML = skeletonCards(2);

  try {
    const cars = await apiFetch("/cars/");
    carsCache = cars || [];
    fillCarSelects();
    renderCars();
  } catch (error) {
    list.innerHTML = "";
    setStatus(qs("#carsStatus"), error.message, true);
  }
}

/* ---------- services ---------- */

async function loadServices() {
  const list = qs("#servicesList");
  if (!list) return;
  list.innerHTML = skeletonCards(2);

  try {
    const services = await apiFetch("/services/");
    servicesCache = services || [];

    // merge car info for display
    const serviceCarMap = {};
    carsCache.forEach((c) => { serviceCarMap[c.id] = c; });
    servicesCache.forEach((s) => { s._car = serviceCarMap[s.car_id]; });

    renderServices();
  } catch (error) {
    list.innerHTML = "";
    setStatus(qs("#servicesStatus"), error.message, true);
  }
}

function renderServices() {
  const list = qs("#servicesList");
  const filter = qs("#serviceSearch")?.value.toLowerCase().trim() || "";
  const filtered = servicesCache.filter((s) => {
    if (!filter) return true;
    return (
      (s.service_type || "").toLowerCase().includes(filter) ||
      (s.status || "").toLowerCase().includes(filter) ||
      (s._car && (s._car.brand + " " + s._car.model).toLowerCase().includes(filter))
    );
  });

  if (filtered.length === 0) {
    list.innerHTML = emptyState(
      '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      "No services matched your search."
    );
    return;
  }

  list.innerHTML = filtered
    .map((svc) => {
      const car = svc._car
        ? svc._car.brand + " " + svc._car.model
        : "Car #" + svc.car_id;
      return `
        <div class="svc-card pop-in" data-id="${svc.id}">
          <div class="svc-card-left">
            <p class="svc-card-title">${escapeHtml(svc.service_type)}</p>
            <div class="svc-card-meta">
              <span>🚗 ${escapeHtml(car)}</span>
              <span>📅 ${escapeHtml(formatDate(svc.service_date))}</span>
              <span>💰 $${Number(svc.cost || 0).toFixed(2)}</span>
            </div>
            ${svc.mechanic_notes ? `<p class="pred-rec">💬 ${escapeHtml(svc.mechanic_notes)}</p>` : ""}
          </div>
          <div class="svc-card-right">
            ${statusBadge(svc.status)}
            <select class="status-select" data-id="${svc.id}" aria-label="Update status">
              ${["Booked", "In Progress", "Completed", "Cancelled"]
                .map((opt) =>
                  `<option value="${opt}"${svc.status === opt ? " selected" : ""}>${opt}</option>`
                )
                .join("")}
            </select>
            <button class="btn btn-ghost btn-sm update-svc-btn" data-id="${svc.id}">Update</button>
          </div>
        </div>
      `;
    })
    .join("");

  updateStats();
}

/* ---------- predictions ---------- */

async function loadPredictions() {
  const list = qs("#predictionsList");
  if (!list) return;
  list.innerHTML = skeletonCards(2);

  try {
    const all = [];
    for (const car of carsCache) {
      try {
        const preds = await apiFetch("/prediction/history/" + car.id);
        if (preds) {
          preds.forEach((p) => {
            p._car = car.brand + " " + car.model;
          });
          all.push(...preds);
        }
      } catch {
        // car without predictions — skip
      }
    }
    predictionsCache = all.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    // Car cards show risk badges, so refresh them with fresh predictions.
    renderCars();

    if (predictionsCache.length === 0) {
      list.innerHTML = emptyState(
        '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8h8M8 12h8M8 16h5"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>',
        "No AI assessments yet. Run one above!"
      );
      updateStats();
      return;
    }

    list.innerHTML = predictionsCache
      .map((p) => {
        return `
          <div class="pred-card pop-in">
            <div class="pred-card-header">
              <p class="pred-card-title">🚗 ${escapeHtml(p._car || "Car #" + p.car_id)}</p>
              <small class="muted">${escapeHtml(formatDate(p.created_at))}</small>
            </div>
            <div class="pred-card-body">
              ${riskBadge(p.risk_level)}
              <span class="badge ${p.prediction === "Service Required" ? "badge-risk-high" : "badge-risk-low"}">${escapeHtml(p.prediction)}</span>
              <span class="muted">Probability ${(Number(p.probability) * 100).toFixed(1)}%</span>
            </div>
            <p class="pred-rec"><strong>Recommended:</strong> ${escapeHtml(
              Array.isArray(p.recommended_service)
                ? p.recommended_service.join(", ")
                : p.recommended_service
            )}</p>
          </div>
        `;
      })
      .join("");

    updateStats();
  } catch (error) {
    list.innerHTML = "";
    setStatus(qs("#predictionsStatus"), error.message, true);
  }
}

/* ---------- prediction result ---------- */

function renderPredictionResult(result) {
  const el = qs("#predictionResult");
  if (!el) return;
  const risk = String(result.risk_level || "LOW").toLowerCase();
  const pct = Math.min((Number(result.probability) || 0) * 100, 100);

  el.innerHTML = `
    <div class="prediction-result-card risk-${risk}">
      <p class="result-car">${escapeHtml(result.car || "Your car")}</p>
      <p class="result-verdict">${escapeHtml(result.prediction)}</p>
      <div class="result-gauge">
        <div class="result-gauge-fill" style="width:0%"></div>
      </div>
      <p class="result-meta">
        Risk level: <strong>${escapeHtml(result.risk_level)}</strong> ·
        Probability: <strong>${pct.toFixed(1)}%</strong>
      </p>
      ${Array.isArray(result.risk_factors) && result.risk_factors.length
        ? `<p class="result-recs"><strong>Why:</strong> ${escapeHtml(result.risk_factors.join(" · "))}</p>`
        : ""}
      ${result.probability_note
        ? `<p class="result-note">${escapeHtml(result.probability_note)}</p>`
        : ""}
      <p class="result-recs">
        <strong>Recommended:</strong>
        ${escapeHtml(
          Array.isArray(result.recommended_service)
            ? result.recommended_service.join(", ")
            : result.recommended_service
        )}
      </p>
    </div>
  `;

  el.classList.remove("hidden");
  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = el.querySelector(".result-gauge-fill");
      if (fill) fill.style.width = pct + "%";
    }, 50);
  });
}

function hidePredictionResult() {
  const el = qs("#predictionResult");
  if (el) el.classList.add("hidden");
}

/* ---------- modal helpers ---------- */

function openModal(id) {
  const m = qs(id);
  if (m) m.classList.remove("hidden");
  const input = m.querySelector("input:not([type='hidden']), select");
  if (input) setTimeout(() => input.focus(), 60);
}

function closeModal(id) {
  const m = qs(id);
  if (m) m.classList.add("hidden");
}

/* ---------- car form modal ---------- */

function popCarForm(car) {
  const form = qs("#carForm");
  const title = qs("#carFormTitle");
  const submitBtn = qs("#carFormSubmit");

  if (car) {
    title.textContent = "Edit car";
    submitBtn.textContent = "Save changes";
    qs("#carBrand").value = car.brand;
    qs("#carModel").value = car.model;
    qs("#carYear").value = car.year;
    qs("#carKm").value = car.km_driven;
    qs("#carFuel").value = car.fuel_type || "Petrol";
    qs("#carLastServiceKm").value = car.last_service_km || 0;
    form.dataset.editId = car.id;
  } else {
    title.textContent = "Add a new car";
    submitBtn.textContent = "Save car";
    form.reset();
    delete form.dataset.editId;
  }
  openModal("#carModal");
}

function hideCarForm() {
  closeModal("#carModal");
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  redirectIfLoggedIn();

  const isAuthPage = !!qs("#loginForm") || !!qs("#registerForm");
  if (isAuthPage) {
    initAuthPage();
    return;
  }

  const dashboardApp = qs("#dashboardApp");
  if (!dashboardApp) return;

  /* ---------- topbar ---------- */
  const logoutBtn = qs("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearToken();
      window.location.href = "login.html";
    });
  }

  const welcome = qs("#welcomeUser");
  if (welcome) {
    welcome.textContent = "Hi there 👋";
  }

  /* ---------- initial load ---------- */
  loadCars().then(() => {
    loadServices();
    loadPredictions();
  });

  /* ---------- car modal open/close ---------- */
  const showCarFormBtn = qs("#showCarFormBtn");
  if (showCarFormBtn) {
    showCarFormBtn.addEventListener("click", () => popCarForm(null));
  }
  [qs("#closeCarModal"), qs("#cancelCarFormBtn")].forEach((b) => {
    if (b) b.addEventListener("click", hideCarForm);
  });

  /* car form submit */
  const carForm = qs("#carForm");
  if (carForm) {
    carForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const editId = carForm.dataset.editId;
      const btn = carForm.querySelector('button[type="submit"]');

      const payload = {
        brand: qs("#carBrand").value.trim(),
        model: qs("#carModel").value.trim(),
        year: parseInt(qs("#carYear").value, 10),
        km_driven: parseInt(qs("#carKm").value, 10),
        fuel_type: qs("#carFuel").value,
        last_service_km: parseInt(qs("#carLastServiceKm").value, 10) || 0
      };

      try {
        setBtnLoading(btn, true);
        if (editId) {
          await apiFetch("/cars/" + editId, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
        } else {
          await apiFetch("/cars/", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }

        hideCarForm();
        await loadCars().then(() => loadServices());
        toast(editId ? "Car updated." : "Car added!", "success");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        setBtnLoading(btn, false);
      }
    });
  }

  /* car edit/delete delegation */
  const carsList = qs("#carsList");
  if (carsList) {
    carsList.addEventListener("click", async (event) => {
      const btn = event.target.closest(".edit-car-btn, .del-car-btn");
      if (!btn) return;
      const id = parseInt(btn.dataset.id, 10);
      const car = carsCache.find((c) => c.id === id);

      if (btn.classList.contains("edit-car-btn") && car) {
        popCarForm(car);
      }

      if (btn.classList.contains("del-car-btn")) {
        if (!confirm("Delete this car and all its services & predictions?")) return;
        try {
          await apiFetch("/cars/" + id, { method: "DELETE" });
          await loadCars().then(() => {
            loadServices();
            loadPredictions();
          });
          toast("Car deleted.", "success");
        } catch (error) {
          toast(error.message, "error");
        }
      }
    });
  }

  /* ---------- service modal ---------- */
  const bookServiceBtn = qs("#bookServiceBtn");
  if (bookServiceBtn) {
    bookServiceBtn.addEventListener("click", () => openModal("#serviceModal"));
  }
  [qs("#closeServiceModal"), qs("#cancelServiceBtn")].forEach((b) => {
    if (b) b.addEventListener("click", () => closeModal("#serviceModal"));
  });

  const serviceForm = qs("#serviceForm");
  if (serviceForm) {
    serviceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = serviceForm.querySelector('button[type="submit"]');
      const carId = parseInt(qs("#serviceCar").value, 10);

      if (!carId) {
        toast("Please select a car.", "error");
        return;
      }

      const payload = {
        car_id: carId,
        service_type: qs("#serviceType").value.trim(),
        cost: parseFloat(qs("#serviceCost").value) || 0
      };

      try {
        setBtnLoading(btn, true);
        await apiFetch("/services/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        closeModal("#serviceModal");
        serviceForm.reset();
        await loadServices();
        toast("Service booked successfully!", "success");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        setBtnLoading(btn, false);
      }
    });
  }

  /* ---------- service search ---------- */
  const serviceSearch = qs("#serviceSearch");
  if (serviceSearch) {
    serviceSearch.addEventListener("input", renderServices);
  }

  /* service update delegation */
  const servicesList = qs("#servicesList");
  if (servicesList) {
    servicesList.addEventListener("click", async (event) => {
      if (!event.target.closest(".update-svc-btn")) return;
      const btn = event.target.closest(".update-svc-btn");
      const id = parseInt(btn.dataset.id, 10);
      const select = qs(`.status-select[data-id="${id}"]`, servicesList);

      try {
        btn.disabled = true;
        await apiFetch("/services/" + id, {
          method: "PUT",
          body: JSON.stringify({
            status: select.value,
            mechanic_notes: null
          })
        });
        await loadServices();
        toast("Service status updated.", "success");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- prediction ---------- */
  const predictionForm = qs("#predictionForm");
  if (predictionForm) {
    predictionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = predictionForm.querySelector('button[type="submit"]');
      const statusEl = qs("#predictionStatus");
      const carId = parseInt(qs("#predictCar").value, 10);

      if (!carId) {
        setStatus(statusEl, "Please select a car.", true);
        return;
      }

      const payload = {
        car_id: carId,
        months_since_service: parseInt(qs("#monthsSinceService").value, 10)
      };

      try {
        setBtnLoading(btn, true);
        setStatus(statusEl, "");
        hidePredictionResult();
        const result = await apiFetch("/prediction/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        renderPredictionResult(result);
        await loadPredictions();
        toast("AI assessment complete!", "info");
      } catch (error) {
        setStatus(statusEl, error.message, true);
      } finally {
        setBtnLoading(btn, false);
      }
    });
  }

  /* refresh predictions */
  const loadPredictionsBtn = qs("#loadPredictionsBtn");
  if (loadPredictionsBtn) {
    loadPredictionsBtn.addEventListener("click", loadPredictions);
  }
});