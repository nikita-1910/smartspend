package com.nikita.smartspend.controller;

import com.nikita.smartspend.config.JwtUtil;
import com.nikita.smartspend.dto.AuthResponse;
import com.nikita.smartspend.dto.RegisterRequest;
import com.nikita.smartspend.entity.User;
import com.nikita.smartspend.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest().body("Email already registered.");
        if (userRepo.existsByUsername(req.getUsername()))
            return ResponseEntity.badRequest().body("Username already taken.");

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .monthlyIncomeTarget(req.getMonthlyIncomeTarget())
                .build();
        userRepo.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body("Registered successfully.");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody Map<String, String> body) {
        authManager.authenticate(
            new UsernamePasswordAuthenticationToken(body.get("email"), body.get("password")));
        var ud = userDetailsService.loadUserByUsername(body.get("email"));
        String token = jwtUtil.generateToken(ud);
        User user = userRepo.findByEmail(body.get("email")).orElseThrow();
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getEmail()));
    }
}
