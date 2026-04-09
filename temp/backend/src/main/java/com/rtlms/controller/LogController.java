package com.rtlms.controller;

import com.rtlms.dto.LogGenerateRequest;
import com.rtlms.model.LogEntry;
import com.rtlms.repository.LogEntryRepository;
import com.rtlms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;
    private final LogEntryRepository logEntryRepository;

    @GetMapping("/recent")
    public List<LogEntry> recent(@RequestParam(defaultValue = "50") int limit) {
        return logService.getRecent(limit);
    }

    @GetMapping("/by-level")
    public List<Map<String, Object>> byLevel() {
        String[] levels = {"ERROR", "WARN", "INFO", "DEBUG"};
        return java.util.Arrays.stream(levels)
                .map(l -> Map.<String, Object>of("_id", l, "count", logEntryRepository.countByLevel(l)))
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/filter")
    public List<LogEntry> filter(
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String application,
            @RequestParam(required = false) String server,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "100") int limit) {
        return logService.filter(level, application, server, startDate, endDate, search, limit);
    }

    @PostMapping("/generate")
    public Map<String, Object> generate(@RequestBody LogGenerateRequest req) {
        LogEntry log = logService.generate(req);
        return Map.of("success", true, "log", log);
    }
}
