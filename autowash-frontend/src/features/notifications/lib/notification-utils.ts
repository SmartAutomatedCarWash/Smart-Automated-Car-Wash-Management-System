export function translateNotificationField(text: string, language: string): string {
  if (!text) return text;
  let translated = text;

  if (language === "en") {
    // Titles VI -> EN
    if (translated === "Đặt lịch thành công!") return "Booking Successful!";
    if (translated === "Booking đã được xác nhận!") return "Booking Confirmed!";
    if (translated === "Xe đang được rửa") return "Car Wash in Progress";
    if (translated === "Rửa xe hoàn tất") return "Car Wash Completed";
    if (translated === "Chúc mừng! Bạn đã thăng hạng") return "Congratulations! You have been upgraded";
    if (translated === "Nhắc nhở: Lịch rửa xe ngày mai") return "Reminder: Car wash tomorrow";
    if (translated === "Hạng thành viên đã thay đổi") return "Membership tier changed";
    
    // Messages VI -> EN
    translated = translated.replace("Bạn đã đặt lịch rửa xe thành công vào ", "You have successfully booked a car wash on ");
    translated = translated.replace(" lúc ", " at ");
    translated = translated.replace(" đã được thanh toán và xác nhận thành công.", " has been successfully paid and confirmed.");
    translated = translated.replace(" đã được xác nhận.", " has been confirmed.");
    translated = translated.replace("Phiên rửa xe của bạn đã bắt đầu", "Your car wash session has started");
    translated = translated.replace("Phiên rửa xe của bạn đã hoàn tất. Cảm ơn bạn đã sử dụng dịch vụ!", "Your car wash session is complete. Thank you for using our service!");
    translated = translated.replace("Hạng thành viên của bạn đã được nâng lên ", "Your membership tier has been upgraded to ");
    translated = translated.replace("Bạn có lịch rửa xe vào lúc ", "You have a car wash scheduled at ");
    translated = translated.replace(" ngày ", " on ");
    translated = translated.replace(". Vui lòng đến đúng giờ!", ". Please arrive on time!");
    translated = translated.replace("Hạng thành viên của bạn đã được cập nhật thành ", "Your membership tier has been updated to ");
    translated = translated.replace(" bởi Quản trị viên.", " by Administrator.");
  } else if (language === "vi") {
    // Titles EN -> VI
    if (translated === "Booking Successful!") return "Đặt lịch thành công!";
    if (translated === "Booking Confirmed!") return "Booking đã được xác nhận!";
    if (translated === "Car Wash in Progress") return "Xe đang được rửa";
    if (translated === "Car Wash Completed") return "Rửa xe hoàn tất";
    if (translated === "Congratulations! You have been upgraded") return "Chúc mừng! Bạn đã thăng hạng";
    if (translated === "Reminder: Car wash tomorrow") return "Nhắc nhở: Lịch rửa xe ngày mai";
    if (translated === "Membership tier changed") return "Hạng thành viên đã thay đổi";
    
    // Messages EN -> VI
    translated = translated.replace("You have successfully booked a car wash on ", "Bạn đã đặt lịch rửa xe thành công vào ");
    translated = translated.replace(" at ", " lúc ");
    translated = translated.replace(" has been successfully paid and confirmed.", " đã được thanh toán và xác nhận thành công.");
    translated = translated.replace(" has been confirmed.", " đã được xác nhận.");
    translated = translated.replace("Your car wash session has started", "Phiên rửa xe của bạn đã bắt đầu");
    translated = translated.replace("Your car wash session is complete. Thank you for using our service!", "Phiên rửa xe của bạn đã hoàn tất. Cảm ơn bạn đã sử dụng dịch vụ!");
    translated = translated.replace("Your membership tier has been upgraded to ", "Hạng thành viên của bạn đã được nâng lên ");
    translated = translated.replace("You have a car wash scheduled at ", "Bạn có lịch rửa xe vào lúc ");
    translated = translated.replace(" on ", " ngày ");
    translated = translated.replace(". Please arrive on time!", ". Vui lòng đến đúng giờ!");
    translated = translated.replace("Your membership tier has been updated to ", "Hạng thành viên của bạn đã được cập nhật thành ");
    translated = translated.replace(" by Administrator.", " bởi Quản trị viên.");
  }

  return translated;
}
