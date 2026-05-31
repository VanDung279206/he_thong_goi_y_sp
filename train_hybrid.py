from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
OUT = ROOT / "model_data.js"
METRICS = ROOT / "training_metrics.json"

RNG = np.random.default_rng(42)
EPOCHS = 5
LATENT_DIM = 18
LR = 0.035
REG = 0.025

CATEGORY_VI = {
    "bed_bath_table": ("Nhà cửa", "Bộ ga gối cotton"),
    "health_beauty": ("Làm đẹp", "Serum dưỡng da"),
    "sports_leisure": ("Thể thao", "Giày chạy bộ"),
    "furniture_decor": ("Nhà cửa", "Đèn trang trí"),
    "computers_accessories": ("Công nghệ", "Tai nghe bluetooth"),
    "housewares": ("Đời sống", "Bình giữ nhiệt"),
    "watches_gifts": ("Phụ kiện", "Đồng hồ thời trang"),
    "telephony": ("Công nghệ", "Điện thoại thông minh"),
    "garden_tools": ("Đời sống", "Bộ dụng cụ sân vườn"),
    "auto": ("Phụ kiện", "Phụ kiện xe hơi"),
    "toys": ("Đồ chơi", "Đồ chơi sáng tạo"),
    "cool_stuff": ("Đời sống", "Tiện ích thông minh"),
    "perfumery": ("Làm đẹp", "Nước hoa mini"),
    "baby": ("Mẹ và bé", "Đồ dùng em bé"),
    "electronics": ("Công nghệ", "Thiết bị điện tử"),
    "fashion_bags_accessories": ("Thời trang", "Túi đeo chéo"),
    "stationery": ("Văn phòng", "Sổ tay văn phòng"),
    "fashion_shoes": ("Thời trang", "Sneaker basic"),
    "luggage_accessories": ("Du lịch", "Vali du lịch"),
    "pet_shop": ("Thú cưng", "Đồ dùng thú cưng"),
}

PALETTE = [
    "#0f766e",
    "#24364b",
    "#e45f4f",
    "#d99b2b",
    "#8a4f7d",
    "#3f7f91",
    "#6d7d4e",
    "#b65f45",
]

ICONS = {
    "Công nghệ": "⌘",
    "Làm đẹp": "✦",
    "Thời trang": "◈",
    "Nhà cửa": "▣",
    "Đời sống": "●",
    "Phụ kiện": "◆",
    "Thể thao": "▲",
    "Đồ chơi": "★",
    "Mẹ và bé": "♡",
    "Văn phòng": "✎",
    "Du lịch": "✈",
    "Thú cưng": "♣",
}


def load_interactions() -> pd.DataFrame:
    customers = pd.read_csv(DATA / "olist_customers_dataset.csv")
    orders = pd.read_csv(DATA / "olist_orders_dataset.csv", usecols=["order_id", "customer_id", "order_status"])
    items = pd.read_csv(DATA / "olist_order_items_dataset.csv", usecols=["order_id", "product_id", "price", "freight_value"])
    products = pd.read_csv(DATA / "olist_products_dataset.csv", usecols=["product_id", "product_category_name"])
    reviews = pd.read_csv(DATA / "olist_order_reviews_dataset.csv", usecols=["order_id", "review_score"])

    orders = orders[orders["order_status"].isin(["delivered", "shipped"])]
    reviews = reviews.groupby("order_id", as_index=False)["review_score"].mean()

    df = (
        items.merge(orders, on="order_id", how="inner")
        .merge(customers[["customer_id", "customer_unique_id", "customer_state"]], on="customer_id", how="inner")
        .merge(products, on="product_id", how="left")
        .merge(reviews, on="order_id", how="left")
    )
    df["review_score"] = df["review_score"].fillna(4.0)
    df["product_category_name"] = df["product_category_name"].fillna("unknown")
    df["rating"] = (df["review_score"].clip(1, 5) / 5.0).astype("float32")
    return df


def filter_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    top_products = df["product_id"].value_counts().head(650).index
    df = df[df["product_id"].isin(top_products)].copy()
    top_users = df["customer_unique_id"].value_counts()
    eligible_users = top_users[top_users >= 1].head(5000).index
    df = df[df["customer_unique_id"].isin(eligible_users)].copy()
    return df.drop_duplicates(["customer_unique_id", "product_id"])


