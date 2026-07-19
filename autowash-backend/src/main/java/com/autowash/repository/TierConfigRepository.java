package com.autowash.repository;

import com.autowash.entity.TierConfig;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TierConfigRepository extends JpaRepository<TierConfig, String> {
    List<TierConfig> findByActiveTrueOrderByRankOrderAsc();

    List<TierConfig> findAllByOrderByRankOrderAsc();

    boolean existsByRankOrder(int rankOrder);
}
