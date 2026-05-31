const data = window.MODEL_DATA;

const state = {
  activeProfileId: data.profiles[0]?.id,
  activeCategory: "Tất cả",
  selectedProductId: data.products[0]?.id,
  hybridWeight: 55,
  search: "",
  cart: [],
  loggedIn: false,
  role: "guest",
};

const money = new Intl.NumberFormat("vi-VN");

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
  const profile = activeProfile();
  const score = profile.scores.find((item) => item.productId === productId);
  if (score) return score;
  return { productId, cf: 0.5, cb: 0.5, hybrid: 0.5 };
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
        <div class="product-meta">
          <span>${product.category}</span>
          <strong>★ ${product.rating}</strong>
        </div>
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

function renderStats() {
  document.querySelector("#statProducts").textContent = data.products.length;
  document.querySelector("#statUsers").textContent = data.meta.training.users;
  document.querySelector("#metricUsers").textContent = data.meta.training.users;
  document.querySelector("#metricItems").textContent = data.meta.training.items;
  document.querySelector("#metricInteractions").textContent = data.meta.training.interactions;
  document.querySelector("#datasetName").textContent = data.meta.dataset;
}

function renderCategories() {
  const categories = ["Tất cả", ...new Set(data.products.map((product) => product.category))];
  document.querySelector("#categoryStrip").innerHTML = categories
    .filter((category) => category !== "Tất cả")
    .slice(0, 6)
    .map((category) => {
      const count = data.products.filter((product) => product.category === category).length;
      return `<button class="category-card" data-category="${category}" type="button"><span>${category.slice(0, 1)}</span><div><strong>${category}</strong><small>${count} sản phẩm</small></div></button>`;
    })
    .join("");

  document.querySelector("#filterTabs").innerHTML = categories
    .map((category) => `<button class="${category === state.activeCategory ? "active" : ""}" data-filter="${category}" type="button">${category}</button>`)
    .join("");
}

function renderProfiles() {
  const profile = activeProfile();
  document.querySelector("#profileTabs").innerHTML = data.profiles
    .map((item) => `<button class="${item.id === profile.id ? "active" : ""}" data-profile="${item.id}" type="button">${item.label}</button>`)
    .join("");
  document.querySelector("#profileSelect").innerHTML = data.profiles
    .map((item) => `<option value="${item.id}" ${item.id === profile.id ? "selected" : ""}>${item.name} - ${item.label}</option>`)
    .join("");
  document.querySelector("#activeProfileName").textContent = state.loggedIn ? profile.name : "Khách vãng lai";
  document.querySelector("#activeProfileDescription").textContent = state.loggedIn
    ? profile.description
    : "Đăng nhập để dùng hồ sơ hành vi từ dataset. Hiện hệ thống đang dùng hồ sơ mẫu.";
  document.querySelector("#interestTags").innerHTML = profile.interests.map((tag) => `<span>${tag}</span>`).join("");
}

function renderHybridControl() {
  const cf = state.hybridWeight;
  const cb = 100 - cf;
  document.querySelector("#weightLabel").textContent = `${cf}% CF / ${cb}% CB`;
  document.querySelector("#formulaText").textContent = `Hybrid = ${(cf / 100).toFixed(2)} × CF + ${(cb / 100).toFixed(2)} × CB`;
  document.querySelector("#adminWeightLabel").textContent = `${cf}% CF / ${cb}% CB`;
  document.querySelector("#adminFormulaText").textContent = `Hybrid = ${(cf / 100).toFixed(2)} × CF + ${(cb / 100).toFixed(2)} × CB`;
  document.querySelector("#hybridWeight").value = cf;
  document.querySelector("#adminHybridWeight").value = cf;
}

function renderRecommendations() {
  const products = sortedProducts().slice(0, 8);
  document.querySelector("#recommendationGrid").innerHTML = products.map((product) => productCard(product)).join("");
}

function renderProducts() {
  const filtered = sortedProducts().filter((product) => {
    const categoryOk = state.activeCategory === "Tất cả" || product.category === state.activeCategory;
    const text = `${product.name} ${product.category} ${product.rawCategory}`.toLowerCase();
    return categoryOk && text.includes(state.search.toLowerCase());
  });
  document.querySelector("#productGrid").innerHTML = filtered.slice(0, 24).map((product) => productCard(product)).join("");
}

function renderSimilar() {
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
  document.querySelector("#similarNote").textContent = `Dựa trên sản phẩm vừa xem: ${selected.name}`;
  document.querySelector("#similarGrid").innerHTML = similar.map((product) => productCard(product, true)).join("");
}

function renderEpochs() {
  const maxRmse = Math.max(...data.meta.history.map((item) => item.rmse));
  document.querySelector("#epochBars").innerHTML = data.meta.history
    .map((item) => {
      const width = Math.max(12, Math.round((item.rmse / maxRmse) * 100));
      return `<div class="epoch-row"><span>Epoch ${item.epoch}</span><div class="epoch-track"><span style="width:${width}%"></span></div><strong>${item.rmse}</strong></div>`;
    })
    .join("");
}

