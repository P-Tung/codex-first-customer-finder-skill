# Prompt dùng trong Codex Desktop

Mở repo Vietnam Lead Finder trong **Codex Desktop**. Khi Codex hỏi quyền truy cập thư mục hoặc cho phép cài LaunchAgent local, hãy xem đúng yêu cầu rồi chấp thuận để dashboard chạy trên máy này. Không cần tự mở Terminal.

Dán prompt sau:

```text
Hãy dùng hướng dẫn trong AGENTS.md và tìm khách hàng tiềm năng là các doanh nghiệp SME tại Việt Nam có dấu hiệu công khai cho thấy họ có thể cần agency setup AI automation.

Trước khi tìm, chỉ hỏi tôi những thông tin còn thiếu có thể làm thay đổi đáng kể kết quả. Nếu tôi chưa đặt tiêu chuẩn chấm điểm, hãy dùng mặc định của skill và nói rõ các giả định. Không giới hạn ngành hay tự đặt thêm tiêu chí không được yêu cầu.

Hãy khởi động dashboard local mà không mở trình duyệt mặc định và xác minh nó đang chạy. Tìm từ các nguồn công khai, mở nguồn gốc khi có thể, phân biệt tín hiệu nhu cầu thật với tín hiệu thời điểm như tuyển dụng, mở rộng hoặc gọi vốn. Tạo shortlist có bằng chứng, điểm phù hợp, nguồn và ngày kiểm tra. Nếu tìm được website công ty, hãy hiển thị tên miền dễ đọc có link bấm được, kiểm tra header, footer, trang About/Contact và các link mạng xã hội từ website. Sau đó tìm, xác minh trang công ty công khai trên LinkedIn, Facebook, Instagram, TikTok, YouTube, Zalo và X. Ghi số điện thoại, email doanh nghiệp và hồ sơ chính thức chỉ khi nguồn công khai xác nhận, đồng thời lưu link nguồn cho từng trường. Ghi rõ kênh đã kiểm tra nhưng không tìm thấy hoặc không truy cập được. Không đoán, không dùng hồ sơ cá nhân của nhân viên thay cho trang công ty. Nhập shortlist vào dashboard; mở dashboard trong Comet để tôi duyệt. Không gửi tin nhắn hay liên hệ doanh nghiệp.
```

Sau đó CMO có thể tiếp tục bằng tiếng Việt, ví dụ:

- `Ưu tiên doanh nghiệp F&B ở TP.HCM, chỉ lấy lead có tín hiệu mạnh, tối đa 8 công ty.`
- `Tìm thêm 5 công ty, bỏ qua doanh nghiệp tôi đã liên hệ hoặc đánh dấu Bỏ qua.`
- `Đánh dấu [tên công ty] là Đã liên hệ và ghi chú [kết quả].`
- `Xuất danh sách hiện tại ra Excel.`

Codex cần quyền truy cập repo, công cụ tìm kiếm web được bật và quyền chạy lệnh local. Dashboard lưu dữ liệu trên máy CMO, chỉ nghe trên `127.0.0.1`; nó không cần VPS. Nếu Codex không điều khiển được trình duyệt, mở `http://127.0.0.1:4317` trong Comet.
