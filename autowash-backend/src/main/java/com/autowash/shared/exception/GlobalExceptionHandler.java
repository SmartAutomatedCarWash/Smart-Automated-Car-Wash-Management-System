package com.autowash.shared.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        List<Map<String, String>> errors = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toFieldError)
                .toList();

        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "statusCode", 400,
                "message", "Validation failed",
                "errorCode", "VALIDATION_ERROR",
                "errors", errors,
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException exception) {
        List<Map<String, String>> errors = exception.getConstraintViolations()
                .stream()
                .map(violation -> Map.of(
                        "field", extractConstraintField(violation.getPropertyPath().toString()),
                        "message", violation.getMessage() == null ? "Invalid value" : violation.getMessage(),
                        "code", "INVALID_FORMAT"
                ))
                .toList();

        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "statusCode", 400,
                "message", "Validation failed",
                "errorCode", "VALIDATION_ERROR",
                "errors", errors,
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "statusCode", 400,
                "message", "Validation failed",
                "errorCode", "VALIDATION_ERROR",
                "errors", List.of(Map.of(
                        "field", exception.getName(),
                        "message", "Invalid value",
                        "code", "INVALID_FORMAT"
                )),
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        System.err.println("HttpMessageNotReadableException caught: " + exception.getMessage());
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "statusCode", 400,
                "message", "Validation failed",
                "errorCode", "VALIDATION_ERROR",
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException exception) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("statusCode", exception.getStatus().value());
        body.put("message", exception.getMessage());
        body.put("errorCode", exception.getErrorCode());
        if (exception.getError() != null) {
            body.put("error", exception.getError());
        }
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(exception.getStatus()).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "statusCode", 403,
                "message", "Access denied",
                "errorCode", "ACCESS_DENIED",
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(NoResourceFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "statusCode", 404,
                "message", "Resource not found",
                "errorCode", "RESOURCE_NOT_FOUND",
                "timestamp", Instant.now().toString()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(Exception exception) {
        log.error("Unexpected API error", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "statusCode", 500,
                "message", "Unexpected server error",
                "errorCode", "INTERNAL_SERVER_ERROR",
                "timestamp", Instant.now().toString()
        ));
    }

    private Map<String, String> toFieldError(FieldError error) {
        return Map.of(
                "field", error.getField(),
                "message", error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage(),
                "code", "INVALID_FORMAT"
        );
    }

    private String extractConstraintField(String propertyPath) {
        int dotIndex = propertyPath.lastIndexOf('.');
        return dotIndex >= 0 ? propertyPath.substring(dotIndex + 1) : propertyPath;
    }
}
