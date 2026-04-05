package com.tprs.servlet;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebFilter(urlPatterns = {"/api/protected/*", "/dashboard/*"})
public class FirebaseAuthFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Check if session exists and is valid
        HttpSession session = httpRequest.getSession(false);
        if (session != null && session.getAttribute("user") != null) {
            chain.doFilter(request, response);
            return;
        }

        // Alternative: Token validation for SPA API calls
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                if (!decodedToken.isEmailVerified()) {
                    httpResponse.sendError(HttpServletResponse.SC_FORBIDDEN, "Email not verified");
                    return;
                }
                
                // Usually we'd map this UID to our local DB user here and set it in request context
                // For simplicity, we pass through if the token is valid.
                httpRequest.setAttribute("firebaseUid", decodedToken.getUid());
                chain.doFilter(request, response);
                return;
            } catch (Exception e) {
                httpResponse.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Token");
                return;
            }
        }

        httpResponse.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
    }

    @Override
    public void destroy() {}
}
