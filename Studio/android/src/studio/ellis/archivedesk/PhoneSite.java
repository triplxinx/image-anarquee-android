package studio.ellis.archivedesk;

import fi.iki.elonen.NanoHTTPD;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

final class PhoneSite extends NanoHTTPD {
    static final int PORT = 8043;
    private static final Response.Status OK = Response.Status.OK;
    private static final Response.Status NOT_FOUND = Response.Status.NOT_FOUND;
    private static final String ENTRY = "<h1>Open your private preview</h1>"
        + "<p>Enter the personalized key from your pitch.</p><form method='post' action='/unlock'>"
        + "<label>Preview key<input name='key' required maxlength='57' autocomplete='off' "
        + "autocapitalize='none' spellcheck='false'></label><button>Open preview</button></form>";
    private static final String UNLOCK_SCRIPT =
        "const k=new URLSearchParams(location.hash.slice(1)).get('key');"
        + "if(k!==null){history.replaceState(null,'',location.pathname);"
        + "if(/^[a-f0-9]{24}\\.[a-f0-9]{32}$/.test(k)){"
        + "const f=document.querySelector('form');f.elements.key.value=k;f.requestSubmit();}}";

    private final PhoneOffers offers;
    private final String[] authorities;
    private final String tlsAuthority;
    private final Map<String, Grant> sessions = new LinkedHashMap<>();
    private final Map<String, Attempt> attempts = new LinkedHashMap<>();
    private final String css;

    PhoneSite(String bind, int port, PhoneOffers offers, String css, String tlsAuthority, String... authorities) {
        super(bind, port);
        this.offers = offers;
        this.authorities = authorities;
        this.tlsAuthority = tlsAuthority;
        this.css = css;
        setAsyncRunner(new DefaultAsyncRunner() {
            @Override public synchronized void exec(ClientHandler handler) {
                if (getRunning().size() >= 16) handler.close();
                else super.exec(handler);
            }
        });
    }

    private static final class Grant {
        final String id;
        final String csrf = PhoneOffers.random(16);
        final long expires = System.currentTimeMillis() + 43200000L;
        Grant(String id) { this.id = id; }
    }

    private static final class Attempt {
        long expiry;
        int count;
    }

    private synchronized boolean allow(String address) {
        long now = System.currentTimeMillis();
        java.util.Iterator<Attempt> stale = attempts.values().iterator();
        while (stale.hasNext()) if (stale.next().expiry <= now) stale.remove();
        Attempt attempt = attempts.get(address);
        if (attempt == null) {
            if (attempts.size() >= 256) return false;
            attempt = new Attempt();
            attempt.expiry = now + 60000L;
            attempts.put(address, attempt);
        }
        return ++attempt.count <= 40;
    }

    private synchronized String grant(String id) {
        long now = System.currentTimeMillis();
        java.util.Iterator<Grant> stale = sessions.values().iterator();
        while (stale.hasNext()) if (stale.next().expires <= now) stale.remove();
        if (sessions.size() >= 512) sessions.remove(sessions.keySet().iterator().next());
        String token = PhoneOffers.random(24);
        sessions.put(token, new Grant(id));
        return token;
    }

    private synchronized Grant session(String token, String id) {
        Grant grant = sessions.get(token);
        return grant != null && grant.expires > System.currentTimeMillis() && grant.id.equals(id) ? grant : null;
    }

    private boolean authorizedHost(String host) {
        for (String name : authorities) if (name.equals(host)) return true;
        return false;
    }

