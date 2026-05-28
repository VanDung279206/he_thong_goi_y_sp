const profiles = [
  {
    id: "tech",
    label: "Công nghệ",
    name: "Minh - mê công nghệ",
    description: "Thường xem điện thoại, tai nghe, phụ kiện gaming và sản phẩm có đánh giá cao.",
    interests: ["tech", "audio", "gaming"],
    priceBias: 0.78,
  },
  {
    id: "fashion",
    label: "Thời trang",
    name: "Linh - thích phối đồ",
    description: "Quan tâm giày, túi, áo khoác và các sản phẩm thời trang theo mùa.",
    interests: ["fashion", "shoe", "streetwear"],
    priceBias: 0.62,
  },
  {
    id: "beauty",
    label: "Làm đẹp",
    name: "An - chăm sóc cá nhân",
    description: "Hay mua mỹ phẩm, skincare, sản phẩm tiện dụng hằng ngày và hàng mua kèm.",
    interests: ["beauty", "skincare", "daily"],
    priceBias: 0.54,
  },
];

const products = [
  { id: 1, name: "Tai nghe chống ồn AirBeat Pro", category: "Công nghệ", price: 1290000, rating: 4.8, sold: 1320, tags: ["tech", "audio"], color: "#0f766e", code: "AB", cf: 0.93, image: "🎧" },
  { id: 2, name: "Điện thoại OLED 120Hz Nova X", category: "Công nghệ", price: 8990000, rating: 4.7, sold: 842, tags: ["tech", "phone"], color: "#24364b", code: "NX", cf: 0.87, image: "📱" },
  { id: 3, name: "Bàn phím cơ RGB Compact", category: "Công nghệ", price: 890000, rating: 4.6, sold: 980, tags: ["tech", "gaming"], color: "#35636f", code: "KB", cf: 0.84, image: "⌨" },
  { id: 4, name: "Giày sneaker trắng Urban", category: "Thời trang", price: 690000, rating: 4.9, sold: 2100, tags: ["fashion", "shoe", "streetwear"], color: "#d99b2b", code: "SN", cf: 0.91, image: "👟" },
  { id: 5, name: "Áo khoác chống nắng nhẹ", category: "Thời trang", price: 420000, rating: 4.5, sold: 760, tags: ["fashion", "daily"], color: "#6d7d4e", code: "JK", cf: 0.8, image: "🧥" },
  { id: 6, name: "Túi đeo chéo chống nước", category: "Thời trang", price: 350000, rating: 4.6, sold: 1184, tags: ["fashion", "streetwear"], color: "#8a4f7d", code: "BG", cf: 0.82, image: "👜" },
  { id: 7, name: "Serum phục hồi da ban đêm", category: "Làm đẹp", price: 310000, rating: 4.9, sold: 2540, tags: ["beauty", "skincare"], color: "#c85d75", code: "SR", cf: 0.9, image: "🧴" },
  { id: 8, name: "Kem chống nắng SPF50", category: "Làm đẹp", price: 250000, rating: 4.8, sold: 3012, tags: ["beauty", "daily", "skincare"], color: "#e08a42", code: "SP", cf: 0.92, image: "☀" },
  { id: 9, name: "Máy rửa mặt mini Sonic", category: "Làm đẹp", price: 540000, rating: 4.4, sold: 640, tags: ["beauty", "tech"], color: "#3f7f91", code: "FC", cf: 0.76, image: "◌" },
  { id: 10, name: "Bình giữ nhiệt Smart Cup", category: "Đời sống", price: 220000, rating: 4.7, sold: 1760, tags: ["daily", "home"], color: "#b65f45", code: "CP", cf: 0.74, image: "☕" },
  { id: 11, name: "Đèn bàn LED chống mỏi mắt", category: "Đời sống", price: 460000, rating: 4.6, sold: 690, tags: ["home", "tech"], color: "#4d628f", code: "LD", cf: 0.73, image: "💡" },
  { id: 12, name: "Sữa rửa mặt dịu nhẹ", category: "Làm đẹp", price: 180000, rating: 4.7, sold: 1890, tags: ["beauty", "skincare", "daily"], color: "#789c9c", code: "CL", cf: 0.86, image: "✦" },
];

let activeProfile = profiles[0];
let activeCategory = "Tất cả";
let selectedProductId = 1;
let cart = [];
let behavior = {
  viewed: [1, 2],
  searched: "",
  added: [],
};

const formatPrice = (value) => new Intl.NumberFormat("vi-VN").format(value) + "đ";

function tagScore(product) {
  const matches = product.tags.filter((tag) => activeProfile.interests.includes(tag)).length;
  return matches / Math.max(product.tags.length, 1);
}

function behaviorScore(product) {
  const viewedTags = behavior.viewed
    .map((id) => products.find((item) => item.id === id))
    .filter(Boolean)
    .flatMap((item) => item.tags);
  const addedTags = behavior.added
    .map((id) => products.find((item) => item.id === id))
    .filter(Boolean)
    .flatMap((item) => item.tags);
  const signalTags = [...viewedTags, ...addedTags];
  if (!signalTags.length) return 0;
  const matches = product.tags.filter((tag) => signalTags.includes(tag)).length;
  return Math.min(1, matches / product.tags.length + behavior.added.includes(product.id) * 0.2);
}

function recommendationScore(product) {
  const contentBased = tagScore(product);
  const collaborative = product.cf;
  const trend = Math.min(product.sold / 3000, 1);
  const behaviorFit = behaviorScore(product);
  const priceFit = 1 - Math.abs(product.price / 9000000 - activeProfile.priceBias) * 0.45;
  return contentBased * 0.34 + collaborative * 0.24 + behaviorFit * 0.2 + trend * 0.12 + priceFit * 0.1;
}

