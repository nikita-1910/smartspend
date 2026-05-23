package com.nikita.smartspend.dto;

import com.nikita.smartspend.entity.Category;
import com.nikita.smartspend.entity.Transaction;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateTransactionRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;

    @NotNull(message = "Type is required (INCOME or EXPENSE)")
    private Transaction.TransactionType type;

    /** Optional — auto-categorised from description if omitted */
    private Category category;

    @NotBlank(message = "Description is required")
    @Size(max = 255)
    private String description;

    @NotNull(message = "Transaction date is required")
    private LocalDate transactionDate;
}
