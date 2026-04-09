package com.rtlms.repository;

import com.rtlms.model.Server;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerRepository extends MongoRepository<Server, String> {
    List<Server> findByStatus(String status);
    List<Server> findByDatacenter(String datacenter);
}
