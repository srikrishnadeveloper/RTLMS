package com.rtlms.service;

import com.rtlms.dto.LogGenerateRequest;
import com.rtlms.model.LogEntry;
import com.rtlms.repository.LogEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LogService {

    private final LogEntryRepository logEntryRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public List<LogEntry> getRecent(int limit) {
        return logEntryRepository.findByOrderByTimestampDesc(PageRequest.of(0, limit));
    }

    public List<LogEntry> filter(String level, String applicationId, String serverId,
                                  String startDate, String endDate, String search, int limit) {
        Query query = new Query();
        if (level != null && !level.isEmpty()) query.addCriteria(Criteria.where("level").is(level));
        if (applicationId != null && !applicationId.isEmpty()) query.addCriteria(Criteria.where("application_id").is(applicationId));
        if (serverId != null && !serverId.isEmpty()) query.addCriteria(Criteria.where("server_id").is(serverId));
        if (startDate != null && !startDate.isEmpty() && endDate != null && !endDate.isEmpty()) {
            query.addCriteria(Criteria.where("timestamp").gte(Instant.parse(startDate)).lte(Instant.parse(endDate)));
        } else if (startDate != null && !startDate.isEmpty()) {
            query.addCriteria(Criteria.where("timestamp").gte(Instant.parse(startDate)));
        } else if (endDate != null && !endDate.isEmpty()) {
            query.addCriteria(Criteria.where("timestamp").lte(Instant.parse(endDate)));
        }
        if (search != null && !search.isEmpty()) {
            query.addCriteria(Criteria.where("message").regex(search, "i"));
        }
        query.with(Sort.by(Sort.Direction.DESC, "timestamp")).limit(limit);
        return mongoTemplate.find(query, LogEntry.class);
    }

    public LogEntry generate(LogGenerateRequest req) {
        LogEntry entry = new LogEntry();
        entry.setLogId("LOG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        entry.setTimestamp(Instant.now());
        entry.setLevel(req.getLevel() != null ? req.getLevel() : "INFO");
        entry.setMessage(req.getMessage());
        entry.setSourceIp(req.getSourceIp() != null ? req.getSourceIp() : "127.0.0.1");
        entry.setApplicationId(req.getApplicationId());
        entry.setServerId(req.getServerId());
        LogEntry saved = logEntryRepository.save(entry);
        messagingTemplate.convertAndSend("/topic/logs", getRecent(5));
        return saved;
    }

    public List<LogEntry> getRecentForWebSocket() {
        return getRecent(5);
    }

    public long deleteOldDebugLogs(int days) {
        Instant cutoff = Instant.now().minus(days, ChronoUnit.DAYS);
        Query query = new Query(Criteria.where("level").is("DEBUG").and("timestamp").lt(cutoff));
        return mongoTemplate.remove(query, LogEntry.class).getDeletedCount();
    }
}
