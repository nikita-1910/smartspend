package com.nikita.smartspend.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private String username;
    private String email;

    public AuthResponse(String token, String username, String email) {
        this.token    = token;
        this.username = username;
        this.email    = email;
    }
}
