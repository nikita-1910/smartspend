package com.nikita.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "monthly_reports",
    indexes = { @Index(name = "idx_report_user_month", columnList = "user_id, month_year") }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MonthlyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 7)
    private String monthYear;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalIncome;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalExpense;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal netSavings;

    @Column(nullable = false)
    private Integer healthScore;

    @Column(nullable = false)
    private String healthLabel;

    @Column(columnDefinition = "TEXT")
    private String categorySummary;

    @Column(nullable = false)
    @Builder.Default
    private Integer anomalyCount = 0;

    @Column
    private String topInsight;

    @CreationTimestamp
    private LocalDateTime generatedAt;
}
