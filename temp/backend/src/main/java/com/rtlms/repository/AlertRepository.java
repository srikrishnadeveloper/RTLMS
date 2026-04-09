package com.rtlms.repository;

import com.rtlms.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends MongoRepository<Alert, String> {
    List<Alert> findByStatus(String status);
    List<Alert> findBySeverity(String severity);
    List<Alert> findBySeverityAndStatus(String severity, String status);
    List<Alert> findByApplicationId(String applicationId);
    long countByStatus(String status);
}
