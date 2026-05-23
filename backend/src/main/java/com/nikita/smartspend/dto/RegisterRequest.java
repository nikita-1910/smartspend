package com.nikita.smartspend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @Email(message = "Valid email required")
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @DecimalMin(value = "0.0", message = "Monthly income target must be positive")
    private BigDecimal monthlyIncomeTarget = BigDecimal.ZERO;
}
