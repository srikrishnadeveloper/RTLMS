package com.rtlms.controller;

import com.rtlms.dto.TriggerRequest;
import com.rtlms.model.Server;
import com.rtlms.repository.ServerRepository;
import com.rtlms.service.AlertService;
import com.rtlms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/triggers")
@RequiredArgsConstructor
public class TriggerController {

    private final LogService logService;
    private final AlertService alertService;
    private final ServerRepository serverRepository;

    @PostMapping("/execute")
    public Map<String, Object> execute(@RequestBody TriggerRequest req) {
        return switch (req.getTriggerType()) {
            case "log_cleanup" -> {
                int days = req.getParams() != null && req.getParams().containsKey("days")
                        ? ((Number) req.getParams().get("days")).intValue() : 30;
                long deleted = logService.deleteOldDebugLogs(days);
                yield Map.of("success", true, "message",
                        "Deleted " + deleted + " DEBUG logs older than " + days + " days", "affected", deleted);
            }
            case "alert_escalation" -> {
                long escalated = alertService.escalateCritical();
                yield Map.of("success", true, "message",
                        "Escalated " + escalated + " CRITICAL alert(s) to ACKNOWLEDGED", "affected", escalated);
            }
            case "server_health_check" -> {
                List<Server> servers = serverRepository.findAll();
                long inactive = servers.stream().filter(s -> "inactive".equalsIgnoreCase(s.getStatus())).count();
                yield Map.of("success", true, "message",
                        "Health check: " + servers.size() + " servers total, " + inactive + " inactive", "affected", servers.size());
            }
            default -> Map.of("success", false, "message", "Unknown trigger type: " + req.getTriggerType());
        };
    }
}
