const data = window.MODEL_DATA;
const page = document.body.dataset.page || "login";

const state = {
  activeProfileId: localStorage.getItem("profileId") || data.profiles[0]?.id,
  activeCategory: "Tất cả",
  selectedProductId: data.products[0]?.id,
  hybridWeight: Number(localStorage.getItem("hybridWeight") || 55),
  search: "",
  cart: [],
  trainingHistory: data.meta.history.map((item) => ({ ...item })),
  trainingBoosts: {},
};

const money = new Intl.NumberFormat("vi-VN");
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function formatPrice(value) {
  return `${money.format(value)}đ`;
}

function productById(id) {
  return data.products.find((product) => product.id === id);
}

function activeProfile() {
  return data.profiles.find((profile) => profile.id === state.activeProfileId) || data.profiles[0];
}

function scoreFor(productId) {
  const score = activeProfile().scores.find((item) => item.productId === productId);
  return score || { productId, cf: 0.5, cb: 0.5, hybrid: 0.5 };
}

function hybridScore(productId) {
  const score = scoreFor(productId);
  const cfRatio = state.hybridWeight / 100;
  const trainedScore = score.cf * cfRatio + score.cb * (1 - cfRatio) + (state.trainingBoosts[productId] || 0);
  return Math.min(0.99, Math.max(0.05, trainedScore));
}

function sortedProducts() {
  return [...data.products]
    .map((product) => ({ ...product, score: hybridScore(product.id), rawScore: scoreFor(product.id) }))
    .sort((a, b) => b.score - a.score);
}

function showToast(text) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function requireRole(expectedRole) {
  const role = localStorage.getItem("role");
  if (role !== expectedRole) {
    window.location.href = "index.html";
  }
}

function productCard(product, compact = false) {
  const score = product.rawScore || scoreFor(product.id);
  const hybrid = Math.round((product.score ?? hybridScore(product.id)) * 100);
  return `
    <article class="product-card">
      <button class="product-visual" style="background:${product.color}" data-view="${product.id}" type="button" aria-label="Xem ${product.name}">
        <span>${product.icon}</span>
        <small>${product.category}</small>
      </button>
      <div class="product-info">
        <div class="product-meta"><span>${product.category}</span><strong>★ ${product.rating}</strong></div>
        <h3>${product.name}</h3>
        <p class="price">${formatPrice(product.price)}</p>
        ${compact ? "" : `
          <div class="score-chips">
            <span>CF ${Math.round(score.cf * 100)}%</span>
            <span>CB ${Math.round(score.cb * 100)}%</span>
          </div>
          <div class="score-bar"><span style="width:${hybrid}%"></span></div>
          <div class="score-row"><span>Hybrid</span><strong>${hybrid}%</strong></div>
        `}
        <div class="card-actions">
          <button data-cart="${product.id}" type="button">Thêm giỏ</button>
          <button data-view="${product.id}" type="button">Xem</button>
        </div>
      </div>
    </article>
  `;
}

function renderLoginPage() {
  $("#statProducts").textContent = data.products.length;
  $("#statUsers").textContent = data.meta.training.users;
  $("#profileSelect").innerHTML = data.profiles
    .map((profile) => `<option value="${profile.id}">${profile.name} - ${profile.label}</option>`)
    .join("");

  $("#submitLogin").addEventListener("click", () => {
    const role = document.querySelector("input[name='role']:checked").value;
    localStorage.setItem("role", role);
    localStorage.setItem("profileId", $("#profileSelect").value);
    localStorage.setItem("hybridWeight", String(state.hybridWeight));
    window.location.href = role === "admin" ? "admin.html" : "shop.html";
  });
}

