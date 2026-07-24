# Manager and Staff Frontend Plan

## Goal

Tách frontend thành hai workspace gọn và đúng nghiệp vụ: Manager tiếp nhận khách, check-in và phân công; Staff chỉ xử lý session được giao bằng hai thao tác bắt đầu và hoàn tất rửa.

## Tasks

- [x] 1. Chuẩn hóa role và quyền truy cập → Mở rộng `UserRole` thành `CUSTOMER | STAFF | MANAGER | ADMIN`; cập nhật auth redirect, workspace theme, role guard và navigation. Manager được vào `/manager/*`; Staff chỉ vào `/staff/*`. Verify: route guard build pass; demo Manager account được thêm vào frontend.

- [x] 2. Tạo shared status/action model → Dùng đúng enum `BookingStatus` (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`) và `WashSessionStatus` (`PENDING`, `QUEUED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`). Tách label UI `Hoàn tất` khỏi API status `COMPLETED`; loại bỏ khái niệm Staff `Nhận việc`. Verify: Staff chỉ hiển thị action Start/Complete theo trạng thái.

- [x] 3. Tách Manager Operations khỏi `StaffOperationsFlow` → Tạo `manager-operations-page` dùng queue toàn cửa hàng; giữ các action `Create Session`, `Check-in`, `Refresh`. Backend hiện tự động phân staff khi tạo/check-in session. Verify: UI gọi đúng create/check-in endpoint; mutation và queue refresh được nối.

- [x] 4. Thiết kế Manager Dashboard tối giản → Tạo `manager-dashboard-view` với 4 KPI chính: chờ check-in, đang chờ rửa, đang rửa, hoàn thành hôm nay; thêm queue ưu tiên, staff availability và cảnh báo quá thời gian. Không thêm Customer Management hoặc dữ liệu hồ sơ khách hàng ngoài thông tin tối thiểu của booking. Verify: build pass với responsive layout.

- [ ] 5. Thiết kế Manager Staff Assignment → Tạo màn hình hoặc panel `manager-staff` gồm staff online/offline, đang rảnh/bận, session đang phụ trách và thao tác assign/transfer. Chặn gán staff không active hoặc session đã `COMPLETED/CANCELLED`. Verify: sau assign/transfer, queue Manager cập nhật và Staff nhận đúng session của mình.

- [x] 6. Tái cấu trúc Staff workspace → Navigation chỉ còn `Dashboard`, `My Sessions`, `History`, `Profile`; bỏ route/action check-in, create session, assign staff, transfer staff và queue toàn cửa hàng khỏi Staff. Verify: UI lọc theo `assignedStaffId`; route check-in redirect về My Sessions.

- [x] 7. Xây Staff My Sessions theo 2 trạng thái làm việc → `CHECKED_IN` hiển thị nút lớn `Bắt đầu rửa`; `IN_PROGRESS` hiển thị nút lớn `Hoàn tất rửa`; `COMPLETED` chỉ hiển thị kết quả. Mỗi card chỉ có biển số, loại xe, dịch vụ, ghi chú Manager và thời gian dự kiến. Verify: Start/Complete dùng đúng endpoint và có loading/toast/invalidation.

- [x] 8. Xây Staff Session Detail tối giản → Detail chỉ phục vụ đọc thông tin và thao tác hiện tại; không có check-in, payment, customer management hoặc đổi assignment. Verify: action suy ra theo trạng thái, chống double-click và có loading/error state.

- [x] 9. Cập nhật API/query và notification → Tách query key Manager/Staff; Manager polling queue toàn cửa hàng, Staff polling assigned sessions; Staff chỉ nhận notification khi session đã `CHECKED_IN`. Verify: build pass và query filter theo user.

- [x] 10. Verification và UX audit → Chạy `npm test` và `npm run build`; kiểm tra route generation, loading/error/empty state và responsive layout. E2E với backend cần chờ backend bổ sung role Manager.

## Done When

- [ ] Manager không còn Customer Management và không xử lý thay Staff các thao tác rửa thông thường.
- [x] Manager có thể tạo session và check-in khách; staff được backend tự động phân công hiện tại.
- [ ] Staff chỉ thấy session được giao.
- [ ] Staff chỉ có hai action chính: bắt đầu rửa và hoàn tất rửa.
- [ ] Booking và WashSession hiển thị đúng trạng thái backend.
- [ ] Không còn UI/action `Nhận việc` hoặc `Successful` được gửi như một enum backend.
- [x] Frontend build và test pass. Flow end-to-end với Manager API bị chặn cho tới khi backend hỗ trợ role `MANAGER`.

## Notes

- Backend hiện có các endpoint vận hành cho tạo session, queue, check-in, start, complete và transfer; frontend nên tái sử dụng service hiện tại trong `src/features/operations/lib/operations-service.ts`.
- Cần bổ sung role `MANAGER` ở backend và mở `Operations*Controller` cho `MANAGER` trước khi test authorization/end-to-end; chỉ ẩn menu ở frontend không đủ để bảo vệ API.
- `COMPLETED` là enum trạng thái chính thức. Nếu muốn dùng chữ `Successful`, chỉ dùng làm copy hiển thị, không dùng trong type hoặc request payload.
