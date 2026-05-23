package com.nikita.smartspend.controller;

import com.nikita.smartspend.dto.CreateTransactionRequest;
import com.nikita.smartspend.dto.TransactionResponse;
import com.nikita.smartspend.service.impl.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService txService;

    /**
     * POST /api/transactions
     * Logs income or expense. Category is optional — auto-categorised from description if absent.
     * Anomaly detection runs automatically on every EXPENSE.
     */
    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @Valid @RequestBody CreateTransactionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(txService.createTransaction(req));
    }

    /**
     * GET /api/transactions?from=2025-04-01&to=2025-04-30
     */
    @GetMapping
    public ResponseEntity<Page<TransactionResponse>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(txService.getTransactions(from, to, page, size));
    }

    /**
     * GET /api/transactions/anomalies
     */
    @GetMapping("/anomalies")
    public ResponseEntity<Page<TransactionResponse>> anomalies(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(txService.getAnomalies(page, size));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CreateTransactionRequest req) {
        return ResponseEntity.ok(txService.updateTransaction(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        txService.deleteTransaction(id);
        return ResponseEntity.ok("Transaction deleted.");
    }
}
