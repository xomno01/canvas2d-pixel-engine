# Canvas 2D Retro Pixel Engine (Antigravity Skill)

> **Kỹ thuật đồ họa Pixel Art thuần Canvas 2D - Đóng gói dạng Skill cho AI Assistant & Lập trình viên.**
> Reverse-engineered & tinh chỉnh từ các tựa game retro web production (Tiệm Nét Cỏ).

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloudflare%20Pages-orange)](https://tiem-net-co-dua-xe-pages.pages.dev/)
[![Engine](https://img.shields.io/badge/Engine-Pure%20Canvas%202D-green)](#)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-blue)](#)

---

## 🌟 Tính Năng & Kỹ Thuật Cốt Lõi

1. **Sprite Ma Trận Ký Tự (`Character Matrix`)**:
   - Định nghĩa hình vẽ trực tiếp trong code bằng mảng ký tự kèm bảng màu (palette).
   - Dễ dàng hoán đổi màu sắc (palette swapping) theo ID mà không cần tải ảnh ngoài.
2. **Nướng Sprite vào Cache LRU (`Offscreen LRU Baking`)**:
   - Mỗi tổ hợp sprite + màu + hướng lật chỉ vẽ 1 lần duy nhất lên canvas phụ.
   - Các frame tiếp theo chỉ cần `drawImage` từ cache, triệt tiêu gánh nặng CPU, đạt chuẩn 60 FPS mượt mà.
3. **Font Chữ Bitmap 3×5 Tích Hợp (`PixelFont`)**:
   - Tự dựng font nhị phân 15-bit cho chữ cái và chữ số.
   - Không bị trễ tải font hệ thống, hỗ trợ bóng đổ (drop shadow) và căn lề.
4. **Buffer Độ Phân Giải Thấp & Integer Scaling**:
   - Render trong không gian ảo cố định (160×240 hoặc 320×180).
   - Chiếu lên màn hình thật bằng hệ số zoom nguyên số (`Math.floor`) với `imageSmoothingEnabled = false` để giữ cạnh pixel sắc nét.
5. **Chiếu Sáng Dynamic Composite (Ngày/Đêm & Đèn Pha)**:
   - Dùng `destination-out` để khoét lỗ ánh sáng hình nón đèn pha xe và đèn đường tròn.
   - Dùng `lighter` cho quầng phát sáng màu, tia lửa, nitro và còi cảnh sát.

---

## 📁 Cấu Trúc Thư Mục Skill

```text
canvas2d-pixel-engine/
├── SKILL.md                          # Tài liệu chỉ dẫn kích hoạt skill cho AI Agent
├── README.md                         # Giới thiệu & hướng dẫn sử dụng
├── references/                       # Tài liệu hướng dẫn kỹ thuật chi tiết
│   ├── 01-char-matrix-sprites.md     # Định nghĩa ma trận ký tự & palette swapping
│   ├── 02-lru-sprite-baking.md       # Cơ chế cache LRU nướng canvas phụ
│   ├── 03-bitmap-font-3x5.md         # Font chữ nhị phân 3x5 & căn lề
│   ├── 04-low-res-integer-scaling.md # Buffer ảo & chiếu tỉ lệ nguyên
│   └── 05-composite-lighting-fx.md   # Ánh sáng dynamic destination-out & lighter
├── templates/                        # Mã nguồn mẫu sẵn sàng sử dụng
│   ├── minimal-canvas-shell.html     # Khung HTML & touch controls
│   └── pixel-renderer-starter.js     # Khởi tạo render loop & pipeline
├── examples/                         # Ví dụ thực tế
│   ├── pixel-racer-demo/             # Game Đua Xe Pixel hoàn chỉnh
│   └── char-matrix-viewer.html       # Công cụ giao diện vẽ pixel art xuất code ma trận
└── scripts/
    └── test-render.js                # Kịch bản kiểm thử headless tự động
```

---

## 🚀 Hướng Dẫn Sử Dụng Trên Máy Khác

### Cách 1: Thêm vào Antigravity / Agentic Coding Assistant
1. Giải nén file `canvas2d-pixel-engine.zip`.
2. Sao chép thư mục `canvas2d-pixel-engine` vào:
   - **Cấu hình toàn cục**: `~/.gemini/antigravity/skills/canvas2d-pixel-engine/`
   - **Hoặc theo dự án**: `<project-root>/.agents/skills/canvas2d-pixel-engine/`
3. Khi bạn yêu cầu agent làm game hoặc đồ họa pixel, agent sẽ tự động kích hoạt `SKILL.md` và tuân thủ đúng chuẩn kiến trúc này.

### Cách 2: Chạy Thử Game Demo
Mở file `examples/pixel-racer-demo/index.html` trực tiếp trên bất kỳ trình duyệt nào (không cần cài thêm bất kỳ thư viện hay server nào).

Hoặc trải nghiệm bản online đã triển khai tại:
👉 **https://tiem-net-co-dua-xe-pages.pages.dev/**
