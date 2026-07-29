package com.autowash.repository;


import com.autowash.entity.LoyaltyAccount;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, UUID> {

    Optional<LoyaltyAccount> findByCustomerId(UUID customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from LoyaltyAccount account where account.customer.id = :customerId")
    Optional<LoyaltyAccount> findLockedByCustomerId(@Param("customerId") UUID customerId);

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer"})
    java.util.List<LoyaltyAccount> findAll();

    @Query("select upper(account.tier), count(account) from LoyaltyAccount account group by upper(account.tier)")
    List<Object[]> countByTier();
}
