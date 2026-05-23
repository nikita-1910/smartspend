package com.nikita.smartspend.service;

import com.nikita.smartspend.entity.Category;
import com.nikita.smartspend.entity.Transaction;
import com.nikita.smartspend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnomalyDetectionEngine {

    private final TransactionRepository transactionRepository;

    @Value("${app.anomaly.stddev-multiplier:2.5}")
    private double stddevMultiplier;

    private static final int MIN_SAMPLE_SIZE = 2;
    private static final int LOOKBACK_DAYS = 90;

    public boolean isAnomaly(Transaction transaction) {
        if (transaction.getType() == Transaction.TransactionType.INCOME) return false;

        Long userId = transaction.getUser().getId();
        Category category = transaction.getCategory();
        LocalDate since = LocalDate.now().minusDays(LOOKBACK_DAYS);

        List<Transaction> history = transactionRepository
                .findRecentByUserAndCategory(userId, category, since);

        if (history.size() < MIN_SAMPLE_SIZE) {
            log.debug("Not enough history ({} records) for anomaly detection in category {}", history.size(), category);
            return false;
        }

        double[] amounts = history.stream().mapToDouble(t -> t.getAmount().doubleValue()).toArray();
        double mean   = calculateMean(amounts);
        double stddev = calculateStdDev(amounts, mean);
        // Floor stddev at 20% of mean to prevent false positives from zero or small variance
        double adjustedStdDev = Math.max(stddev, mean * 0.2);
        double threshold = mean + (stddevMultiplier * adjustedStdDev);
        double currentAmount = transaction.getAmount().doubleValue();

        boolean anomaly = currentAmount > threshold;
        if (anomaly) {
            log.info("ANOMALY DETECTED — User: {}, Category: {}, Amount: {}, Threshold: {}",
                     userId, category, currentAmount, threshold);
        }
        return anomaly;
    }

    public String getAnomalyExplanation(Transaction transaction) {
        Long userId = transaction.getUser().getId();
        Category category = transaction.getCategory();
        LocalDate since = LocalDate.now().minusDays(LOOKBACK_DAYS);

        List<Transaction> history = transactionRepository
                .findRecentByUserAndCategory(userId, category, since);

        if (history.size() < MIN_SAMPLE_SIZE) return null;

        double[] amounts = history.stream().mapToDouble(t -> t.getAmount().doubleValue()).toArray();
        double mean = calculateMean(amounts);

        return String.format(
            "This transaction (₹%.0f) is unusually high for %s. Your average spend in this category is ₹%.0f.",
            transaction.getAmount().doubleValue(),
            category.name().replace("_", " ").toLowerCase(),
            mean
        );
    }

    private double calculateMean(double[] values) {
        double sum = 0;
        for (double v : values) sum += v;
        return sum / values.length;
    }

    private double calculateStdDev(double[] values, double mean) {
        double sumSquaredDiff = 0;
        for (double v : values) { double d = v - mean; sumSquaredDiff += d * d; }
        return Math.sqrt(sumSquaredDiff / values.length);
    }
}
