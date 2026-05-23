package com.nikita.smartspend.repository;

import com.nikita.smartspend.entity.Budget;
import com.nikita.smartspend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUserIdAndMonthYear(Long userId, String monthYear);

    Optional<Budget> findByUserIdAndCategoryAndMonthYear(
        Long userId, Category category, String monthYear);

    boolean existsByUserIdAndCategoryAndMonthYear(
        Long userId, Category category, String monthYear);
}
