package com.nikita.smartspend.controller;

import com.nikita.smartspend.dto.MonthlyReportResponse;
import com.nikita.smartspend.entity.MonthlyReport;
import com.nikita.smartspend.entity.User;
import com.nikita.smartspend.repository.MonthlyReportRepository;
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
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final MonthlyReportRepository reportRepo;
    private final UserRepository userRepo;
    private final BudgetHealthEngine healthEngine;
    private final TransactionRepository txRepo;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    /**
     * POST /api/reports/generate?monthYear=2025-04
     * Always recalculates — deletes any stale cached report and regenerates fresh from live transactions.
     */
    @PostMapping("/generate")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> generate(
            @RequestParam(defaultValue = "") String monthYear) {
        User user = getCurrentUser();
        if (monthYear.isBlank()) {
            monthYear = YearMonth.now()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM"));
        }
        YearMonth ym = YearMonth.parse(monthYear, MONTH_FMT);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        // Check if there are any transactions for this month
        if (txRepo.findByUserIdAndTransactionDateBetween(user.getId(), from, to).isEmpty()) {
            return ResponseEntity.badRequest().body("No transactions found for this month");
        }

        // Delete stale cached report so regeneration picks up latest transactions
        reportRepo.deleteByUserIdAndMonthYear(user.getId(), monthYear);
        MonthlyReport report = healthEngine.generateReportForUser(user, monthYear);
        return ResponseEntity.ok(mapToResponse(report, user.getId()));
    }

    /** DELETE /api/reports/{monthYear} — delete a specific month's report */
    @DeleteMapping("/{monthYear}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> delete(@PathVariable String monthYear) {
        User user = getCurrentUser();
        if (reportRepo.existsByUserIdAndMonthYear(user.getId(), monthYear)) {
            reportRepo.deleteByUserIdAndMonthYear(user.getId(), monthYear);
            return ResponseEntity.ok().body("Report deleted successfully");
        }
        return ResponseEntity.notFound().build();
    }

    /** GET /api/reports — all reports for the current user */
    @GetMapping
    public ResponseEntity<List<MonthlyReportResponse>> all() {
        User user = getCurrentUser();
        return ResponseEntity.ok(
            reportRepo.findByUserIdOrderByMonthYearDesc(user.getId())
                      .stream().map(r -> mapToResponse(r, user.getId())).toList());
    }

    /** GET /api/reports/{monthYear} — single month */
    @GetMapping("/{monthYear}")
    public ResponseEntity<MonthlyReportResponse> byMonth(@PathVariable String monthYear) {
        User user = getCurrentUser();
        return reportRepo.findByUserIdAndMonthYear(user.getId(), monthYear)
                .map(r -> ResponseEntity.ok(mapToResponse(r, user.getId())))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Maps a stored report to the response DTO.
     * For the current calendar month the totals are recalculated live from the
     * transaction table so that the report always matches the dashboard figures,
     * even when new transactions have been added since the report was last generated.
     */
    private MonthlyReportResponse mapToResponse(MonthlyReport r, Long userId) {
        MonthlyReportResponse resp = new MonthlyReportResponse();
        resp.setMonthYear(r.getMonthYear());
        resp.setHealthScore(r.getHealthScore());
        resp.setHealthLabel(r.getHealthLabel());
        resp.setCategorySummary(r.getCategorySummary());
        resp.setAnomalyCount(r.getAnomalyCount());
        resp.setTopInsight(r.getTopInsight());
        resp.setGeneratedAt(r.getGeneratedAt());

        // Recalculate income/expense live for the current month so this report's
        // totals are always consistent with the dashboard's live figures.
        String currentMonth = YearMonth.now().format(MONTH_FMT);
        if (r.getMonthYear().equals(currentMonth)) {
            YearMonth ym = YearMonth.parse(r.getMonthYear(), MONTH_FMT);
            LocalDate from = ym.atDay(1);
            LocalDate to   = ym.atEndOfMonth();
            BigDecimal liveIncome  = txRepo.sumIncomeForMonth(userId, from, to);
            BigDecimal liveExpense = txRepo.sumExpenseForMonth(userId, from, to);
            BigDecimal liveSavings = liveIncome.subtract(liveExpense);
            resp.setTotalIncome(liveIncome);
            resp.setTotalExpense(liveExpense);
            resp.setNetSavings(liveSavings);
            if (liveIncome.compareTo(BigDecimal.ZERO) > 0) {
                resp.setSavingsRate(liveSavings
                    .divide(liveIncome, 4, RoundingMode.HALF_UP)
                    .doubleValue() * 100);
            }
        } else {
            resp.setTotalIncome(r.getTotalIncome());
            resp.setTotalExpense(r.getTotalExpense());
            resp.setNetSavings(r.getNetSavings());
            if (r.getTotalIncome().compareTo(BigDecimal.ZERO) > 0) {
                resp.setSavingsRate(r.getNetSavings()
                    .divide(r.getTotalIncome(), 4, RoundingMode.HALF_UP)
                    .doubleValue() * 100);
            }
        }
        return resp;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
