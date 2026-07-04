package com.autowash.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;

import javax.sql.DataSource;
import jakarta.annotation.PostConstruct;

@Configuration
@DependsOn("flywayInitializer")
public class DemoDataFlywayConfig {

    @Autowired
    private DataSource dataSource;
    
    @Value("${spring.flyway.baseline-on-migrate:false}")
    private boolean baselineOnMigrate;

    @PostConstruct
    public void migrateDemoData() {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/demo")
                .table("flyway_demo_history")
                .baselineOnMigrate(baselineOnMigrate)
                .validateOnMigrate(false)
                .outOfOrder(true)
                .load();
        
        flyway.migrate();
    }
}
