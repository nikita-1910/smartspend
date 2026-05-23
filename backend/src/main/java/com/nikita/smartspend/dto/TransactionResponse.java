package com.nikita.smartspend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class TransactionResponse {
    private Long id;
    private BigDecimal amount;
    private String type;
    private String category;
    private String description;
    private LocalDate transactionDate;
    private boolean autoCategorised;
    private boolean anomaly;
    private String anomalyNote;
    private LocalDateTime createdAt;
}