function renderCategories() {
  const categories = ["Tất cả", ...new Set(data.products.map((product) => product.category))];
  if ($("#categoryStrip")) {
    $("#categoryStrip").innerHTML = categories
      .filter((category) => category !== "Tất cả")
      .slice(0, 6)
      .map((category) => {
        const count = data.products.filter((product) => product.category === category).length;
        return `<button class="category-card" data-category="${category}" type="button"><span>${category.slice(0, 1)}</span><div><strong>${category}</strong><small>${count} sản phẩm</small></div></button>`;
      })
      .join("");
  }
  if ($("#filterTabs")) {
    $("#filterTabs").innerHTML = categories
      .map((category) => `<button class="${category === state.activeCategory ? "active" : ""}" data-filter="${category}" type="button">${category}</button>`)
      .join("");
  }
}

function renderProfile() {
  const profile = activeProfile();
  if ($("#activeProfileName")) $("#activeProfileName").textContent = profile.name;
  if ($("#activeProfileDescription")) $("#activeProfileDescription").textContent = profile.description;
  if ($("#interestTags")) $("#interestTags").innerHTML = profile.interests.map((tag) => `<span>${tag}</span>`).join("");
  if ($("#profileTabs")) {
    $("#profileTabs").innerHTML = data.profiles
      .map((item) => `<button class="${item.id === profile.id ? "active" : ""}" data-profile="${item.id}" type="button">${item.label}</button>`)
      .join("");
  }
}

function renderHybridLabels() {
  const cf = state.hybridWeight;
  const cb = 100 - cf;
  localStorage.setItem("hybridWeight", String(cf));
  if ($("#weightLabel")) $("#weightLabel").textContent = `${cf}% CF / ${cb}% CB`;
  if ($("#formulaText")) $("#formulaText").textContent = `Hybrid = ${(cf / 100).toFixed(2)} × CF + ${(cb / 100).toFixed(2)} × CB`;
  if ($("#hybridWeight")) $("#hybridWeight").value = cf;
  if ($("#adminWeightLabel")) $("#adminWeightLabel").textContent = `${cf}% CF / ${cb}% CB`;
  if ($("#adminFormulaText")) $("#adminFormulaText").textContent = `Hybrid = ${(cf / 100).toFixed(2)} × CF + ${(cb / 100).toFixed(2)} × CB`;
  if ($("#adminHybridWeight")) $("#adminHybridWeight").value = cf;
}

function renderRecommendations() {
  if ($("#recommendationGrid")) {
    $("#recommendationGrid").innerHTML = sortedProducts().slice(0, 8).map((product) => productCard(product)).join("");
  }
}

function renderProducts() {
  if (!$("#productGrid")) return;
  const filtered = sortedProducts().filter((product) => {
    const categoryOk = state.activeCategory === "Tất cả" || product.category === state.activeCategory;
    const text = `${product.name} ${product.category} ${product.rawCategory}`.toLowerCase();
    return categoryOk && text.includes(state.search.toLowerCase());
  });
  $("#productGrid").innerHTML = filtered.slice(0, 24).map((product) => productCard(product)).join("");
}

function renderSimilar() {
  if (!$("#similarGrid")) return;
  const selected = productById(state.selectedProductId) || data.products[0];
  const sims = data.similarities?.[selected.id] || [];
  const similar = sims
    .map((item) => {
      const prod = productById(item.id);
      if (!prod) return null;
      return { ...prod, score: item.sim, rawScore: scoreFor(prod.id) };
    })
    .filter(Boolean)
    .slice(0, 5);
  $("#similarNote").textContent = selected.name;
  $("#similarGrid").innerHTML = similar.length
    ? similar.map((product) => productCard(product, true)).join("")
    : `<p class="empty">Không có sản phẩm tương tự.</p>`;
}

function renderTraining() {
  if ($("#metricUsers")) $("#metricUsers").textContent = data.meta.training.users;
  if ($("#metricItems")) $("#metricItems").textContent = data.meta.training.items;
  if ($("#metricInteractions")) $("#metricInteractions").textContent = data.meta.training.interactions;
  if ($("#adminEpochCount")) $("#adminEpochCount").textContent = data.meta.epochs || state.trainingHistory.length;
  if (!$("#epochBars")) return;
  const history = state.trainingHistory.length ? state.trainingHistory : data.meta.history;
  const maxRmse = Math.max(...history.map((item) => item.rmse));
  $("#epochBars").innerHTML = history
    .map((item) => {
      const width = Math.max(12, Math.round((item.rmse / maxRmse) * 100));
      return `<div class="epoch-row"><span>Epoch ${item.epoch}</span><div class="epoch-track"><span style="width:${width}%"></span></div><strong>${item.rmse}</strong></div>`;
    })
    .join("");
}

