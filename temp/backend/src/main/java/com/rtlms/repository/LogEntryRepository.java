package com.rtlms.repository;

import com.rtlms.model.LogEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface LogEntryRepository extends MongoRepository<LogEntry, String> {
    List<LogEntry> findByOrderByTimestampDesc(Pageable pageable);
    List<LogEntry> findByLevel(String level);
    List<LogEntry> findByApplicationId(String applicationId);
    List<LogEntry> findByServerId(String serverId);
    List<LogEntry> findByTimestampBefore(Instant timestamp);
    long countByLevel(String level);
    long countByLevelAndTimestampAfter(String level, Instant timestamp);
    long countByLevelAndApplicationId(String level, String applicationId);
    long countByApplicationId(String applicationId);
}