    @Override public Response serve(IHTTPSession request) {
        String host = request.getHeaders().get("host");
        host = host == null ? "" : host.toLowerCase(Locale.ROOT);
        if (!authorizedHost(host)) return html(Response.Status.FORBIDDEN, "Unavailable", "<p>Use the published site address.</p>");
        String path = request.getUri();
        Method method = request.getMethod();
        try {
            if (method == Method.GET) {
                switch (path) {
                    case "/":
                        return html(OK, "Private licensing", ENTRY + "<script src='/unlock.js' defer></script>");
                    case "/site.css":
                        return headers(newFixedLengthResponse(OK, "text/css; charset=utf-8", css));
                    case "/unlock.js":
                        return headers(newFixedLengthResponse(OK, "text/javascript; charset=utf-8", UNLOCK_SCRIPT));
                    default:
                        if (path.matches("/o/[a-f0-9]{24}(/proof)?")) return offerPage(request, path);
                }
            }
            if (method == Method.POST) {
                if (!allow(request.getRemoteIpAddress())) return html(Response.Status.TOO_MANY_REQUESTS, "Please wait", "<p>Try again in a minute.</p>");
                if ("/unlock".equals(path)) return unlock(request, host);
                if (path.matches("/o/[a-f0-9]{24}/request")) return receive(request, path.substring(3, 27));
            }
            return missing();
        } catch (IllegalArgumentException invalid) {
            return html(Response.Status.BAD_REQUEST, "Check the form", "<p>" + escape(invalid.getMessage()) + "</p><p><a href='/'>Try again</a></p>");
        } catch (Exception error) {
            return html(Response.Status.INTERNAL_ERROR, "Temporarily unavailable", "<p>Please try again later.</p>");
        }
    }

    private Response unlock(IHTTPSession session, String host) throws Exception {
        String key = field(form(session), "key", 66).trim().toLowerCase(Locale.ROOT);
        String id = offers.unlock(key);
        if (id == null) return html(NOT_FOUND, "Preview unavailable", "<p>This key is invalid, expired or revoked.</p>" + ENTRY);
        String path = "/o/" + id;
        Response response = redirect(path);
        response.addHeader("Set-Cookie", cookieName(id) + "=" + grant(id) + "; Path=" + path
            + "; HttpOnly; SameSite=Strict; Max-Age=43200" + (tlsAuthority.equals(host) ? "; Secure" : ""));
        return response;
    }

    private static String cookieName(String id) { return "xxxink_" + id; }

    private Response offerPage(IHTTPSession request, String path) throws Exception {
        String id = path.substring(3, 27);
        Grant grant = session(request.getCookies().read(cookieName(id)), id);
        JSONObject offer = offers.get(id);
        if (grant == null || !PhoneOffers.live(offer)) return missing();
        if (path.endsWith("/proof")) {
            byte[] proof = offers.proof(id);
            return proof == null ? missing() : headers(newFixedLengthResponse(OK, "image/jpeg", new ByteArrayInputStream(proof), proof.length));
        }
        String source = offer.optString("source");
        String sourceLink = PhoneHostSettings.validSource(source)
            ? "<p><a rel='noreferrer' href='" + escape(source) + "'>Original brief</a></p>" : "";
        String details = "<p>Private preview for " + value(offer, "buyer") + "</p><h1>" + value(offer, "project")
            + "</h1><p class='multiline'>" + value(offer, "context") + "</p>" + sourceLink
            + "<figure class='panel'><figcaption>" + value(offer, "placement") + "</figcaption>"
            + "<img alt='Watermarked project mockup' src='" + path + "/proof'></figure>"
            + "<section class='panel'><h2>Proposed usage</h2><p class='multiline'>" + value(offer, "scope")
            + "</p><p><strong>" + (offer.optString("price").isEmpty() ? "Fee available on request" : value(offer, "price")) + "</strong></p></section>";
        JSONObject submitted = offer.optJSONObject("request");
        if (submitted != null) {
            return html(OK, "Private licensing preview", details
                + "<p>A licensing request was received. Reference " + value(submitted, "reference") + ".</p>");
        }
        return html(OK, "Private licensing preview", details + "<section class='panel'><h2>Request this license</h2>"
            + "<form method='post' action='" + path + "/request'><input type='hidden' name='csrf' value='" + grant.csrf
            + "'><label>Your name<input name='name' maxlength='180' required></label>"
            + "<label>Reply email<input type='email' name='email' maxlength='254' required></label>"
            + "<label>Changes or questions<textarea name='notes' maxlength='2200'></textarea></label>"
            + "<p>Your request goes to the creator. Usage begins after final terms are agreed.</p>"
            + "<button>Send license request</button></form></section>");
    }

