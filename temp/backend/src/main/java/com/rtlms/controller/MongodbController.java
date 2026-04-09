package com.rtlms.controller;

import com.rtlms.dto.MongoCommandRequest;
import com.rtlms.repository.AlertRepository;
import com.rtlms.repository.ApplicationRepository;
import com.rtlms.repository.LogEntryRepository;
import com.rtlms.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/mongodb")
@RequiredArgsConstructor
public class MongodbController {

    private final LogEntryRepository logEntryRepository;
    private final ApplicationRepository applicationRepository;
    private final ServerRepository serverRepository;
    private final AlertRepository alertRepository;

    private static final Pattern FIND_PATTERN = Pattern.compile("db\\.(\\w+)\\.find\\(\\)", Pattern.CASE_INSENSITIVE);
    private static final Pattern FIND_ONE_PATTERN = Pattern.compile("db\\.(\\w+)\\.findOne\\(\\)", Pattern.CASE_INSENSITIVE);
    private static final Pattern COUNT_PATTERN = Pattern.compile("db\\.(\\w+)\\.count\\(\\)", Pattern.CASE_INSENSITIVE);

    @PostMapping("/execute")
    public ResponseEntity<?> execute(@RequestBody MongoCommandRequest req) {
        String cmd = req.getCommand().trim();

        Matcher findOne = FIND_ONE_PATTERN.matcher(cmd);
        if (findOne.find()) {
            return ResponseEntity.ok(Map.of("result", findCollection(findOne.group(1), 1)));
        }

        Matcher find = FIND_PATTERN.matcher(cmd);
        if (find.find()) {
            return ResponseEntity.ok(Map.of("result", findCollection(find.group(1), 20)));
        }

        Matcher count = COUNT_PATTERN.matcher(cmd);
        if (count.find()) {
            return ResponseEntity.ok(Map.of("result", countCollection(count.group(1))));
        }

        return ResponseEntity.badRequest().body(Map.of("error",
                "Only db.<collection>.find(), db.<collection>.findOne(), db.<collection>.count() are supported"));
    }

    private Object findCollection(String coll, int limit) {
        return switch (coll.toLowerCase()) {
            case "log_entries" -> logEntryRepository.findByOrderByTimestampDesc(
                    PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp")));
            case "applications" -> applicationRepository.findAll().subList(0, Math.min(limit, applicationRepository.findAll().size()));
            case "servers" -> serverRepository.findAll().subList(0, Math.min(limit, serverRepository.findAll().size()));
            case "alerts" -> alertRepository.findAll().subList(0, Math.min(limit, alertRepository.findAll().size()));
            default -> List.of();
        };
    }

    private long countCollection(String coll) {
        return switch (coll.toLowerCase()) {
            case "log_entries" -> logEntryRepository.count();
            case "applications" -> applicationRepository.count();
            case "servers" -> serverRepository.count();
            case "alerts" -> alertRepository.count();
            default -> 0L;
        };
    }
}
