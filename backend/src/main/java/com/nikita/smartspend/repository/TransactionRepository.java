package com.nikita.smartspend.repository;

import com.nikita.smartspend.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Page<Transaction> findByUserIdAndTransactionDateBetween(
        Long userId, LocalDate from, LocalDate to, Pageable pageable);

    List<Transaction> findByUserIdAndTransactionDateBetween(
        Long userId, LocalDate from, LocalDate to);

    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId " +
           "AND t.category = :category AND t.type = com.nikita.smartspend.entity.Transaction$TransactionType.EXPENSE " +
           "AND t.transactionDate >= :since ORDER BY t.transactionDate DESC")
    List<Transaction> findRecentByUserAndCategory(
        @Param("userId") Long userId,
        @Param("category") com.nikita.smartspend.entity.Category category,
        @Param("since") LocalDate since);

    @Query("SELECT t.category, SUM(t.amount) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = com.nikita.smartspend.entity.Transaction$TransactionType.EXPENSE " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "GROUP BY t.category")
    List<Object[]> sumExpenseByCategory(
        @Param("userId") Long userId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = com.nikita.smartspend.entity.Transaction$TransactionType.INCOME " +
           "AND t.transactionDate BETWEEN :from AND :to")
    BigDecimal sumIncomeForMonth(
        @Param("userId") Long userId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = com.nikita.smartspend.entity.Transaction$TransactionType.EXPENSE " +
           "AND t.transactionDate BETWEEN :from AND :to")
    BigDecimal sumExpenseForMonth(
        @Param("userId") Long userId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.user.id = :userId AND t.type = com.nikita.smartspend.entity.Transaction$TransactionType.EXPENSE " +
           "AND t.category = :category AND t.transactionDate BETWEEN :from AND :to")
    BigDecimal sumExpenseByCategoryAndMonth(
        @Param("userId") Long userId,
        @Param("category") com.nikita.smartspend.entity.Category category,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to);

    @Query(value = "SELECT COUNT(*) FROM transactions WHERE user_id = :userId " +
               "AND is_anomaly = true " +
               "AND transaction_date BETWEEN :from AND :to",
       nativeQuery = true)
    long countAnomaliesForMonth(
        @Param("userId") Long userId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to);

    Page<Transaction> findByUserIdAndIsAnomalyTrue(Long userId, Pageable pageable);

    Page<Transaction> findByUserIdAndCategory(Long userId, com.nikita.smartspend.entity.Category category, Pageable pageable);
}
