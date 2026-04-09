package com.rtlms.service;

import com.rtlms.model.Alert;
import com.rtlms.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;

    public List<Alert> getActive() {
        return alertRepository.findByStatus("ACTIVE");
    }

    public List<Alert> getAll() {
        return alertRepository.findAll();
    }

    public long escalateCritical() {
        List<Alert> critical = alertRepository.findBySeverityAndStatus("CRITICAL", "ACTIVE");
        critical.forEach(a -> {
            a.setStatus("ACKNOWLEDGED");
            a.setLastTriggered(Instant.now());
            alertRepository.save(a);
        });
        return critical.size();
    }
}
