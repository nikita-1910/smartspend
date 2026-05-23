package com.nikita.smartspend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DashboardResponse {
    private String currentMonth;
    private BigDecimal totalIncomeThisMonth;
    private BigDecimal totalExpenseThisMonth;
    private BigDecimal netSavingsThisMonth;
    private double savingsRatePercent;
    private Integer currentHealthScore;
    private String currentHealthLabel;
    private int anomaliesThisMonth;
    private int budgetsOverLimit;
    private String topSpendCategory;
    private BigDecimal topSpendAmount;
}
