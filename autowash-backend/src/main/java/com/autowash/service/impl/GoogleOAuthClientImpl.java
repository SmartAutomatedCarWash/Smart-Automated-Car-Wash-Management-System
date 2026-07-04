package com.autowash.service.impl;

import com.autowash.dto.GoogleOAuthUserInfo;
import com.autowash.service.GoogleOAuthClient;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GoogleOAuthClientImpl implements GoogleOAuthClient {

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;


    public GoogleOAuthClientImpl(
            RestClient.Builder restClientBuilder,
            @Value("${autowash.auth.google.client-id:}") String clientId,
            @Value("${autowash.auth.google.client-secret:}") String clientSecret,
            @Value("${autowash.auth.google.redirect-uri:}") String redirectUri
    ) {
        this.restClient = restClientBuilder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    @Override
    public String buildAuthorizationUrl(String state, String returnUrl) {
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .queryParam("include_granted_scopes", "true")
                .build(false)
                .encode()
                .toUriString();
    }

    @Override
    @SuppressWarnings("unchecked")
    public GoogleOAuthUserInfo exchangeCode(String code) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("code", code);
        formData.add("client_id", clientId);
        formData.add("client_secret", clientSecret);
        formData.add("redirect_uri", redirectUri);
        formData.add("grant_type", "authorization_code");

        Map<String, Object> tokenResponse = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .body(LinkedHashMap.class);

        if (tokenResponse == null || !tokenResponse.containsKey("id_token")) {
            throw new IllegalStateException("Google token exchange failed");
        }

        String idToken = String.valueOf(tokenResponse.get("id_token"));
        try {
            JsonNode claims = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("oauth2.googleapis.com")
                            .path("/tokeninfo")
                            .queryParam("id_token", idToken)
                            .build())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        throw new IllegalStateException("Google id_token verification failed");
                    })
                    .body(JsonNode.class);

            if (claims == null) {
                throw new IllegalStateException("Google id_token verification returned empty payload");
            }
            if (!clientId.equals(claims.path("aud").asText(null))) {
                throw new IllegalStateException("Google id_token audience mismatch");
            }
            String issuer = claims.path("iss").asText("");
            if (!"https://accounts.google.com".equals(issuer) && !"accounts.google.com".equals(issuer)) {
                throw new IllegalStateException("Google id_token issuer mismatch");
            }
            return new GoogleOAuthUserInfo(
                    claims.path("sub").asText(null),
                    claims.path("email").asText(null),
                    claims.path("name").asText(null),
                    claims.path("picture").asText(null),
                    claims.path("email_verified").asBoolean(false)
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to verify Google id_token", exception);
        }
    }
}
