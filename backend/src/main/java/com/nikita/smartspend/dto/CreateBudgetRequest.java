package com.nikita.smartspend.dto;

import com.nikita.smartspend.entity.Category;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateBudgetRequest {

    @NotNull
    private Category category;

    @NotNull
    @DecimalMin("1.0")
    private BigDecimal limitAmount;

    /** Format: "2025-04" */
    @NotBlank
    @Pattern(regexp = "\\d{4}-\\d{2}", message = "monthYear must be YYYY-MM")
    private String monthYear;
}
