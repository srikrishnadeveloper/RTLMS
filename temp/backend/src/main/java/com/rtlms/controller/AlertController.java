package com.rtlms.controller;

import com.rtlms.model.Alert;
import com.rtlms.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public List<Alert> getActive() {
        return alertService.getActive();
    }

    @GetMapping("/all")
    public List<Alert> getAll() {
        return alertService.getAll();
    }
}
