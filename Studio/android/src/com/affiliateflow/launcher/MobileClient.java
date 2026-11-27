package com.affiliateflow.launcher;

import android.content.Context;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

final class MobileClient {
    private final SessionVault vault;
    private volatile String origin;
    private String accessToken = "";
    private String refreshToken = "";
    private volatile String accountId = "";
    private volatile boolean signedIn;
    private static final String API = "/api/mobile/v1/";

    MobileClient(Context context, String origin) {
        this.vault = new SessionVault(context);
        this.origin = origin;
    }

    static String normalizeOrigin(String value) {
        try {
            URI uri = new URI(value.trim()).parseServerAuthority();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null ||
                uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null ||
                !(uri.getRawPath().isEmpty() || "/".equals(uri.getRawPath())) ||
                uri.getPort() > 65535 || uri.getPort() == 0) return null;
            return "https://" + uri.getRawAuthority().toLowerCase(java.util.Locale.ROOT);
        } catch (Exception invalid) { return null; }
    }

    String origin() { return origin; }
    boolean signedIn() { return signedIn; }
    String accountId() { return accountId; }

    JSONObject connect(String candidate) throws Exception {
        JSONObject directory = request(candidate, "catalog", null, "");
        if (!candidate.equals(origin)) {
            clear();
            origin = candidate;
        }
        return directory;
    }

    JSONObject catalog() throws Exception {
        return request(origin, "catalog", null, "");
    }

    boolean restore() throws Exception {
        if (signedIn || origin.isEmpty()) return signedIn;
        refreshToken = vault.read(origin);
        if (refreshToken.isEmpty()) return false;
        return renew();
    }

    JSONObject login(String action, JSONObject values) throws Exception {
        JSONObject response = request(origin, action, values, "");
        if (!response.optBoolean("verificationRequired")) accept(response);
        return response;
    }

    JSONObject call(String action, JSONObject values) throws Exception {
        if (!signedIn && !restore()) throw new ApiException(401, "Sign in to continue.");
        try {
            return request(origin, action, values, accessToken);
        } catch (ApiException error) {
            if (error.status != 401 || !renew()) throw error;
            return request(origin, action, values, accessToken);
        }
    }

    void logout() throws Exception {
        try {
            if (signedIn) call("logout", new JSONObject());
        } finally {
            clear();
        }
    }

    private boolean renew() throws Exception {
        try {
            accept(request(origin, "refresh", new JSONObject().put("refreshToken", refreshToken), ""));
            return true;
        } catch (ApiException error) {
            if (error.status != 401) throw error;
            clear();
            return false;
        }
    }

    private void accept(JSONObject result) throws Exception {
        String freshAccess = result.getString("accessToken");
        String freshRefresh = result.getString("refreshToken");
        String id = result.getString("id");
        vault.write(origin, freshRefresh);
        accessToken = freshAccess;
        refreshToken = freshRefresh;
        accountId = id;
        signedIn = true;
    }

    private void clear() {
        vault.clear();
        accountId = "";
        accessToken = "";
        refreshToken = "";
        signedIn = false;
    }

    private static JSONObject request(String origin, String action, JSONObject body, String bearer) throws Exception {
        if (origin.isEmpty()) throw new ApiException(0, "Add your AffiliateFlow server in Settings.");
        HttpsURLConnection connection = (HttpsURLConnection) new URL(origin + API + action).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setConnectTimeout(9000);
        connection.setReadTimeout(35000);
        connection.setRequestProperty("Accept", "application/json");
        if (!bearer.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + bearer);
        try {
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            }
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) throw new ApiException(status, "Use the final HTTPS server address in Settings.");
            String type = connection.getHeaderField("Content-Type");
            if (type == null || !type.toLowerCase(java.util.Locale.ROOT).startsWith("application/json")) {
                throw new ApiException(status, "This server does not expose the AffiliateFlow Android API.");
            }
            InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            JSONObject result = new JSONObject(read(input));
            if (status >= 400) throw new ApiException(status, result.optString("error", "Request failed."));
            if ("catalog".equals(action) && result.optJSONArray("programs") == null) {
                throw new ApiException(status, "The server returned an invalid directory.");
            }
            return result;
        } finally { connection.disconnect(); }
    }

    static String read(InputStream stream) throws IOException {
        if (stream == null) throw new IOException("Empty reply");
        try (InputStream input = stream; ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] bytes = new byte[8192];
            for (int n; (n = input.read(bytes)) != -1;) {
                if (buffer.size() + n > 1_500_000) throw new IOException("Reply too large");
                buffer.write(bytes, 0, n);
            }
            return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    static final class ApiException extends IOException {
        final int status;
        ApiException(int status, String message) { super(message); this.status = status; }
    }
}
