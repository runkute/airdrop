# Fanpage Auto Post Tool

Tool tự động viết và đăng bài lên các Facebook Fanpage của công ty, sử dụng Claude AI để tạo nội dung.

## Tính năng

- **Tạo nội dung tự động** bằng Claude AI với nhiều giọng điệu khác nhau
- **Đăng bài ngay lập tức** lên một hoặc nhiều fanpage cùng lúc
- **Lên lịch đăng bài** theo ngày/giờ cụ thể, hàng ngày, hàng tuần, hoặc theo cron
- **Tạo chuỗi bài** nhiều góc độ từ một chủ đề
- **Kiểm tra trạng thái** token và thông tin các page

## Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd airdrop

# Cài dependencies
pip install -r requirements.txt

# Hoặc cài dưới dạng CLI tool
pip install -e .
```

## Cấu hình

1. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

2. Điền thông tin vào `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...

# Mỗi page cần 2 biến: PAGE_TOKEN_<TÊN> và PAGE_ID_<TÊN>
PAGE_TOKEN_CONG_TY=EAA...
PAGE_ID_CONG_TY=123456789

PAGE_TOKEN_SAN_PHAM=EAA...
PAGE_ID_SAN_PHAM=987654321
```

### Lấy Facebook Page Access Token

1. Vào [Facebook Developer](https://developers.facebook.com)
2. Tạo App → Business type
3. Thêm Facebook Login product
4. Dùng Graph API Explorer: chọn page → lấy **Page Access Token**
5. Dùng [Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) để extend token dài hạn

## Sử dụng

### Xem danh sách pages đã cấu hình
```bash
fanpage pages
# hoặc
python main.py pages
```

### Tạo nội dung (không đăng)
```bash
fanpage generate "Ra mắt dòng sản phẩm mới mùa hè"
fanpage generate "Khuyến mãi cuối năm" --tone promotional --lang vi
fanpage generate "Tips chăm sóc sức khỏe" --count 5   # Tạo 5 bài
```

### Đăng bài ngay
```bash
# Đăng lên page cụ thể
fanpage post "Ra mắt sản phẩm mới" CONG_TY

# Đăng lên nhiều page
fanpage post "Khuyến mãi 50%" CONG_TY SAN_PHAM

# Đăng lên tất cả pages
fanpage post "Chúc mừng năm mới" --all-pages

# Xem trước trước khi đăng
fanpage post "Thông báo tuyển dụng" CONG_TY --preview

# Tùy chỉnh giọng điệu và thêm context
fanpage post "Flash sale" CONG_TY --tone exciting --context "Giảm 70% toàn bộ sản phẩm"
```

### Lên lịch đăng bài
```bash
# Một lần vào ngày giờ cụ thể
fanpage schedule "Bài event" CONG_TY --type once --when 2025-06-01T09:00:00

# Mỗi ngày lúc 8:00 sáng
fanpage schedule "Tip hàng ngày" CONG_TY --type daily --when 08:00

# Mỗi thứ Hai lúc 9:00 sáng
fanpage schedule "Content thứ 2" CONG_TY --type weekly --when monday,09:00

# Theo cron expression (thứ 2,4,6 lúc 7:30)
fanpage schedule "Post 3 lần/tuần" CONG_TY --type cron --when "30 7 * * 1,3,5"
```

### Chạy scheduler (giữ lịch hoạt động)
```bash
fanpage run-scheduler
```

### Quản lý lịch
```bash
fanpage list-schedules        # Xem tất cả lịch
fanpage cancel-schedule <ID>  # Hủy lịch theo ID
```

## Giọng điệu (tone)

| Tone | Mô tả |
|------|-------|
| `professional` | Chuyên nghiệp, uy tín (mặc định) |
| `friendly` | Thân thiện, gần gũi |
| `exciting` | Sôi nổi, hứng khởi |
| `informative` | Thông tin, giáo dục |
| `promotional` | Quảng bá, kêu gọi hành động |

## Cấu trúc dự án

```
airdrop/
├── fanpage_tool/
│   ├── __init__.py
│   ├── config.py           # Đọc cấu hình từ .env
│   ├── content_generator.py # Tạo nội dung bằng Claude AI
│   ├── facebook_poster.py  # Đăng bài qua Facebook Graph API
│   ├── scheduler.py        # Lên lịch đăng bài tự động
│   └── cli.py              # Giao diện dòng lệnh
├── main.py
├── setup.py
├── requirements.txt
└── .env.example
```
