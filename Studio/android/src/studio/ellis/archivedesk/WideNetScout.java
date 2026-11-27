package studio.ellis.archivedesk;

import android.text.Html;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.HttpsURLConnection;

final class WideNetScout {
    private static final String GRANTS = "https://api.grants.gov/v1/api/search2";
    private static final String TED = "https://api.ted.europa.eu/v3/notices/search";
    private static final String MOVE = "https://on-the-move.org/news/deadlines";
    private static final String[] NAMES = {"Grants.gov", "EU TED", "On the Move"};
    private static final Pattern ART_CALL = Pattern.compile(
        "<a href=\"(/news/[a-z0-9-]+)\" class=\"lit under\">([^<]{1,600})</a><br>\\s*"
        + "<div class='st'>Deadline: <time datetime=\"(\\d{4}-\\d{2}-\\d{2})T");

    private WideNetScout() {}

    static String fetch() {
        ExecutorService pool = Executors.newFixedThreadPool(3);
        JSONArray rows = new JSONArray();
        StringBuilder sources = new StringBuilder();
        try {
            List<Callable<JSONArray>> tasks = Arrays.asList(WideNetScout::grants, WideNetScout::tenders, WideNetScout::artsCalls);
            List<Future<JSONArray>> results = pool.invokeAll(tasks, 26, TimeUnit.SECONDS);
            for (int i = 0; i < results.size(); i++) {
                if (i > 0) sources.append(" · ");
                sources.append(NAMES[i]);
                try {
                    JSONArray found = results.get(i).get();
                    for (int n = 0; n < found.length(); n++) rows.put(found.get(n));
                    sources.append(": ").append(found.length()).append(" candidates");
                } catch (java.util.concurrent.ExecutionException | java.util.concurrent.CancellationException unavailable) {
                    sources.append(": unavailable");
                }
            }
        } catch (InterruptedException stop) {
            Thread.currentThread().interrupt();
            sources.append("Sweep interrupted");
        } catch (JSONException invalid) {
            sources.append("Some candidates could not be read");
        } finally {
            pool.shutdownNow();
        }
        try {
            return new JSONObject().put("rows", rows).put("summary", sources.toString()).toString();
        } catch (JSONException impossible) {
            return "{\"rows\":[],\"summary\":\"Sweep unavailable.\"}";
        }
    }

    private static JSONArray grants() throws IOException, JSONException {
        JSONArray rows = new JSONArray();
        Set<String> seen = new HashSet<>();
        boolean completed = false;
        for (String keyword : new String[]{"documentary", "photography", "digital media"}) {
            try {
                JSONObject request = new JSONObject().put("rows",25).put("keyword",keyword)
                    .put("oppStatuses","posted").put("fundingCategories","AR|HU");
                JSONArray hits = new JSONObject(request(GRANTS, request)).getJSONObject("data").getJSONArray("oppHits");
                completed = true;
                for (int i = 0; i < hits.length() && rows.length() < 70; i++) {
                    JSONObject hit = hits.getJSONObject(i);
                    String id = hit.optString("id"), title = hit.optString("title").trim();
                    String deadline = hit.optString("closeDate");
                    String date = deadline.matches("\\d{2}/\\d{2}/\\d{4}") ?
                        deadline.substring(6)+"-"+deadline.substring(0,2)+"-"+deadline.substring(3,5) : "";
                    if (!id.matches("\\d+") || title.isEmpty() || !"posted".equals(hit.optString("oppStatus")) ||
                        (!date.isEmpty() && date.compareTo(day(0)) < 0) || !seen.add(id)) continue;
                    String description = hit.optString("agencyName",hit.optString("agency"))+" · "+hit.optString("number");
                    rows.put(row("https://www.grants.gov/search-results-detail/"+id,title,description,date,"grant","Grants.gov",lane(title,"copy")));
                }
            } catch (IOException | JSONException unavailable) {
                // A failed query must not erase matches from other queries.
            }
        }
        if (!completed) throw new IOException("Grants.gov unavailable");
        return rows;
    }