    private Response receive(IHTTPSession request, String id) throws Exception {
        Grant grant = session(request.getCookies().read(cookieName(id)), id);
        if (grant == null || !PhoneOffers.live(offers.get(id))) return missing();
        Map<String, String> form = form(request);
        if (!grant.csrf.equals(form.get("csrf"))) return html(Response.Status.FORBIDDEN, "Invalid request", "<p>Reopen the preview and try again.</p>");
        String name = field(form, "name", 180);
        String email = field(form, "email", 254);
        String notes = field(form, "notes", 2200);
        if (name.isEmpty() || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw new IllegalArgumentException("Enter your name and a valid reply email.");
        offers.request(id, name, email, notes);
        return redirect("/o/" + id);
    }

    private static String field(Map<String, String> form, String name, int limit) {
        String candidate = form.get(name);
        String value = candidate == null ? "" : candidate.trim();
        if (value.length() > limit) throw new IllegalArgumentException("A field is too long.");
        return value;
    }

    private static Map<String, String> form(IHTTPSession request) throws IOException {
        String type = request.getHeaders().get("content-type");
        String rawLength = request.getHeaders().get("content-length");
        if (type == null || !type.split(";", 2)[0].trim().equalsIgnoreCase("application/x-www-form-urlencoded")
            || rawLength == null || !rawLength.matches("[0-9]{1,5}")) {
            throw new IllegalArgumentException("Unsupported form.");
        }
        int length = Integer.parseInt(rawLength);
        if (length > 18000) throw new IllegalArgumentException("Form is too large.");
        InputStream stream = request.getInputStream();
        byte[] bytes = new byte[length];
        int offset = 0;
        while (offset < length) {
            int count = stream.read(bytes, offset, length - offset);
            if (count < 0) throw new IOException("Incomplete form.");
            offset += count;
        }
        Map<String, String> form = new HashMap<>();
        for (String part : new String(bytes, StandardCharsets.UTF_8).split("&", 12)) {
            String[] fields = part.split("=", 2);
            if (fields.length == 2) form.put(URLDecoder.decode(fields[0], "UTF-8"), URLDecoder.decode(fields[1], "UTF-8"));
        }
        return form;
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("\"", "&quot;").replace("'", "&#39;");
    }

    private static String value(JSONObject object, String name) { return escape(object.optString(name)); }

    private static Response redirect(String location) {
        Response response = headers(newFixedLengthResponse(Response.Status.REDIRECT_SEE_OTHER, "text/plain", ""));
        response.addHeader("Location", location);
        return response;
    }

    private static Response missing() {
        return html(NOT_FOUND, "Preview unavailable", "<p>Open a valid preview link or <a href='/'>enter your key</a>.</p>");
    }

    private static Response html(Response.Status status, String title, String content) {
        return headers(newFixedLengthResponse(status, "text/html; charset=utf-8",
            "<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<title>" + escape(title) + " | XXX!NK</title><link rel='stylesheet' href='/site.css'>"
            + "<header class='masthead'><a class='mark' href='/'>XXX!NK.</a><span>Independent art &amp; image licensing</span></header>"
            + "<main>" + content + "</main></html>"));
    }

    private static Response headers(Response response) {
        response.addHeader("Cache-Control", "no-store, private");
        response.addHeader("X-Content-Type-Options", "nosniff");
        response.addHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        response.addHeader("Referrer-Policy", "no-referrer");
        response.addHeader("Content-Security-Policy", "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
        response.closeConnection(true);
        return response;
    }
}
