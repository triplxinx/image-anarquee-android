package studio.ellis.archivedesk;

import java.net.URI;
import java.util.Locale;

final class PhoneHostSettings {
    static final String SETTINGS = "phone-licensing";
    static final String USE_PHONE = "usePhone";
    static final String PUBLIC_ORIGIN = "publicOrigin";

    static String publicOrigin(String input) {
        if (input.trim().isEmpty()) return "";
        try {
            URI uri = new URI(input.trim());
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null
                && uri.getPort() == -1 && uri.getQuery() == null && uri.getFragment() == null
                && (uri.getPath().isEmpty() || "/".equals(uri.getPath()))) {
                return "https://" + uri.getHost().toLowerCase(Locale.ROOT);
            }
        } catch (Exception ignored) {}
        throw new IllegalArgumentException("Enter a public HTTPS site address with no path or port.");
    }

    static boolean validSource(String source) {
        try {
            URI uri = new URI(source);
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (Exception ignored) {
            return false;
        }
    }

    static boolean validEmail(String value) {
        return value.matches("[^\\s@,;?#<>]+@[^\\s@,;?#<>]+\\.[^\\s@,;?#<>]+");
    }
}
