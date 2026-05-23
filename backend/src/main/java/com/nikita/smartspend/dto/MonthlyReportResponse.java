package com.nikita.smartspend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MonthlyReportResponse {
    private String monthYear;
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal netSavings;
    private double savingsRate;
    private Integer healthScore;
    private String healthLabel;
    private String categorySummary;
    private Integer anomalyCount;
    private String topInsight;
    private LocalDateTime generatedAt;
}
