package com.rtlms.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "servers")
public class Server {

    @Id
    private String id;

    private String hostname;

    @Field("ip_address")
    private String ipAddress;

    @Field("os_type")
    private String osType;

    private String datacenter;
    private String status;
}
