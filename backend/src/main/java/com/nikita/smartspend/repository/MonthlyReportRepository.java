package com.nikita.smartspend.repository;

import com.nikita.smartspend.entity.MonthlyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MonthlyReportRepository extends JpaRepository<MonthlyReport, Long> {

    Optional<MonthlyReport> findByUserIdAndMonthYear(Long userId, String monthYear);

    List<MonthlyReport> findByUserIdOrderByMonthYearDesc(Long userId);

    boolean existsByUserIdAndMonthYear(Long userId, String monthYear);

    void deleteByUserIdAndMonthYear(Long userId, String monthYear);
}
