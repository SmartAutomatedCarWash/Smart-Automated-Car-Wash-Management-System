package com.autowash.repository;

import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByPhone(String phone);
    boolean existsByPhoneAndIdNot(String phone, UUID id);
    Optional<User> findByPhone(String phone);
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByEmailInIgnoreCase(List<String> emails);

    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    long countByRole(UserRole role);
    long countByRoleAndStatus(UserRole role, UserStatus status);
    long countByRoleAndCreatedAtAfter(UserRole role, java.time.Instant createdAt);
    List<User> findByRoleAndStatusOrderByFullNameAsc(UserRole role, UserStatus status);
    Page<User> findByRoleAndStatusOrderByFullNameAsc(UserRole role, UserStatus status, Pageable pageable);
    List<User> findByRoleOrderByFullNameAsc(UserRole role);
    Page<User> findByRoleOrderByFullNameAsc(UserRole role, Pageable pageable);




    @Query("SELECT u FROM User u JOIN LoyaltyAccount la ON u.id = la.customer.id WHERE u.role = 'CUSTOMER' AND u.status = 'ACTIVE' AND la.tier = :tier")
    List<User> findActiveCustomersByLoyaltyTier(@Param("tier") String tier);

    @Query("SELECT u FROM User u WHERE u.role = 'CUSTOMER' AND u.status = 'ACTIVE'")
    List<User> findAllActiveCustomers();

    @Query("""
            SELECT account FROM User account
            WHERE (:#{#role == null} = true OR account.role = :role)
              AND (:#{#status == null} = true OR account.status = :status)
              AND (
                :#{#searchLike == null} = true
                OR LOWER(account.fullName) LIKE :searchLike
                OR LOWER(account.phone) LIKE :searchLike
                OR LOWER(COALESCE(account.email, '')) LIKE :searchLike
              )
            """)
    Page<User> searchAccounts(
            @Param("role") UserRole role,
            @Param("status") UserStatus status,
            @Param("searchLike") String searchLike,
            Pageable pageable
    );

    @Query("""
            SELECT account FROM User account
            WHERE account.role IN :roles
              AND (:#{#status == null} = true OR account.status = :status)
              AND (
                :#{#searchLike == null} = true
                OR LOWER(account.fullName) LIKE :searchLike
                OR LOWER(account.phone) LIKE :searchLike
                OR LOWER(COALESCE(account.email, '')) LIKE :searchLike
              )
            """)
    Page<User> searchAccountsByRoles(
            @Param("roles") Collection<UserRole> roles,
            @Param("status") UserStatus status,
            @Param("searchLike") String searchLike,
            Pageable pageable
    );
}