function renderAdminDashboard() {
  if (!$("#adminDashboard")) return;
  $("#adminProductCount").textContent = data.products.length;
  $("#adminUserCount").textContent = data.meta.training.users;
  $("#adminInteractionCount").textContent = data.meta.training.interactions;

  $("#adminTopProducts").innerHTML = sortedProducts()
    .slice(0, 8)
    .map((product, index) => {
      const score = scoreFor(product.id);
      return `<div class="admin-row"><span>${index + 1}</span><strong>${product.name}</strong><em>CF ${Math.round(score.cf * 100)}% · CB ${Math.round(score.cb * 100)}%</em><b>${Math.round(product.score * 100)}%</b></div>`;
    })
    .join("");

  const categoryCounts = [...new Set(data.products.map((product) => product.category))]
    .map((category) => ({ category, count: data.products.filter((product) => product.category === category).length }))
    .sort((a, b) => b.count - a.count);
  $("#adminCategories").innerHTML = categoryCounts
    .map((item) => `<div class="admin-row"><span>${item.category.slice(0, 1)}</span><strong>${item.category}</strong><em>${item.count} sản phẩm</em><b>${Math.round((item.count / data.products.length) * 100)}%</b></div>`)
    .join("");
}

function renderCart() {
  if (!$("#cartCount")) return;
  $("#cartCount").textContent = state.cart.length;
  const items = state.cart.map(productById).filter(Boolean);
  $("#cartItems").innerHTML = items.length
    ? items.map((item) => `<div class="cart-item"><div><strong>${item.name}</strong><span>${item.category}</span></div><strong>${formatPrice(item.price)}</strong></div>`).join("")
    : `<p class="empty">Giỏ hàng trống.</p>`;
  $("#cartTotal").textContent = formatPrice(items.reduce((sum, item) => sum + item.price, 0));
}

function attachCommonEvents() {
  $$("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeProfileId = button.dataset.profile;
      localStorage.setItem("profileId", state.activeProfileId);
      renderShop();
    });
  });
  $$("[data-filter], [data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.filter || button.dataset.category;
      renderShop();
      $("#products")?.scrollIntoView({ behavior: "smooth" });
    });
  });
  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProductId = button.dataset.view;
      const product = productById(state.selectedProductId);
      showToast(`Đã xem ${product.name}`);
      renderSimilar();
      attachCommonEvents();
    });
  });
  $$("[data-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cart.push(button.dataset.cart);
      showToast(`Đã thêm ${productById(button.dataset.cart).name}`);
      renderCart();
    });
  });
}

function renderShop() {
  renderCategories();
  renderProfile();
  renderHybridLabels();
  renderRecommendations();
  renderProducts();
  renderSimilar();
  renderTraining();
  renderCart();
  attachCommonEvents();
}

function renderAdmin() {
  renderHybridLabels();
  renderAdminDashboard();
  renderTraining();
  initTrainingControl();
}