function getRecommendations(limit = 4) {
  return products
    .map((product) => ({ ...product, score: recommendationScore(product) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getSimilarProducts() {
  const selected = products.find((product) => product.id === selectedProductId) || products[0];
  return products
    .filter((product) => product.id !== selected.id)
    .map((product) => {
      const overlap = product.tags.filter((tag) => selected.tags.includes(tag)).length;
      const categoryBonus = product.category === selected.category ? 0.35 : 0;
      return { ...product, score: overlap / Math.max(selected.tags.length, 1) + categoryBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function renderProfiles() {
  const container = document.querySelector("#profileSwitcher");
  container.innerHTML = profiles
    .map((profile) => `<button class="${profile.id === activeProfile.id ? "active" : ""}" data-profile="${profile.id}" type="button">${profile.label}</button>`)
    .join("");
  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeProfile = profiles.find((profile) => profile.id === button.dataset.profile);
      render();
    });
  });
}

function productCard(product, context = "grid") {
  const percent = Math.round((product.score ?? recommendationScore(product)) * 100);
  return `
    <article class="product-card ${context === "recommendation" ? "recommended" : ""}" data-product="${product.id}">
      <button class="product-visual" style="background:${product.color}" data-view="${product.id}" type="button" aria-label="Xem ${product.name}">
        <span>${product.image}</span>
        <small>${product.code}</small>
      </button>
      <div class="product-info">
        <div class="product-meta">
          <span>${product.category}</span>
          <strong>★ ${product.rating}</strong>
        </div>
        <h3>${product.name}</h3>
        <p>${formatPrice(product.price)}</p>
        <div class="score-meter" aria-label="Điểm gợi ý ${percent}%"><span style="width:${percent}%"></span></div>
        <div class="card-actions">
          <button data-cart="${product.id}" type="button">Thêm giỏ</button>
          <button data-view="${product.id}" type="button">Xem</button>
        </div>
      </div>
    </article>
  `;
}

function renderRecommendations() {
  const recs = getRecommendations(4);
  document.querySelector("#recommendationGrid").innerHTML = recs.map((item) => productCard(item, "recommendation")).join("");
  const avg = Math.round((recs.reduce((sum, item) => sum + item.score, 0) / recs.length) * 100);
  document.querySelector("#fitScore").textContent = `${avg}%`;
  document.querySelector("#fitBar").style.width = `${avg}%`;
  document.querySelector("#heroScore").textContent = `${avg}%`;
}

function renderProducts() {
  const search = document.querySelector("#searchInput").value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const inCategory = activeCategory === "Tất cả" || product.category === activeCategory;
    const inSearch = !search || [product.name, product.category, ...product.tags].join(" ").toLowerCase().includes(search);
    return inCategory && inSearch;
  });
  document.querySelector("#productGrid").innerHTML = filtered.map((item) => productCard({ ...item, score: recommendationScore(item) })).join("");
}

function renderCategories() {
  const categories = ["Tất cả", ...new Set(products.map((product) => product.category))];
  const container = document.querySelector("#categoryTabs");
  container.innerHTML = categories
    .map((category) => `<button class="${category === activeCategory ? "active" : ""}" data-category="${category}" type="button">${category}</button>`)
    .join("");
  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      render();
    });
  });
}

function renderProfileInsight() {
  document.querySelector("#profileDescription").textContent = activeProfile.description;
  document.querySelector("#preferenceTags").innerHTML = activeProfile.interests.map((tag) => `<span>${tag}</span>`).join("");
}

function renderSimilar() {
  const selected = products.find((product) => product.id === selectedProductId) || products[0];
  document.querySelector("#similarNote").textContent = `Dựa trên sản phẩm vừa xem: ${selected.name}`;
  document.querySelector("#similarGrid").innerHTML = getSimilarProducts().map((item) => productCard(item)).join("");
}

function renderCart() {
  document.querySelector("#cartCount").textContent = cart.length;
  const items = cart.map((id) => products.find((product) => product.id === id)).filter(Boolean);
  document.querySelector("#cartItems").innerHTML = items.length
    ? items.map((item) => `<div><span>${item.name}</span><strong>${formatPrice(item.price)}</strong></div>`).join("")
    : `<p class="empty-cart">Chưa có sản phẩm nào.</p>`;
  document.querySelector("#cartTotal").textContent = formatPrice(items.reduce((sum, item) => sum + item.price, 0));
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function trackView(productId) {
  selectedProductId = productId;
  behavior.viewed = [productId, ...behavior.viewed.filter((id) => id !== productId)].slice(0, 5);
  const product = products.find((item) => item.id === productId);
  showToast(`Đã ghi nhận lượt xem: ${product.name}`);
  render();
}

function addToCart(productId) {
  cart.push(productId);
  behavior.added = [productId, ...behavior.added].slice(0, 6);
  const product = products.find((item) => item.id === productId);
  showToast(`Đã thêm vào giỏ: ${product.name}`);
  render();
}

function attachProductEvents() {
  document.querySelectorAll("[data-cart]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.cart)));
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => trackView(Number(button.dataset.view)));
  });
}

function render() {
  renderProfiles();
  renderCategories();
  renderProfileInsight();
  renderRecommendations();
  renderProducts();
  renderSimilar();
  renderCart();
  attachProductEvents();
}

document.querySelector("#searchInput").addEventListener("input", (event) => {
  behavior.searched = event.target.value;
  renderProducts();
  attachProductEvents();
});

document.querySelector(".cart-button").addEventListener("click", () => {
  document.querySelector("#cartDrawer").classList.add("open");
});

document.querySelector("#closeCart").addEventListener("click", () => {
  document.querySelector("#cartDrawer").classList.remove("open");
});

render();
