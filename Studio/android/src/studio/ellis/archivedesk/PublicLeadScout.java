package studio.ellis.archivedesk;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.*;
import javax.net.ssl.HttpsURLConnection;

final class PublicLeadScout {
    private static final String[][] TOPICS = {
        {"licensing", "photo(?:graph\\w*)?|retouch\\w*|image (?:licens\\w*|sourc\\w*)|rights (?:and clearances|editor)|archivist"},
        {"design", "illustrat\\w*|graphic design\\w*|brand design\\w*|cover design\\w*|art director|production artist|visual design\\w*"},
        {"video", "videograph\\w*|video (?:produc\\w*|edit\\w*)|motion (?:design\\w*|graphics)|multimedia produc\\w*"},
        {"proof", "image edit\\w*|visual editor|copy ?editor|proofread\\w*|picture editor|photo editor"},
        {"data", "digital asset\\w*|visual qa|image evaluat\\w*|brand evaluat\\w*"},
        {"copy", "copywriter|editorial produc\\w*|content writer"},
        {"social", "social media (?:editor|producer|manager)"}
    };
    private static final Pattern[] RULES = new Pattern[TOPICS.length];
    static {
        for (int i=0; i<TOPICS.length; i++)
            RULES[i]=Pattern.compile("\\b(?:"+TOPICS[i][1]+")\\b",Pattern.CASE_INSENSITIVE);
    }
    private static final Pattern REMOTE = Pattern.compile("\\bremote\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern IN_PERSON = Pattern.compile("\\b(hybrid|on[- ]?site|non[- ]remote)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOCAL = Pattern.compile("\\b(Seattle|Bellevue|Tacoma|Redmond|Kirkland|Renton|Everett|Shoreline)\\b", Pattern.CASE_INSENSITIVE);
    private static final String[][] BOARDS = {
        {"Terac", "https://api.ashbyhq.com/posting-api/job-board/terac?includeCompensation=true", "jobs.ashbyhq.com"},
        {"Handshake", "https://api.ashbyhq.com/posting-api/job-board/handshake?includeCompensation=true", "jobs.ashbyhq.com"},
        {"True Talent Solutions Partners", "https://api.ashbyhq.com/posting-api/job-board/true-talent-solutions-partners?includeCompensation=true", "jobs.ashbyhq.com"},
        {"Getty Images", "https://api.lever.co/v0/postings/gettyimages?mode=json", "jobs.lever.co"},
        {"Vox Media","https://boards-api.greenhouse.io/v1/boards/voxmedia/jobs","voxmedia.com"},
        {"Discord","https://boards-api.greenhouse.io/v1/boards/discord/jobs","discord.com"},
        {"Wikimedia Foundation","https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs","wikimediafoundation.org"}
    };

    static String fetch() {
        JSONArray leads = new JSONArray();
        JSONArray completed = new JSONArray(), failed = new JSONArray();
        ExecutorService pool = Executors.newFixedThreadPool(3);
        java.util.List<Future<BoardResult>> pending = new java.util.ArrayList<>();
        int scanned = 0;
        try {
            for (String[] board : BOARDS) pending.add(pool.submit(() -> readBoard(board)));
            Set<String> seen = new HashSet<>();
            for (int i = 0; i < BOARDS.length; i++) {
                try {
                    BoardResult board = pending.get(i).get();
                    for (int j = 0; j < board.matches.length(); j++) {
                        JSONObject lead = board.matches.getJSONObject(j);
                        if (seen.add(lead.getString("url"))) leads.put(lead);
                    }
                    scanned += board.scanned;
                    completed.put(BOARDS[i][0]);
                } catch (ExecutionException e) {
                    failed.put(BOARDS[i][0]);
                }
            }
            return new JSONObject().put("checked", completed.length()).put("total", BOARDS.length)
                .put("completed", completed).put("failed", failed).put("scanned", scanned).put("leads", leads).toString();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        } finally { pool.shutdownNow(); }
        return "{\"checked\":0,\"total\":7,\"leads\":[]}";
    }

    private static final class BoardResult {
        final JSONArray matches = new JSONArray();
        int scanned;
    }

    private static BoardResult readBoard(String[] board) throws IOException, JSONException {
        boolean lever = board[2].equals("jobs.lever.co");
        BoardResult result = new BoardResult();
        for (int offset=0; offset<20000; offset+=100) {
            String address = board[1] + (lever ? "&limit=100&skip="+offset : "");
            String body;
            try { body=get(address); }
            catch (java.net.SocketTimeoutException e) { body=get(address); }
            JSONArray jobs = lever ? new JSONArray(body) : new JSONObject(body).getJSONArray("jobs");
            collect(board, jobs, result.matches);
            result.scanned += jobs.length();
            if (!lever || jobs.length()<100) return result;
        }
        throw new IOException("Pagination limit reached");
    }

    private static String get(String address) throws IOException {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(address).openConnection();
        try {
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setRequestProperty("Accept","application/json");
            if (connection.getResponseCode() != 200) throw new IOException("Board unavailable");
            try (InputStream source = connection.getInputStream(); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                byte[] bytes = new byte[8192];
                for (int count; (count = source.read(bytes)) != -1;) {
                    if (buffer.size() + count > 4 * 1024 * 1024) throw new IOException("Board response too large");
                    buffer.write(bytes,0,count);
                }
                return new String(buffer.toByteArray(),StandardCharsets.UTF_8);
            }
        } finally { connection.disconnect(); }
    }

    private static void collect(String[] board, JSONArray jobs, JSONArray leads) throws JSONException, IOException {
        boolean ashby = board[2].equals("jobs.ashbyhq.com");
        boolean greenhouse = board[1].contains("boards-api.greenhouse.io/");
        for (int index = 0; index < jobs.length(); index++) {
            JSONObject job = jobs.optJSONObject(index);
            if (job == null || !job.optBoolean("isListed", true)) continue;
            String title = job.optString(ashby || greenhouse ? "title" : "text", "").trim();
            JSONObject categories = job.optJSONObject("categories");
            String location = categories == null ? job.optString("location","") : categories.optString("location","");
            String workplace = job.optString("workplaceType","");
            if (greenhouse && job.optJSONObject("location")!=null)
                location=job.getJSONObject("location").optString("name","");
            boolean remote = !IN_PERSON.matcher(workplace+" "+location).find() &&
                (job.optBoolean("isRemote") || REMOTE.matcher(workplace+" "+location).find());
            if (!remote && !LOCAL.matcher(location).find()) continue;
            String category = null;
            for (int rule=0; rule<RULES.length; rule++) {
                if (RULES[rule].matcher(title).find()) { category=TOPICS[rule][0]; break; }
            }
            if (category==null) continue;
            URL url;
            try { url = new URL(job.optString(greenhouse ? "absolute_url" : ashby ? "jobUrl" : "hostedUrl","")); }
            catch (IOException ignored) { continue; }
            if (!"https".equals(url.getProtocol()) || !(board[2].equals(url.getHost()) || greenhouse && (url.getHost().equals("job-boards.greenhouse.io") || url.getHost().equals("boards.greenhouse.io") || url.getHost().equals("www."+board[2]))) || url.getUserInfo() != null || url.getPort() != -1) continue;
            String name = board[0] + " — " + title;
            if (name.length() > 160) name = name.substring(0,160);
            JSONObject pay = job.optJSONObject("compensation");
            String budget = pay == null ? "Check original listing" : pay.optString("compensationTierSummary","Check original listing");
            leads.put(new JSONObject().put("name",name).put("kind",remote ? "Remote listing" : "Seattle-area listing").put("category",category).put("board",board[0]).put("budget",budget)
                .put("background","Listed on the employer’s public job board. Location: " + (location.isEmpty() ? "see listing" : location))
                .put("caveat","Confirm that the listing is open, you’re eligible, and the terms suit you.")
                .put("pitch","I’m interested in this role. I can share relevant portfolio samples and explain how I approach the work.")
                .put("url",url.toString()).put("researchUrl",url.toString()).put("contact","Open the original listing to apply.").put("priority",2));

        }
    }
}
