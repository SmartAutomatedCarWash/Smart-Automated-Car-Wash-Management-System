package com.autowash.repository;

import com.autowash.entity.SystemSettings;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingsRepository extends JpaRepository<SystemSettings, Integer> {
}
