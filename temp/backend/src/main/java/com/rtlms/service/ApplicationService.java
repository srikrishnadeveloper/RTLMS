package com.rtlms.service;

import com.rtlms.model.Application;
import com.rtlms.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    public List<Application> getAll() {
        return applicationRepository.findAll();
    }

    public Application create(Application app) {
        if (app.getCreatedAt() == null) app.setCreatedAt(Instant.now());
        return applicationRepository.save(app);
    }

    public Optional<Application> update(String id, Application updated) {
        return applicationRepository.findById(id).map(existing -> {
            if (updated.getAppName() != null) existing.setAppName(updated.getAppName());
            if (updated.getVersion() != null) existing.setVersion(updated.getVersion());
            if (updated.getEnvironment() != null) existing.setEnvironment(updated.getEnvironment());
            return applicationRepository.save(existing);
        });
    }

    public boolean delete(String id) {
        if (applicationRepository.existsById(id)) {
            applicationRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
