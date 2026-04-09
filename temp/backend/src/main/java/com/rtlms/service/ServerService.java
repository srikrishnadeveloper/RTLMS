package com.rtlms.service;

import com.rtlms.model.Server;
import com.rtlms.repository.ServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ServerService {

    private final ServerRepository serverRepository;

    public List<Server> getAll() {
        return serverRepository.findAll();
    }

    public Server create(Server server) {
        return serverRepository.save(server);
    }

    public Optional<Server> update(String id, Server updated) {
        return serverRepository.findById(id).map(existing -> {
            if (updated.getHostname() != null) existing.setHostname(updated.getHostname());
            if (updated.getIpAddress() != null) existing.setIpAddress(updated.getIpAddress());
            if (updated.getOsType() != null) existing.setOsType(updated.getOsType());
            if (updated.getDatacenter() != null) existing.setDatacenter(updated.getDatacenter());
            if (updated.getStatus() != null) existing.setStatus(updated.getStatus());
            return serverRepository.save(existing);
        });
    }

    public boolean delete(String id) {
        if (serverRepository.existsById(id)) {
            serverRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
