package com.nikita.smartspend.controller;

import com.nikita.smartspend.dto.DashboardResponse;
import com.nikita.smartspend.entity.Budget;
import com.nikita.smartspend.entity.User;
import com.nikita.smartspend.repository.BudgetRepository;
import com.nikita.smartspend.repository.TransactionRepository;
import com.nikita.smartspend.repository.UserRepository;
import com.nikita.smartspend.service.BudgetHealthEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UserRepository userRepo;
    private final TransactionRepository txRepo;
    private final BudgetRepository budgetRepo;
    private final BudgetHealthEngine healthEngine;

    @GetMapping
    public ResponseEntity<DashboardResponse> dashboard(@RequestParam(required = false) String month) {
        User user = getCurrentUser();
        String monthYear = month != null && month.matches("^\\d{4}-\\d{2}$")
            ? month : YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        YearMonth ym = YearMonth.parse(monthYear);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        BigDecimal income  = txRepo.sumIncomeForMonth(user.getId(), from, to);
        BigDecimal expense = txRepo.sumExpenseForMonth(user.getId(), from, to);
        BigDecimal savings = income.subtract(expense);
        double savingsRate = income.compareTo(BigDecimal.ZERO) > 0
            ? savings.divide(income, 4, RoundingMode.HALF_UP).doubleValue() * 100 : 0;

        long anomalyCount = txRepo.countAnomaliesForMonth(user.getId(), from, to);
        int score  = healthEngine.calculateHealthScore(user.getId(), monthYear);
        String label    = healthEngine.healthLabel(score);

        // Top spend category
        List<Object[]> spendRows = txRepo.sumExpenseByCategory(user.getId(), from, to);
        String topCat = null;
        BigDecimal topAmt = BigDecimal.ZERO;
        for (Object[] row : spendRows) {
            BigDecimal amt = (BigDecimal) row[1];
            if (amt.compareTo(topAmt) > 0) { topAmt = amt; topCat = row[0].toString(); }
        }

        System.out.println("DEBUG DashboardController: received month = '" + month + "', resolved monthYear = '" + monthYear + "'");

        // Budgets over limit using map-based spent map to guarantee consistency
        java.util.Map<com.nikita.smartspend.entity.Category, BigDecimal> spentMap = new java.util.HashMap<>();
        for (Object[] row : spendRows) {
            spentMap.put((com.nikita.smartspend.entity.Category) row[0], (BigDecimal) row[1]);
        }

        List<Budget> budgets = budgetRepo.findByUserIdAndMonthYear(user.getId(), monthYear);
        long overBudget = budgets.stream().filter(b -> {
            BigDecimal spent = spentMap.getOrDefault(b.getCategory(), BigDecimal.ZERO);
            return spent.compareTo(b.getLimitAmount()) > 0;
        }).count();

        DashboardResponse resp = new DashboardResponse();
        resp.setCurrentMonth(monthYear);
        resp.setTotalIncomeThisMonth(income);
        resp.setTotalExpenseThisMonth(expense);
        resp.setNetSavingsThisMonth(savings);
        resp.setSavingsRatePercent(savingsRate);
        resp.setCurrentHealthScore(score);
        resp.setCurrentHealthLabel(label);
        resp.setAnomaliesThisMonth((int) anomalyCount);
        resp.setBudgetsOverLimit((int) overBudget);
        resp.setTopSpendCategory(topCat);
        resp.setTopSpendAmount(topAmt);
        return ResponseEntity.ok(resp);
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