function renderAdminDashboard() {
  document.querySelector("#adminProductCount").textContent = data.products.length;
  document.querySelector("#adminUserCount").textContent = data.meta.training.users;
  document.querySelector("#adminInteractionCount").textContent = data.meta.training.interactions;

  const top = sortedProducts().slice(0, 8);
  document.querySelector("#adminTopProducts").innerHTML = top
    .map((product, index) => {
      const score = scoreFor(product.id);
      return `
        <div class="admin-row">
          <span>${index + 1}</span>
          <strong>${product.name}</strong>
          <em>CF ${Math.round(score.cf * 100)}% · CB ${Math.round(score.cb * 100)}%</em>
          <b>${Math.round(product.score * 100)}%</b>
        </div>
      `;
    })
    .join("");

  const categoryCounts = [...new Set(data.products.map((product) => product.category))]
    .map((category) => ({
      category,
      count: data.products.filter((product) => product.category === category).length,
    }))
    .sort((a, b) => b.count - a.count);

  document.querySelector("#adminCategories").innerHTML = categoryCounts
    .map((item) => `<div class="admin-row"><span>${item.category.slice(0, 1)}</span><strong>${item.category}</strong><em>${item.count} sản phẩm</em><b>${Math.round((item.count / data.products.length) * 100)}%</b></div>`)
    .join("");
}

function applyRoleView() {
  document.body.dataset.role = state.role;
  const loginLabel = state.loggedIn ? (state.role === "admin" ? "Quản lý" : "Người dùng") : "Đăng nhập";
  document.querySelector("#loginButton").textContent = loginLabel;
  document.querySelector("#cartButton").disabled = state.role === "admin";
}

function renderCart() {
  document.querySelector("#cartCount").textContent = state.cart.length;
  const items = state.cart.map(productById).filter(Boolean);
  document.querySelector("#cartItems").innerHTML = items.length
    ? items.map((item) => `<div class="cart-item"><div><strong>${item.name}</strong><span>${item.category}</span></div><strong>${formatPrice(item.price)}</strong></div>`).join("")
    : `<p class="empty">Giỏ hàng trống.</p>`;
  document.querySelector("#cartTotal").textContent = formatPrice(items.reduce((sum, item) => sum + item.price, 0));
}

function showToast(text) {
  const toast = document.querySelector("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function attachEvents() {
  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeProfileId = button.dataset.profile;
      state.loggedIn = true;
      render();
    });
  });
  document.querySelectorAll("[data-filter], [data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.filter || button.dataset.category;
      document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
      render();
    });
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProductId = button.dataset.view;
      const product = productById(state.selectedProductId);
      showToast(`Đã xem ${product.name}. Gợi ý tương tự đã cập nhật.`);
      renderSimilar();
      attachEvents();
    });
  });
  document.querySelectorAll("[data-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cart.push(button.dataset.cart);
      const product = productById(button.dataset.cart);
      showToast(`Đã thêm ${product.name} vào giỏ.`);
      renderCart();
    });
  });
}

function render() {
  renderStats();
  renderCategories();
  renderProfiles();
  renderHybridControl();
  renderRecommendations();
  renderProducts();
  renderSimilar();
  renderEpochs();
  renderAdminDashboard();
  renderCart();
  applyRoleView();
  attachEvents();
}

function openAuth() {
  document.querySelector("#authModal").classList.add("open");
  document.querySelector("#authModal").setAttribute("aria-hidden", "false");
}

function closeAuth() {
  document.querySelector("#authModal").classList.remove("open");
  document.querySelector("#authModal").setAttribute("aria-hidden", "true");
}

document.querySelector("#searchInput").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
  attachEvents();
});

document.querySelector("#hybridWeight").addEventListener("input", (event) => {
  state.hybridWeight = Number(event.target.value);
  render();
});

document.querySelector("#adminHybridWeight").addEventListener("input", (event) => {
  state.hybridWeight = Number(event.target.value);
  render();
});

document.querySelector("#loginButton").addEventListener("click", openAuth);
document.querySelector("#heroLoginButton").addEventListener("click", openAuth);
document.querySelector("#closeAuth").addEventListener("click", closeAuth);
document.querySelector("#submitLogin").addEventListener("click", () => {
  state.activeProfileId = document.querySelector("#profileSelect").value;
  state.loggedIn = true;
  state.role = document.querySelector("input[name='role']:checked").value;
  closeAuth();
  showToast(state.role === "admin" ? "Đăng nhập quản lý thành công." : "Đăng nhập người dùng thành công. Gợi ý đã cá nhân hóa.");
  render();
  document.querySelector(state.role === "admin" ? "#adminDashboard" : "#recommendations").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#cartButton").addEventListener("click", () => {
  document.querySelector("#cartDrawer").classList.add("open");
});

document.querySelector("#closeCart").addEventListener("click", () => {
  document.querySelector("#cartDrawer").classList.remove("open");
});

render();