    private static JSONArray tenders() throws IOException, JSONException {
        JSONArray fields = new JSONArray(Arrays.asList("publication-number","notice-title","deadline-receipt-tender-date-lot","description-proc"));
        String query = "(classification-cpv = 92111200 OR classification-cpv = 79961000 OR classification-cpv = 79822500)"
            +" AND publication-date >= "+day(-45).replace("-","")
            +" AND deadline-receipt-tender-date-lot >= "+day(0).replace("-","");
        JSONObject body = new JSONObject().put("query",query).put("fields",fields).put("limit",40).put("page",1).put("scope","ACTIVE");
        JSONArray notices = new JSONObject(request(TED, body)).getJSONArray("notices");
        JSONArray rows = new JSONArray();
        for (int i = 0; i < notices.length(); i++) {
            JSONObject notice = notices.getJSONObject(i);
            String id = notice.optString("publication-number"), title = localized(notice.optJSONObject("notice-title"));
            String description = localized(notice.optJSONObject("description-proc"));
            if (!id.matches("\\d{1,8}-\\d{4}") || title.isEmpty()) continue;
            String date = "";
            JSONArray deadlines = notice.optJSONArray("deadline-receipt-tender-date-lot");
            if (deadlines == null) continue;
            for (int d = 0; d < deadlines.length(); d++) {
                String candidate = deadlines.optString(d);
                if (candidate.length() < 10) continue;
                candidate = candidate.substring(0,10);
                if (candidate.matches("\\d{4}-\\d{2}-\\d{2}") && candidate.compareTo(day(0)) >= 0 &&
                    (date.isEmpty() || candidate.compareTo(date) < 0)) date = candidate;
            }
            if (date.isEmpty()) continue;
            rows.put(row("https://ted.europa.eu/en/notice/-/detail/"+id,title,description,date,"commission","EU TED",lane(title+" "+description,"design")));
        }
        return rows;
    }

    private static JSONArray artsCalls() throws IOException, JSONException {
        Matcher calls = ART_CALL.matcher(request(MOVE, null));
        if (!calls.find()) throw new IOException("Directory layout changed");
        calls.reset();
        JSONArray rows = new JSONArray();
        Set<String> seen = new HashSet<>();
        while (calls.find() && rows.length() < 75) {
            String date = calls.group(3);
            String title = Html.fromHtml(calls.group(2)).toString().trim();
            String lane = lane(title, "");
            if (lane.isEmpty() || date.compareTo(day(0)) < 0 || !seen.add(calls.group(1))) continue;
            rows.put(row("https://on-the-move.org"+calls.group(1),title,
                "Directory listing. Open it and follow the organizer’s original application and eligibility information.",
                date,"open","On the Move",lane));
        }
        return rows;
    }

    private static JSONObject row(String url,String title,String description,String date,String kind,String source,String lane) throws JSONException {
        return new JSONObject().put("url",url).put("title",limit(title,180)).put("description",limit(description,2000))
            .put("closing",date).put("kind",kind).put("source",source).put("lane",lane);
    }

    private static String lane(String raw, String fallback) {
        String value = raw.toLowerCase(Locale.ROOT);
        if (value.matches("(?s).*(photo|fotograf|image licensing).*")) return "licensing";
        if (value.matches("(?s).*(documentary|documentaire|film|animation|video|motion|sound|multimedia).*")) return "video";
        if (value.matches("(?s).*(installation|exhibition|immersive|virtual museum|interactive|digital archive).*")) return "landing";
        if (value.matches("(?s).*(visual art|graphic|illustrat|zine|comic|poster|collage|printmak|design).*")) return "design";
        if (value.matches("(?s).*(oral history|storytelling|writer|editorial|public humanities|publishing).*")) return "copy";
        return fallback;
    }

    private static String localized(JSONObject values) {
        if (values == null) return "";
        String english = values.optString("eng", "").trim();
        if (!english.isEmpty()) return english;
        Iterator<String> keys = values.keys();
        return keys.hasNext() ? values.optString(keys.next()).trim() : "";
    }

    private static String day(int offset) {
        SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
        iso.setTimeZone(TimeZone.getTimeZone("UTC"));
        return iso.format(new Date(System.currentTimeMillis()+offset*86400000L));
    }

    private static String limit(String value,int limit) {
        return value.length() > limit ? value.substring(0,limit) : value;
    }

    private static String request(String address, JSONObject body) throws IOException {
        HttpsURLConnection connection = (HttpsURLConnection)new URL(address).openConnection();
        try {
            connection.setConnectTimeout(5500);
            connection.setReadTimeout(5500);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent","iMAG3-WideNet/1.0 (manual public opportunity search)");
            connection.setRequestProperty("Accept",body == null ? "text/html" : "application/json");
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type","application/json");
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = connection.getOutputStream()) { out.write(bytes); }
            }
            if (connection.getResponseCode() != 200) throw new IOException("Source unavailable");
            try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                for (int length; (length = in.read(buffer)) != -1;) {
                    if (out.size() + length > 3 * 1024 * 1024) throw new IOException("Source too large");
                    if (Thread.currentThread().isInterrupted()) throw new IOException("Sweep canceled");
                    out.write(buffer,0,length);
                }
                return new String(out.toByteArray(),StandardCharsets.UTF_8);
            }
        } finally { connection.disconnect(); }
    }
}
