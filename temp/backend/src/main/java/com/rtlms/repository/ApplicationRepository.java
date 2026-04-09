package com.rtlms.repository;

import com.rtlms.model.Application;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationRepository extends MongoRepository<Application, String> {
    List<Application> findByEnvironment(String environment);
    List<Application> findByAppNameContainingIgnoreCase(String name);
}
