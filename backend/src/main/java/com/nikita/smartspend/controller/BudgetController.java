package com.nikita.smartspend.controller;

import com.nikita.smartspend.dto.BudgetStatusResponse;
import com.nikita.smartspend.dto.CreateBudgetRequest;
import com.nikita.smartspend.entity.Budget;
import com.nikita.smartspend.entity.User;
import com.nikita.smartspend.repository.BudgetRepository;
import com.nikita.smartspend.repository.UserRepository;
import com.nikita.smartspend.service.impl.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetRepository budgetRepo;
    private final UserRepository userRepo;
    private final TransactionService txService;

    @PostMapping
    public ResponseEntity<String> createBudget(@Valid @RequestBody CreateBudgetRequest req) {
        User user = getCurrentUser();
        if (budgetRepo.existsByUserIdAndCategoryAndMonthYear(
                user.getId(), req.getCategory(), req.getMonthYear())) {
            return ResponseEntity.badRequest()
                    .body("Budget already exists for " + req.getCategory() + " in " + req.getMonthYear());
        }
        Budget budget = Budget.builder()
                .user(user)
                .category(req.getCategory())
                .limitAmount(req.getLimitAmount())
                .monthYear(req.getMonthYear())
                .build();
        budgetRepo.save(budget);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Budget set: " + req.getCategory() + " = ₹" + req.getLimitAmount()
                      + " for " + req.getMonthYear());
    }

    /**
     * GET /api/budgets/status?monthYear=2025-04
     */
    @GetMapping("/status")
    public ResponseEntity<List<BudgetStatusResponse>> status(@RequestParam String monthYear) {
        User user = getCurrentUser();
        List<Budget> budgets = budgetRepo.findByUserIdAndMonthYear(user.getId(), monthYear);
        List<BudgetStatusResponse> result = new ArrayList<>();
        for (Budget b : budgets) {
            BudgetStatusResponse status = txService.checkBudget(
                user.getId(), b.getCategory(), monthYear);
            if (status != null) result.add(status);
        }
        return ResponseEntity.ok(result);
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
