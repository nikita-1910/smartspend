package com.nikita.smartspend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrate() {
        log.info("Starting startup database column modification migration...");
        try {
            // Alter transactions.category to VARCHAR(50)
            jdbcTemplate.execute("ALTER TABLE transactions MODIFY category VARCHAR(50)");
            log.info("Successfully altered transactions.category column length.");
        } catch (Exception e) {
            log.warn("Could not alter transactions.category: " + e.getMessage());
        }

        try {
            // Alter budgets.category to VARCHAR(50)
            jdbcTemplate.execute("ALTER TABLE budgets MODIFY category VARCHAR(50)");
            log.info("Successfully altered budgets.category column length.");
        } catch (Exception e) {
            log.warn("Could not alter budgets.category: " + e.getMessage());
        }
    }
}
