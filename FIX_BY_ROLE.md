# Issues cần fix theo role

Ghi chú:
- File này tổng hợp các vấn đề được phát hiện trong lúc test happy-path.
- Mục tiêu là chia rõ theo role để dễ phân công.
- Phần avatar ở admin account detail hiện chưa đồng bộ với avatar phía customer, nhưng mục này được xem là **optional**: có cũng được, chưa có cũng không chặn luồng chính.

## Customer

### 1. Loyalty progress bar chưa đồng bộ lifetime points
- Trang: `/customer/loyalty`
- Vấn đề: thanh tiến trình tier chưa chạy đúng theo `lifetime points`.

### 2. Profile readonly fields quá mờ
- Trang: `/customer/profile`
- Vấn đề: các ô không cho sửa đang hiển thị quá mờ, khó đọc.

### 3. My vouchers chưa có detail flow thật
- Trang: `/customer/loyalty` -> `My vouchers`
- Vấn đề: bấm `View detail` đang nhảy sang trang placeholder “Tính năng đang được cập nhật”.

### 4. Combo History chưa có detail link
- Trang: `/customer/history` -> `Combo History`
- Vấn đề: chưa có link/luồng xem chi tiết từng combo.

### 5. Point history cộng/trừ điểm chưa đồng nhất UI
- Trang: `/customer/history` -> `Point history`
- Vấn đề: dòng cộng điểm và trừ điểm đang hiển thị khác style.

### 6. Vehicle delete chưa sync UI ngay
- Trang: `/customer/all-vehicles`, `/customer/vehicles/{id}`
- Vấn đề: xóa xe xong quay lại danh sách thì nếu chưa refresh, xe vẫn còn hiển thị.

### 7. Vehicle soft delete xong không add lại cùng biển được
- Trang: tạo xe customer
- Vấn đề: sau khi xóa mềm, tạo lại cùng biển số bị báo trùng.

### 8. Chưa có restore flow cho vehicle đã xóa mềm
- Vấn đề: hệ thống đang soft delete vehicle nhưng chưa có chức năng restore/reactivate.

### 9. Sau khi create vehicle đi thẳng vào detail có nút delete ngay
- Trang: `/customer/vehicles/{id}`
- Vấn đề: vừa tạo xong đã hiện `Delete this vehicle`, dễ bấm nhầm.
- Hướng mong muốn: bỏ phần delete ngay trong case vừa tạo xong.

### 10. Customer booking note cần kiểm tra/fix hiển thị
- Vấn đề: phần note của khách đã từng được nhắc là chưa thấy hiển thị đúng chỗ mong muốn trong booking detail.

## Manager

### 1. Auto-assign staff chưa đúng business rule
- Vấn đề: logic assign staff chưa thực sự ưu tiên đúng người có KPI thấp / số lượt rửa thấp / workload thấp.

### 2. Auto-assign staff cần đúng thứ tự ưu tiên
- Thứ tự mong muốn:
  1. KPI tuần thấp hơn
  2. Số booking trong ngày ít hơn
  3. Trạng thái bận/rảnh tại thời điểm đó

## Admin

### 1. Avatar ở admin account detail chưa đồng bộ với avatar customer
- Trang: admin account detail
- Vấn đề: chưa thấy avatar giống phía customer/user profile.
- Mức độ ưu tiên: **optional**
- Ghi chú: có thể làm sau, không chặn demo hay luồng chính.

## Cross-role / Business rule

### 1. Quy tắc trùng biển số xe giữa nhiều user chưa chốt rõ
- Vấn đề: vehicle có liên kết với `customer_id`, nhưng `plate` đang unique toàn hệ thống.
- Hệ quả:
  - user A xóa mềm xe
  - user B nhập trùng biển số
  - hệ thống chặn, nhưng chưa có rule xử lý rõ ràng

### 2. Cần chốt nghiệp vụ cho duplicate plate
- Đề xuất rule:
  - Nếu cùng user nhập lại biển số đã xóa mềm -> restore/reactivate xe cũ
  - Nếu khác user nhập trùng biển số -> không cho tạo tự động, cần thông báo rõ hoặc có bước xác minh/admin xử lý
