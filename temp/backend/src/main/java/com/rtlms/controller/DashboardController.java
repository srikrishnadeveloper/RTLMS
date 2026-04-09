package com.rtlms.controller;

import com.rtlms.dto.DashboardOverview;
import com.rtlms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    public DashboardOverview overview() {
        return dashboardService.getOverview();
    }
}
