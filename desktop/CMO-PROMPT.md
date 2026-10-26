# Prompt dành cho CMO

Dùng prompt này trong **Codex Desktop** sau khi mở repo `codex-first-customer-finder-skill` và cấp quyền chạy lệnh local. ChatGPT web chat thông thường không có quyền tự cài phần mềm lên Mac.

```text
Hãy cài và chạy Vietnam Lead Finder trong repo đang mở.

1. Đọc README.md và làm theo hướng dẫn trong first-customer-finder/SKILL.md; dùng công cụ tìm kiếm web sẵn có trong môi trường AI.
2. Chạy ./lead-finder setup nếu chưa cài, sau đó chạy ./lead-finder start.
3. Nếu tôi chưa cung cấp chân dung khách hàng, hãy hỏi tôi mô tả bằng tiếng Việt.
4. Nghiên cứu doanh nghiệp Việt Nam theo mô tả đó. Giữ lại nguồn gốc, bằng chứng, ngày kiểm tra và điểm phù hợp cho từng doanh nghiệp. Không tự gửi tin nhắn hay liên hệ.
5. Tạo analysis.json theo schema trong first-customer-finder/references/report-artifact.md, chạy generator của skill để xác thực, rồi nhập bằng ./lead-finder import /đường/dẫn/analysis.json.
6. Mở http://127.0.0.1:4317 và báo cho tôi khi dashboard có kết quả.

Khi tôi yêu cầu tìm thêm, chạy ./lead-finder brief để đọc các trạng thái đã lưu, giữ nguyên tiêu chí đã nêu, tránh doanh nghiệp tôi đã đánh dấu Bỏ qua hoặc Đã liên hệ, và không ghi đè dữ liệu cũ. Chỉ cập nhật trạng thái khi tôi yêu cầu.
```

Nếu AI đang dùng không có quyền chạy lệnh trên máy, người dùng hoặc quản trị viên cần chạy setup và start một lần. Dashboard và database sau đó chạy local.
