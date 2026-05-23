package com.nikita.smartspend.service.impl;

import com.nikita.smartspend.dto.BudgetStatusResponse;
import com.nikita.smartspend.dto.CreateTransactionRequest;
import com.nikita.smartspend.dto.TransactionResponse;
import com.nikita.smartspend.entity.Budget;
import com.nikita.smartspend.entity.Category;
import com.nikita.smartspend.entity.Transaction;
import com.nikita.smartspend.entity.User;
import com.nikita.smartspend.exception.ResourceNotFoundException;
import com.nikita.smartspend.repository.BudgetRepository;
import com.nikita.smartspend.repository.TransactionRepository;
import com.nikita.smartspend.repository.UserRepository;
import com.nikita.smartspend.service.AnomalyDetectionEngine;
import com.nikita.smartspend.service.CategorizationEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final BudgetRepository      budgetRepository;
    private final UserRepository        userRepository;
    private final CategorizationEngine  categorizationEngine;
    private final AnomalyDetectionEngine anomalyEngine;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    @Transactional
    public TransactionResponse createTransaction(CreateTransactionRequest req) {
        User user = getCurrentUser();

        // Step 1: Auto-categorise if not provided
        Category category = req.getCategory();
        boolean autoCat = false;
        if (category == null) {
            category = categorizationEngine.categorise(req.getDescription());
            autoCat = (category != Category.OTHER);
        }

        // Step 2: Build transaction
        Transaction tx = Transaction.builder()
                .amount(req.getAmount())
                .type(req.getType())
                .category(category)
                .description(req.getDescription())
                .transactionDate(req.getTransactionDate())
                .autoCategorised(autoCat)
                .user(user)
                .build();

        // Step 3: Anomaly detection (only for expenses)
        boolean anomaly = false;
        if (req.getType() == Transaction.TransactionType.EXPENSE) {
            anomaly = anomalyEngine.isAnomaly(tx);
        }
        tx.setAnomaly(anomaly);

        // Step 4: Save
        Transaction saved = transactionRepository.save(tx);

        // Step 5: Build response
        TransactionResponse resp = mapToResponse(saved);
        if (anomaly) {
            resp.setAnomalyNote(anomalyEngine.getAnomalyExplanation(saved));
        }
        return resp;
    }

    @Transactional
    public TransactionResponse updateTransaction(Long id, CreateTransactionRequest req) {
        User user = getCurrentUser();
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
        if (!tx.getUser().getId().equals(user.getId()))
            throw new RuntimeException("You can only edit your own transactions");

        Category category = req.getCategory();
        boolean autoCat = false;
        if (category == null) {
            category = categorizationEngine.categorise(req.getDescription());
            autoCat = (category != Category.OTHER);
        }

        tx.setAmount(req.getAmount());
        tx.setType(req.getType());
        tx.setCategory(category);
        tx.setDescription(req.getDescription());
        tx.setTransactionDate(req.getTransactionDate());
        tx.setAutoCategorised(autoCat);

        boolean anomaly = false;
        if (req.getType() == Transaction.TransactionType.EXPENSE) {
            anomaly = anomalyEngine.isAnomaly(tx);
        }
        tx.setAnomaly(anomaly);

        Transaction saved = transactionRepository.save(tx);

        TransactionResponse resp = mapToResponse(saved);
        if (anomaly) {
            resp.setAnomalyNote(anomalyEngine.getAnomalyExplanation(saved));
        }
        return resp;
    }

    public Page<TransactionResponse> getTransactions(LocalDate from, LocalDate to, int page, int size) {
        User user = getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());
        return transactionRepository
                .findByUserIdAndTransactionDateBetween(user.getId(), from, to, pageable)
                .map(this::mapToResponse);
    }

    public Page<TransactionResponse> getAnomalies(int page, int size) {
        User user = getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());
        return transactionRepository
                .findByUserIdAndIsAnomalyTrue(user.getId(), pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void deleteTransaction(Long id) {
        User user = getCurrentUser();
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
        if (!tx.getUser().getId().equals(user.getId()))
            throw new RuntimeException("You can only delete your own transactions");
        transactionRepository.delete(tx);
    }

    /**
     * Returns budget status for a specific category in a month.
     * Correctly sums only the spending in that category.
     */
    public BudgetStatusResponse checkBudget(Long userId, Category category, String monthYear) {
        Optional<Budget> budgetOpt = budgetRepository
                .findByUserIdAndCategoryAndMonthYear(userId, category, monthYear);
        if (budgetOpt.isEmpty()) return null;

        Budget budget = budgetOpt.get();
        YearMonth ym = YearMonth.parse(monthYear, MONTH_FMT);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        // ← KEY FIX: sum only THIS category's spending, not all expenses
        BigDecimal spent = transactionRepository.sumExpenseByCategoryAndMonth(
                userId, category, from, to);
        if (spent == null) spent = BigDecimal.ZERO;

        BigDecimal limit = budget.getLimitAmount();
        BigDecimal remaining = limit.subtract(spent);
        double usedPct = limit.compareTo(BigDecimal.ZERO) == 0 ? 0 :
                spent.divide(limit, 4, RoundingMode.HALF_UP).doubleValue() * 100;

        BudgetStatusResponse resp = new BudgetStatusResponse();
        resp.setCategory(category.name());
        resp.setLimitAmount(limit);
        resp.setSpentAmount(spent);
        resp.setRemainingAmount(remaining);
        resp.setUsedPercent(usedPct);
        resp.setOverBudget(usedPct > 100);
        resp.setStatus(usedPct > 100 ? "OVER_BUDGET" : usedPct > 80 ? "WARNING" : "ON_TRACK");
        return resp;
    }

    private TransactionResponse mapToResponse(Transaction t) {
        TransactionResponse r = new TransactionResponse();
        r.setId(t.getId());
        r.setAmount(t.getAmount());
        r.setType(t.getType().name());
        r.setCategory(t.getCategory().name());
        r.setDescription(t.getDescription());
        r.setTransactionDate(t.getTransactionDate());
        r.setAutoCategorised(t.isAutoCategorised());
        r.setAnomaly(t.isAnomaly());
        r.setCreatedAt(t.getCreatedAt());
        return r;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }
}
