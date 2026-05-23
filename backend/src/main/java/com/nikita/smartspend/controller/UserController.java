package com.nikita.smartspend.controller;

import com.nikita.smartspend.config.JwtUtil;
import com.nikita.smartspend.dto.AuthResponse;
import com.nikita.smartspend.entity.User;
import com.nikita.smartspend.repository.TransactionRepository;
import com.nikita.smartspend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;
    private final TransactionRepository txRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    /** GET /api/user/profile */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        User user = getCurrentUser();
        return ResponseEntity.ok(Map.of(
            "id",                  user.getId(),
            "username",            user.getUsername(),
            "email",               user.getEmail(),
            "monthlyIncomeTarget", user.getMonthlyIncomeTarget(),
            "createdAt",           user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
        ));
    }

    /** PUT /api/user/profile — update username and/or monthlyIncomeTarget */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        String newUsername = body.get("username");
        String newTarget   = body.get("monthlyIncomeTarget");

        if (newUsername != null && !newUsername.isBlank()) {
            if (!newUsername.equals(user.getUsername()) && userRepo.existsByUsername(newUsername))
                return ResponseEntity.badRequest().body("Username already taken.");
            user.setUsername(newUsername);
        }
        if (newTarget != null && !newTarget.isBlank()) {
            try { user.setMonthlyIncomeTarget(new BigDecimal(newTarget)); }
            catch (NumberFormatException ignored) {}
        }
        userRepo.save(user);

        // Return a fresh token so username change is reflected immediately
        var ud = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(ud);
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getEmail()));
    }

    /** PUT /api/user/password — change password */
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        String current = body.get("currentPassword");
        String newPass  = body.get("newPassword");

        if (!encoder.matches(current, user.getPassword()))
            return ResponseEntity.badRequest().body("Current password is incorrect.");
        if (newPass == null || newPass.length() < 6)
            return ResponseEntity.badRequest().body("New password must be at least 6 characters.");

        user.setPassword(encoder.encode(newPass));
        userRepo.save(user);
        return ResponseEntity.ok("Password changed successfully.");
    }

    /** DELETE /api/user/account — delete all user data and account */
    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@RequestBody Map<String, String> body) {
        User user = getCurrentUser();
        String password = body.get("password");

        if (!encoder.matches(password, user.getPassword()))
            return ResponseEntity.badRequest().body("Incorrect password.");

        // Cascade deletes transactions, budgets, reports via DB foreign keys
        userRepo.delete(user);
        return ResponseEntity.ok("Account deleted successfully.");
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
