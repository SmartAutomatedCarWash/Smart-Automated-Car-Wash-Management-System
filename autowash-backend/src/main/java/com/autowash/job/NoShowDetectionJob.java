package com.autowash.job;

import com.autowash.service.BookingNoShowService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NoShowDetectionJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(NoShowDetectionJob.class);

    private final BookingNoShowService bookingNoShowService;

    public NoShowDetectionJob(BookingNoShowService bookingNoShowService) {
        this.bookingNoShowService = bookingNoShowService;
    }

    @Scheduled(
            fixedDelayString = "${autowash.booking.no-show.scan-delay-ms:60000}",
            initialDelayString = "${autowash.booking.no-show.initial-delay-ms:60000}"
    )
    public void detectNoShows() {
        int marked = bookingNoShowService.markOverdueBookingsNoShow();
        if (marked > 0) {
            LOGGER.info("Marked {} overdue bookings as no-show", marked);
        }
    }
}
