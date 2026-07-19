package com.autowash.shared.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final ErrorCode errorCode;
    private final Map<String, Object> error;

    public ApiException(HttpStatus status, String message, ErrorCode errorCode) {
        this(status, message, errorCode, null);
    }

    public ApiException(HttpStatus status, String message, ErrorCode errorCode, Map<String, Object> error) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
        this.error = error;
    }

    public ApiException(HttpStatus status, String message, String errorCode) {
        this(status, message, ErrorCode.valueOf(errorCode), null);
    }

    public ApiException(HttpStatus status, String message, String errorCode, Map<String, Object> error) {
        this(status, message, ErrorCode.valueOf(errorCode), error);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message, ErrorCode.RESOURCE_NOT_FOUND);
    }

    public static ApiException validation(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, ErrorCode.VALIDATION_ERROR);
    }

    public static ApiException businessRule(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, message, ErrorCode.BUSINESS_RULE_VIOLATION);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode.name();
    }

    public Map<String, Object> getError() {
        return error;
    }
}
