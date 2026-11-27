package studio.ellis.archivedesk;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

final class WideFeed {
    private JSONObject feeds;

    private synchronized JSONObject catalog(AssetManager assets) throws Exception {
        if (feeds == null) {
            try (InputStream input = assets.open("desk/wide-net-feeds.json");
                ByteArrayOutputStream data = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                for (int read; (read = input.read(buffer)) != -1;) data.write(buffer, 0, read);
                feeds = new JSONObject(new String(data.toByteArray(), StandardCharsets.UTF_8));
            }
        }
        return feeds;
    }

    private static String day(int offset) {
        return WideNetScout.day(offset).replace("-", "") + "00";
    }

    private String address(AssetManager assets, Uri request) throws Exception {
        String key = request.getQueryParameter("source");
        if ("wiki".equals(key)) {
            String language = request.getQueryParameter("language");
            String topic = request.getQueryParameter("topic");
            String start = request.getQueryParameter("start");
            String end = request.getQueryParameter("end");
            if (language == null || !language.matches("en|es|fr|pt|de|ar|ja") ||
                topic == null || !topic.matches("[^\\x00-\\x1f\\x7f]{1,100}") ||
                !day(-29).equals(start) || !day(-2).equals(end)) return null;
            return "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/" + language
                + ".wikipedia/all-access/user/" + Uri.encode(topic) + "/daily/" + start + "/" + end;
        }
        String cursor = request.getQueryParameter("cursor");
        JSONObject feed = key == null ? null : catalog(assets).optJSONObject(key);
        if (feed == null) return null;
        if (cursor == null || cursor.isEmpty()) return feed.getString("url");
        if (!feed.optBoolean("cursor") || !cursor.matches("[A-Za-z0-9_+.=/\\-]{1,300}")) return null;
        return feed.getString("url") + "&cursor=" + Uri.encode(cursor);
    }

    WebResourceResponse respond(AssetManager assets, Uri request) {
        try {
            String url = address(assets, request);
            if (url == null) return response(400, "Bad Request", "");
            return response(200, "OK", WideNetScout.request(url, null));
        } catch (WideNetScout.RateLimited limited) {
            return response(429, "Rate Limited", "");
        } catch (Exception unavailable) {
            return response(502, "Source Unavailable", "");
        }
    }

    private static WebResourceResponse response(int status, String reason, String body) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason,
            Collections.singletonMap("Cache-Control", status==200 ? "max-age=600" : "no-store"),
            new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    }
}
