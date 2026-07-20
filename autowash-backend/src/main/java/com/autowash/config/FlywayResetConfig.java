package com.autowash.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Activated only when Spring profile "reset-db" is active.
 *
 * Usage on Render (one-time reset):
 *   1. Add env vars:
 *        SPRING_PROFILES_ACTIVE=reset-db
 *        SPRING_FLYWAY_CLEAN_DISABLED=false
 *   2. Deploy → DB is wiped and rebuilt from V1 + V100.
 *   3. After deploy succeeds, REMOVE both env vars and redeploy normally.
 *
 * WARNING: Never leave SPRING_PROFILES_ACTIVE=reset-db permanently —
 * every restart will wipe all data.
 */
@Configuration
@Profile("reset-db")
public class FlywayResetConfig {

    @Autowired
    private DataSource dataSource;

    @Value("${spring.flyway.default-schema:public}")
    private String defaultSchema;

    @Bean
    public FlywayMigrationStrategy resetAndMigrate() {
        return flyway -> {
            // Clean the demo history table first so Flyway can resolve its own metadata
            // before the main schema objects (that demo history references) are dropped.
            Flyway.configure()
                    .dataSource(dataSource)
                    .locations("classpath:db/demo")
                    .table("flyway_demo_history")
                    .defaultSchema(defaultSchema)
                    .cleanDisabled(false)
                    .load()
                    .clean();

            // Clean + migrate main schema (V1)
            flyway.clean();
            flyway.migrate();

            // Migrate demo seed (V100) — DemoDataFlywayConfig will also run,
            // but it is idempotent (ON CONFLICT / WHERE NOT EXISTS), so safe to run twice.
            Flyway.configure()
                    .dataSource(dataSource)
                    .locations("classpath:db/demo")
                    .table("flyway_demo_history")
                    .defaultSchema(defaultSchema)
                    .validateOnMigrate(false)
                    .outOfOrder(true)
                    .ignoreMigrationPatterns("*:missing", "*:future")
                    .cleanDisabled(false)
                    .load()
                    .migrate();
        };
    }
}