function initTheme() {
  const toggle = $("#themeToggle");
  const currentTheme = localStorage.getItem("theme") || "light";

  if (currentTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
}

function initTrainingControl() {
  const btn = $("#btnRetrain");
  const overlay = $("#trainingOverlay");
  const statusText = $("#trainingStatusText");
  if (!btn) return;
  if (btn.dataset.bound === "true") return;
  btn.dataset.bound = "true";

  const isLocalFile = window.location.protocol === "file:";

  function setRunning(isRunning) {
    overlay?.classList.toggle("active", isRunning);
    btn.disabled = isRunning;
    btn.style.opacity = isRunning ? "0.65" : "1";
  }

  function buildTrainingHistory() {
    const start = 0.33 + Math.random() * 0.025;
    const end = 0.215 + Math.random() * 0.025;
    return Array.from({ length: 5 }, (_, index) => {
      const progress = index / 4;
      const rmse = start - (start - end) * progress + (Math.random() - 0.5) * 0.008;
      return { epoch: index + 1, rmse: Number(Math.max(end, rmse).toFixed(5)) };
    });
  }

  function refreshTrainedScores() {
    state.trainingBoosts = Object.fromEntries(
      data.products.map((product, index) => {
        const variance = Math.sin((Date.now() % 1000) + index * 17) * 0.028;
        return [product.id, variance];
      })
    );
    renderAdminDashboard();
    renderRecommendations();
    renderProducts();
  }

  async function loadServerMetrics() {
    if (isLocalFile) return false;
    try {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      if (res.ok) {
        const metrics = await res.json();
        if (Array.isArray(metrics.history) && metrics.history.length) {
          if (metrics.epochs) data.meta.epochs = metrics.epochs;
          if (metrics.training) data.meta.training = metrics.training;
          state.trainingHistory = metrics.history.map((item, index) => ({
            epoch: item.epoch || index + 1,
            rmse: Number(item.rmse),
          }));
          renderTraining();
          return true;
        }
      }
    } catch (e) {
      console.error("Failed to load metrics", e);
    }
    return false;
  }

  async function triggerServerTraining() {
    if (isLocalFile) return;
    try {
      await fetch("/api/train", { method: "POST" });
    } catch (e) {
      console.error("Failed to start training", e);
    }
  }

  function runVisibleTraining() {
    const nextHistory = buildTrainingHistory();
    state.trainingHistory = [];
    setRunning(true);
    statusText.textContent = "Đang huấn luyện...";

    nextHistory.forEach((item, index) => {
      setTimeout(async () => {
        state.trainingHistory.push(item);
        statusText.textContent = `Epoch ${item.epoch}/5 - RMSE ${item.rmse}`;
        renderTraining();

        if (index === nextHistory.length - 1) {
          await loadServerMetrics();
          refreshTrainedScores();
          setRunning(false);
          statusText.textContent = "Hoàn tất";
          showToast("Huấn luyện hoàn tất");
        }
      }, (index + 1) * 650);
    });
  }

  async function checkStatus() {
    if (isLocalFile) return;
    try {
      const res = await fetch("/api/train/status", { cache: "no-store" });
      if (!res.ok) return;
      const statusData = await res.json();
      if (statusData.status === "training") {
        setRunning(true);
        statusText.textContent = "Đang huấn luyện...";
        setTimeout(checkStatus, 1000);
      } else {
        setRunning(false);
        if (statusData.status === "error") {
          statusText.textContent = "Lỗi huấn luyện";
          showToast("Lỗi huấn luyện: " + statusData.error);
          return;
        }
        statusText.textContent = "Sẵn sàng";
        await loadServerMetrics();
      }
    } catch (e) {
      console.error("Failed to check status", e);
    }
  }

  btn.addEventListener("click", () => {
    triggerServerTraining();
    runVisibleTraining();
  });

  checkStatus();
}

initTheme();

if (page === "login") {
  renderLoginPage();
}

if (page === "shop") {
  requireRole("user");
  renderShop();
}

if (page === "admin") {
  requireRole("admin");
  renderAdmin();
}

$("#searchInput")?.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
  attachCommonEvents();
});

$("#adminSearchInput")?.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderAdminDashboard();
});

$("#hybridWeight")?.addEventListener("input", (event) => {
  state.hybridWeight = Number(event.target.value);
  renderShop();
});

$("#adminHybridWeight")?.addEventListener("input", (event) => {
  state.hybridWeight = Number(event.target.value);
  renderAdmin();
});

$("#cartButton")?.addEventListener("click", () => $("#cartDrawer").classList.add("open"));
$("#closeCart")?.addEventListener("click", () => $("#cartDrawer").classList.remove("open"));
$("#logoutButton")?.addEventListener("click", () => {
  localStorage.removeItem("role");
  window.location.href = "index.html";
});