def train_matrix_factorization(train: pd.DataFrame) -> tuple[dict, dict, list[dict]]:
    user_ids = train["customer_unique_id"].astype(str).unique()
    item_ids = train["product_id"].astype(str).unique()
    user_map = {u: i for i, u in enumerate(user_ids)}
    item_map = {p: i for i, p in enumerate(item_ids)}

    u_idx = train["customer_unique_id"].astype(str).map(user_map).to_numpy()
    i_idx = train["product_id"].astype(str).map(item_map).to_numpy()
    ratings = train["rating"].to_numpy(dtype=np.float32)

    n_users = len(user_map)
    n_items = len(item_map)
    global_mean = float(ratings.mean())

    user_factors = RNG.normal(0, 0.08, size=(n_users, LATENT_DIM)).astype("float32")
    item_factors = RNG.normal(0, 0.08, size=(n_items, LATENT_DIM)).astype("float32")
    user_bias = np.zeros(n_users, dtype="float32")
    item_bias = np.zeros(n_items, dtype="float32")

    order = np.arange(len(ratings))
    history: list[dict] = []
    for epoch in range(1, EPOCHS + 1):
        RNG.shuffle(order)
        squared_error = 0.0
        for row in order:
            u = u_idx[row]
            i = i_idx[row]
            r = ratings[row]

            pred = global_mean + user_bias[u] + item_bias[i] + float(np.dot(user_factors[u], item_factors[i]))
            err = r - pred
            squared_error += err * err

            old_user = user_factors[u].copy()
            user_bias[u] += LR * (err - REG * user_bias[u])
            item_bias[i] += LR * (err - REG * item_bias[i])
            user_factors[u] += LR * (err * item_factors[i] - REG * user_factors[u])
            item_factors[i] += LR * (err * old_user - REG * item_factors[i])

        rmse = float(np.sqrt(squared_error / len(ratings)))
        history.append({"epoch": epoch, "rmse": round(rmse, 5)})
        print(f"epoch {epoch}/{EPOCHS} - rmse={rmse:.5f}")

    model = {
        "global_mean": global_mean,
        "user_factors": user_factors,
        "item_factors": item_factors,
        "user_bias": user_bias,
        "item_bias": item_bias,
        "user_map": user_map,
        "item_map": item_map,
    }
    return model, {"users": n_users, "items": n_items, "interactions": len(train)}, history


def cf_score(model: dict, user_id: str, product_id: str) -> float:
    u = model["user_map"].get(user_id)
    i = model["item_map"].get(product_id)
    if u is None or i is None:
        return model["global_mean"]
    raw = (
        model["global_mean"]
        + float(model["user_bias"][u])
        + float(model["item_bias"][i])
        + float(np.dot(model["user_factors"][u], model["item_factors"][i]))
    )
    return float(np.clip(raw, 0.05, 1.0))


def cb_score(user_categories: set[str], product_category: str, popularity: float, price_norm: float) -> float:
    category_match = 1.0 if product_category in user_categories else 0.18
    return float(np.clip(category_match * 0.72 + popularity * 0.2 + (1 - price_norm) * 0.08, 0.05, 1.0))


def make_product_name(category: str, index: int) -> tuple[str, str]:
    vi_category, base = CATEGORY_VI.get(category, ("Sản phẩm", "Sản phẩm nổi bật"))
    return vi_category, f"{base} Olist #{index:02d}"


