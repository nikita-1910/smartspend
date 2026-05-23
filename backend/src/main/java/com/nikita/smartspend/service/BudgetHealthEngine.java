package com.nikita.smartspend.service;

import com.nikita.smartspend.entity.*;
import com.nikita.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BudgetHealthEngine {

    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final MonthlyReportRepository reportRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    /* ── Health Score ─────────────────────────────────────── */

    public int calculateHealthScore(Long userId, String monthYear) {
        YearMonth ym = YearMonth.parse(monthYear, MONTH_FMT);
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();

        List<Object[]> spendingRows = transactionRepository.sumExpenseByCategory(userId, from, to);
        Map<Category, BigDecimal> spentByCategory = new HashMap<>();
        for (Object[] row : spendingRows) {
            Category cat = (Category) row[0];
            spentByCategory.put(cat, (BigDecimal) row[1]);
        }

        List<Budget> budgets = budgetRepository.findByUserIdAndMonthYear(userId, monthYear);

        int score = 100;
        for (Budget budget : budgets) {
            BigDecimal spent = spentByCategory.getOrDefault(budget.getCategory(), BigDecimal.ZERO);
            BigDecimal limit = budget.getLimitAmount();
            if (limit.compareTo(BigDecimal.ZERO) == 0)
                continue;

            double usedPct = spent.divide(limit, 4, RoundingMode.HALF_UP).doubleValue() * 100;
            if (usedPct > 100) {
                int penalty = (int) Math.min((usedPct - 100) / 5, 20);
                score -= penalty;
            } else if (usedPct > 80) {
                score -= 5;
            }
        }

        long anomalyCount = transactionRepository.countAnomaliesForMonth(userId, from, to);
        score -= (int) Math.min(anomalyCount * 5, 20);

        BigDecimal income = transactionRepository.sumIncomeForMonth(userId, from, to);
        BigDecimal expense = transactionRepository.sumExpenseForMonth(userId, from, to);
        if (income.compareTo(BigDecimal.ZERO) > 0) {
            double savingsRate = income.subtract(expense)
                    .divide(income, 4, RoundingMode.HALF_UP).doubleValue() * 100;
            if (savingsRate < 10)
                score -= 10;
            else if (savingsRate >= 20)
                score += 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    public String healthLabel(int score) {
        if (score >= 90)
            return "Excellent";
        if (score >= 70)
            return "Good";
        if (score >= 50)
            return "Fair";
        return "Needs Attention";
    }

    /* ── Category Summary ────────────────────────────────── */

    public String buildCategorySummary(Long userId, String monthYear) {
        YearMonth ym = YearMonth.parse(monthYear, MONTH_FMT);
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();

        List<Object[]> spendingRows = transactionRepository.sumExpenseByCategory(userId, from, to);
        List<Budget> budgets = budgetRepository.findByUserIdAndMonthYear(userId, monthYear);

        Map<Category, BigDecimal> budgetMap = new HashMap<>();
        for (Budget b : budgets)
            budgetMap.put(b.getCategory(), b.getLimitAmount());

        StringBuilder sb = new StringBuilder();
        for (Object[] row : spendingRows) {
            Category cat = (Category) row[0];
            BigDecimal spent = (BigDecimal) row[1];
            BigDecimal limit = budgetMap.get(cat);

            sb.append(cat.name()).append(": spent=").append(spent.setScale(2, RoundingMode.HALF_UP));
            if (limit != null) {
                BigDecimal variance = limit.subtract(spent);
                sb.append(", budget=").append(limit.setScale(2, RoundingMode.HALF_UP));
                if (variance.compareTo(BigDecimal.ZERO) < 0)
                    sb.append(", OVER by ").append(variance.abs().setScale(2, RoundingMode.HALF_UP));
                else
                    sb.append(", under by ").append(variance.setScale(2, RoundingMode.HALF_UP));
            }
            sb.append(" | ");
        }
        return sb.length() > 0 ? sb.substring(0, sb.length() - 3) : "No expenses recorded";
    }

    public String topInsight(Long userId, String monthYear) {
        YearMonth ym = YearMonth.parse(monthYear, MONTH_FMT);
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();

        List<Object[]> rows = transactionRepository.sumExpenseByCategory(userId, from, to);
        List<Budget> budgets = budgetRepository.findByUserIdAndMonthYear(userId, monthYear);
        Map<Category, BigDecimal> budgetMap = new HashMap<>();
        for (Budget b : budgets)
            budgetMap.put(b.getCategory(), b.getLimitAmount());

        Category worstCat = null;
        double worstPct = 0;
        for (Object[] row : rows) {
            Category cat = (Category) row[0];
            BigDecimal spent = (BigDecimal) row[1];
            BigDecimal limit = budgetMap.get(cat);
            if (limit != null && limit.compareTo(BigDecimal.ZERO) > 0) {
                double pct = spent.divide(limit, 4, RoundingMode.HALF_UP).doubleValue() * 100;
                if (pct > worstPct) {
                    worstPct = pct;
                    worstCat = cat;
                }
            }
        }

        if (worstCat != null && worstPct > 100) {
            return String.format(
                    "Your highest overspend was in %s (%.0f%% of budget used). Consider reviewing this category next month.",
                    worstCat.name().replace("_", " ").toLowerCase(), worstPct);
        }

        BigDecimal income = transactionRepository.sumIncomeForMonth(userId, from, to);
        BigDecimal expense = transactionRepository.sumExpenseForMonth(userId, from, to);
        if (income.compareTo(BigDecimal.ZERO) > 0) {
            double rate = income.subtract(expense).divide(income, 4, RoundingMode.HALF_UP).doubleValue() * 100;
            if (rate >= 20)
                return String.format("Great job! You saved %.1f%% of your income this month.", rate);
            if (rate < 10)
                return String.format("Your savings rate is %.1f%%. Try to target 20%%.", rate);
        }

        return "Keep logging your transactions for more personalised insights!";
    }

    /* ── Scheduled + On-demand Report Generation ─────────── */

    @Scheduled(cron = "${app.scheduler.report-cron}")
    @Transactional
    public void generateMonthlyReportsForAllUsers() {
        String prevMonth = YearMonth.now().minusMonths(1).format(MONTH_FMT);
        log.info("=== Scheduled report generation for month: {} ===", prevMonth);
        List<User> allUsers = userRepository.findAll();
        int generated = 0, skipped = 0;
        for (User user : allUsers) {
            try {
                if (!prevMonth.equals(YearMonth.now().format(MONTH_FMT))
                        && reportRepository.existsByUserIdAndMonthYear(user.getId(), prevMonth)) {
                    skipped++;
                    continue;
                }
                generateReportForUser(user, prevMonth);
                generated++;
            } catch (Exception e) {
                log.error("Failed report for user {}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("=== Report generation done. Generated: {}, Skipped: {} ===", generated, skipped);
    }

    @Transactional
    public MonthlyReport generateReportForUser(User user, String monthYear) {
        YearMonth ym = YearMonth.parse(monthYear, DateTimeFormatter.ofPattern("yyyy-MM"));
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        // Calculate totals for THIS month only
        BigDecimal income  = transactionRepository.sumIncomeForMonth(user.getId(), from, to);
        BigDecimal expense = transactionRepository.sumExpenseForMonth(user.getId(), from, to);
        BigDecimal savings = income.subtract(expense);

        int healthScore = calculateHealthScore(user.getId(), monthYear);
        String healthLabel = healthLabel(healthScore);

        long anomalyCount = transactionRepository.countAnomaliesForMonth(user.getId(), from, to);

        // Category breakdown
        List<Object[]> catRows = transactionRepository.sumExpenseByCategory(user.getId(), from, to);
        StringBuilder summary = new StringBuilder();
        for (Object[] row : catRows) {
            Category cat = (Category) row[0];
            BigDecimal amt = (BigDecimal) row[1];
            summary.append(cat.name())
                   .append(": spent=").append(amt)
                   .append(", budget=N/A, under by N/A | ");
        }

        // Build report entity
        MonthlyReport report = new MonthlyReport();
        report.setUser(user);
        report.setMonthYear(monthYear);
        report.setTotalIncome(income);
        report.setTotalExpense(expense);
        report.setNetSavings(savings);
        report.setHealthScore(healthScore);
        report.setHealthLabel(healthLabel);
        report.setAnomalyCount((int) anomalyCount);
        report.setCategorySummary(summary.length() > 0 ? summary.toString() : "No expenses recorded");
        report.setTopInsight(generateInsight(income, expense, savings));
        report.setGeneratedAt(LocalDateTime.now());

        return reportRepository.save(report);
    }

    private String generateInsight(BigDecimal income, BigDecimal expense, BigDecimal savings) {
        if (expense.compareTo(income) > 0) return "Expenses exceeded income this month.";
        if (savings.compareTo(BigDecimal.ZERO) > 0) return "You saved money this month!";
        return "No savings recorded.";
    }
}
