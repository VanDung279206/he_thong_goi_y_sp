const profiles = [
  {
    id: "tech",
    name: "Người dùng yêu công nghệ",
    desc: "Hay xem điện thoại, tai nghe, phụ kiện gaming",
    tags: ["tech", "gaming", "audio"],
    behavior: 0.92,
  },
  {
    id: "fashion",
    name: "Người dùng thời trang",
    desc: "Quan tâm giày, áo khoác, túi và sản phẩm theo mùa",
    tags: ["fashion", "streetwear", "shoe"],
    behavior: 0.84,
  },
  {
    id: "beauty",
    name: "Người dùng làm đẹp",
    desc: "Thường mua mỹ phẩm, chăm sóc da và sản phẩm cá nhân",
    tags: ["beauty", "skincare", "daily"],
    behavior: 0.88,
  },
];

const products = [
  {
    name: "Tai nghe chống ồn AirBeat Pro",
    category: "Âm thanh",
    tags: ["tech", "audio"],
    cb: 0.94,
    cf: 0.91,
    color: "#0f766e",
    code: "AB",
    reason: "Tương đồng với lịch sử xem phụ kiện công nghệ.",
  },
  {
    name: "Bàn phím cơ RGB Compact",
    category: "Gaming",
    tags: ["tech", "gaming"],
    cb: 0.9,
    cf: 0.86,
    color: "#24364b",
    code: "KB",
    reason: "Nhiều người dùng cùng nhóm đã thêm vào giỏ hàng.",
  },
  {
    name: "Điện thoại màn hình OLED 120Hz",
    category: "Điện thoại",
    tags: ["tech"],
    cb: 0.86,
    cf: 0.8,
    color: "#e45f4f",
    code: "PH",
    reason: "Phù hợp với danh mục và khoảng giá thường quan tâm.",
  },
  {
    name: "Giày sneaker trắng tối giản",
    category: "Thời trang",
    tags: ["fashion", "shoe", "streetwear"],
    cb: 0.92,
    cf: 0.88,
    color: "#d99b2b",
    code: "SN",
    reason: "Trùng phong cách với các sản phẩm đã xem gần đây.",
  },
  {
    name: "Áo khoác chống nắng nhẹ",
    category: "Thời trang",
    tags: ["fashion", "daily"],
    cb: 0.86,
    cf: 0.83,
    color: "#5f6f52",
    code: "JK",
    reason: "Sản phẩm đang tăng tương tác trong nhóm người dùng tương tự.",
  },
  {
    name: "Túi đeo chéo chống nước",
    category: "Phụ kiện",
    tags: ["fashion", "streetwear"],
    cb: 0.82,
    cf: 0.79,
    color: "#8a4f7d",
    code: "BG",
    reason: "Có tags tương đồng với sản phẩm đã mua.",
  },
  {
    name: "Serum phục hồi da ban đêm",
    category: "Mỹ phẩm",
    tags: ["beauty", "skincare"],
    cb: 0.95,
    cf: 0.87,
    color: "#c85d75",
    code: "SR",
    reason: "Khớp mạnh với sở thích chăm sóc da.",
  },
  {
    name: "Kem chống nắng SPF50",
    category: "Chăm sóc cá nhân",
    tags: ["beauty", "daily", "skincare"],
    cb: 0.9,
    cf: 0.89,
    color: "#e08a42",
    code: "SP",
    reason: "Được mua kèm nhiều với nhóm sản phẩm làm đẹp.",
  },
  {
    name: "Máy rửa mặt mini",
    category: "Thiết bị làm đẹp",
    tags: ["beauty", "tech"],
    cb: 0.82,
    cf: 0.78,
    color: "#3f7f91",
    code: "FC",
    reason: "Kết hợp tín hiệu nội dung và hành vi mua sắm.",
  },
];

let activeProfile = profiles[0];
let cfWeight = 55;

const profileList = document.querySelector("#profileList");
const productGrid = document.querySelector("#productGrid");
const activeProfileName = document.querySelector("#activeProfileName");
const activeProfileTag = document.querySelector("#activeProfileTag");
const cfWeightInput = document.querySelector("#cfWeight");
const weightValue = document.querySelector("#weightValue");

function tagMatchScore(profile, product) {
  const matches = product.tags.filter((tag) => profile.tags.includes(tag)).length;
  return matches / Math.max(product.tags.length, 1);
}

function hybridScore(profile, product) {
  const collaborative = product.cf * profile.behavior;
  const contentBased = product.cb * (0.64 + tagMatchScore(profile, product) * 0.36);
  const cfRatio = cfWeight / 100;
  return collaborative * cfRatio + contentBased * (1 - cfRatio);
}

function renderProfiles() {
  profileList.innerHTML = profiles
    .map(
      (profile) => `
        <button class="profile-button ${profile.id === activeProfile.id ? "active" : ""}" data-profile="${profile.id}">
          <strong>${profile.name}</strong>
          <span>${profile.desc}</span>
        </button>
      `,
    )
    .join("");

  profileList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeProfile = profiles.find((profile) => profile.id === button.dataset.profile);
      render();
    });
  });
}

function renderProducts() {
  const recommended = products
    .map((product) => ({ ...product, score: hybridScore(activeProfile, product) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  productGrid.innerHTML = recommended
    .map((product) => {
      const percent = Math.round(product.score * 100);
      return `
        <article class="product-card">
          <div class="product-art" style="background:${product.color}">${product.code}</div>
          <div class="product-body">
            <h3>${product.name}</h3>
            <p>${product.reason}</p>
            <div class="score-meter" aria-label="Điểm phù hợp ${percent}%">
              <span style="width:${percent}%"></span>
            </div>
            <div class="score-line">
              <span>${product.category}</span>
              <strong>${percent}%</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  activeProfileName.textContent = activeProfile.name;
  activeProfileTag.textContent = `${cfWeight}% CF + ${100 - cfWeight}% CBF`;
  weightValue.textContent = `${cfWeight}%`;
  renderProfiles();
  renderProducts();
}

cfWeightInput.addEventListener("input", (event) => {
  cfWeight = Number(event.target.value);
  render();
});

document.querySelectorAll(".method-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".method-card").forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
  });
});

render();
