const data = window.MODEL_DATA;
const page = document.body.dataset.page || "login";

const state = {
  activeProfileId: localStorage.getItem("profileId") || data.profiles[0]?.id,
  activeCategory: "Tất cả",
  selectedProductId: data.products[0]?.id,
  hybridWeight: Number(localStorage.getItem("hybridWeight") || 55),
  search: "",
  cart: [],
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
  return score.cf * cfRatio + score.cb * (1 - cfRatio);
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
  const similar = data.products
    .filter((product) => product.id !== selected.id)
    .map((product) => {
      const sameCategory = product.category === selected.category ? 0.65 : 0;
      const sameRaw = product.rawCategory === selected.rawCategory ? 0.25 : 0;
      return { ...product, score: sameCategory + sameRaw + product.popularity * 0.1, rawScore: scoreFor(product.id) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  $("#similarNote").textContent = `Dựa trên sản phẩm vừa xem: ${selected.name}`;
  $("#similarGrid").innerHTML = similar.map((product) => productCard(product, true)).join("");
}

function renderTraining() {
  if ($("#metricUsers")) $("#metricUsers").textContent = data.meta.training.users;
  if ($("#metricItems")) $("#metricItems").textContent = data.meta.training.items;
  if ($("#metricInteractions")) $("#metricInteractions").textContent = data.meta.training.interactions;
  if (!$("#epochBars")) return;
  const maxRmse = Math.max(...data.meta.history.map((item) => item.rmse));
  $("#epochBars").innerHTML = data.meta.history
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
      showToast(`Đã xem ${product.name}. Sản phẩm tương tự đã cập nhật.`);
      renderSimilar();
      attachCommonEvents();
    });
  });
  $$("[data-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cart.push(button.dataset.cart);
      showToast(`Đã thêm ${productById(button.dataset.cart).name} vào giỏ.`);
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
}

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
