# SendoAI Shop

Web bán sản phẩm kiểu marketplace có đăng nhập mẫu và hệ thống gợi ý sản phẩm Hybrid.

## Dữ liệu và mô hình

- Dataset: Olist Brazilian E-Commerce Public Dataset.
- Dữ liệu sử dụng: customers, orders, order items, products, reviews.
- Collaborative Filtering: Matrix Factorization bằng SGD.
- Content-Based: so khớp danh mục yêu thích, độ phổ biến và mức giá.
- Hybrid score: `w * CF + (1 - w) * CB`.
- Số epoch huấn luyện: 5.

Kết quả train hiện tại nằm trong `training_metrics.json`, dữ liệu cho frontend nằm trong `model_data.js`.

## Chạy local

Mở trực tiếp `index.html` bằng trình duyệt.

## Train lại model

Dataset gốc đặt trong thư mục `data/` và không commit lên GitHub.

```powershell
python train_hybrid.py
```

Script sẽ sinh lại:

- `model_data.js`
- `training_metrics.json`