def build_frontend_data(df: pd.DataFrame, model: dict, stats: dict, history: list[dict]) -> dict:
    product_stats = (
        df.groupby(["product_id", "product_category_name"], as_index=False)
        .agg(price=("price", "median"), rating=("review_score", "mean"), sold=("order_id", "count"))
        .sort_values(["sold", "rating"], ascending=False)
        .head(72)
        .reset_index(drop=True)
    )
    max_sold = float(product_stats["sold"].max())
    max_price = float(product_stats["price"].quantile(0.95))

    products_payload = []
    for idx, row in product_stats.iterrows():
        raw_category = str(row["product_category_name"])
        category, name = make_product_name(raw_category, idx + 1)
        products_payload.append(
            {
                "id": str(row["product_id"]),
                "name": name,
                "rawCategory": raw_category,
                "category": category,
                "price": int(max(25000, row["price"] * 4200)),
                "rating": round(float(row["rating"]), 1),
                "sold": int(row["sold"]),
                "popularity": round(float(row["sold"] / max_sold), 4),
                "priceNorm": round(float(min(row["price"] / max_price, 1.0)), 4),
                "color": PALETTE[idx % len(PALETTE)],
                "icon": ICONS.get(category, "●"),
            }
        )

    product_ids = {p["id"] for p in products_payload}
    eligible = df[df["product_id"].astype(str).isin(product_ids)].copy()
    user_profiles = []
    for user_id, group in eligible.groupby("customer_unique_id"):
        categories = group["product_category_name"].value_counts().head(4)
        if len(categories) < 2:
            continue
        user_profiles.append(
            {
                "id": str(user_id),
                "name": f"Khách hàng {len(user_profiles) + 1}",
                "label": CATEGORY_VI.get(categories.index[0], ("Mua sắm", ""))[0],
                "description": "Hồ sơ được tạo từ lịch sử mua hàng trong Olist dataset.",
                "rawInterests": [str(c) for c in categories.index.tolist()],
                "interests": [CATEGORY_VI.get(str(c), ("Sản phẩm", ""))[0] for c in categories.index.tolist()],
            }
        )
        if len(user_profiles) >= 4:
            break

    if not user_profiles:
        user_profiles = [
            {
                "id": str(next(iter(model["user_map"].keys()))),
                "name": "Khách hàng mẫu",
                "label": "Công nghệ",
                "description": "Hồ sơ mẫu từ dataset Olist.",
                "rawInterests": ["computers_accessories", "telephony"],
                "interests": ["Công nghệ"],
            }
        ]

    # Calculate similarity matrix among top 72 products based on trained SVD factors
    similarities_payload = {}
    for p_a in products_payload:
        id_a = p_a["id"]
        idx_a = model["item_map"].get(id_a)
        if idx_a is None:
            continue
        factor_a = model["item_factors"][idx_a]
        norm_a = float(np.linalg.norm(factor_a))
        
        sims = []
        for p_b in products_payload:
            id_b = p_b["id"]
            if id_a == id_b:
                continue
            idx_b = model["item_map"].get(id_b)
            if idx_b is None:
                continue
            factor_b = model["item_factors"][idx_b]
            norm_b = float(np.linalg.norm(factor_b))
            
            dot_prod = float(np.dot(factor_a, factor_b))
            cosine = dot_prod / (norm_a * norm_b + 1e-9)
            # Map cosine [-1, 1] to [0, 1] range for UI display
            score = float(np.clip((cosine + 1) / 2.0, 0.0, 1.0))
            sims.append({"id": id_b, "sim": round(score, 4)})
            
        # Sort by similarity score descending, take top 10
        sims = sorted(sims, key=lambda x: x["sim"], reverse=True)[:10]
        similarities_payload[id_a] = sims

    for profile in user_profiles:
        raw_interests = set(profile["rawInterests"])
        scores = []
        for product in products_payload:
            cf = cf_score(model, profile["id"], product["id"])
            cb = cb_score(raw_interests, product["rawCategory"], product["popularity"], product["priceNorm"])
            scores.append(
                {
                    "productId": product["id"],
                    "cf": round(cf, 4),
                    "cb": round(cb, 4),
                    "hybrid": round(cf * 0.55 + cb * 0.45, 4),
                }
            )
        profile["scores"] = sorted(scores, key=lambda x: x["hybrid"], reverse=True)

    return {
        "meta": {
            "dataset": "Olist Brazilian E-Commerce Public Dataset",
            "epochs": EPOCHS,
            "latentDim": LATENT_DIM,
            "training": stats,
            "history": history,
        },
        "products": products_payload,
        "profiles": user_profiles,
        "similarities": similarities_payload,
    }


def main() -> None:
    df = load_interactions()
    train = filter_training_frame(df)
    model, stats, history = train_matrix_factorization(train)
    payload = build_frontend_data(df, model, stats, history)

    OUT.write_text("window.MODEL_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    METRICS.write_text(json.dumps(payload["meta"], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")
    print(f"wrote {METRICS}")


if __name__ == "__main__":
    main()
