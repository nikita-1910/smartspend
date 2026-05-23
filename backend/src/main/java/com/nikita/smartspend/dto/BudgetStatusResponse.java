package com.nikita.smartspend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class BudgetStatusResponse {
    private String category;
    private BigDecimal limitAmount;
    private BigDecimal spentAmount;
    private BigDecimal remainingAmount;
    private double usedPercent;
    private boolean isOverBudget;
    /** "ON_TRACK", "WARNING" (>80%), "OVER_BUDGET" */
    private String status;
}
