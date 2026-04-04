package com.paiagent.repository;

import com.paiagent.entity.LLMProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LLMProviderRepository extends JpaRepository<LLMProvider, Long> {
    Optional<LLMProvider> findByName(String name);
}
