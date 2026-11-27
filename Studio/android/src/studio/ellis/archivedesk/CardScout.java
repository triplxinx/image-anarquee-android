package studio.ellis.archivedesk;

import android.content.Context;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Pattern;
import javax.net.ssl.HttpsURLConnection;
import org.json.*;

final class CardScout {
    private static final Pattern HIDDEN=Pattern.compile("(?is)<(script|style|noscript)\\b.*?</\\1\\s*>");
    private static final Pattern TAG=Pattern.compile("(?s)<[^>]*>");
    private static final Set<String> HOSTS=new HashSet<>(Arrays.asList("www.millcreeksports.com","www.cardkingdom.com",
        "cardkingdom.freshdesk.com","www.daveandadamsstore.com","goldin.co","comc.zendesk.com","help.tcgplayer.com","www.ebay.com","www.wsscaseattle.com"));

    static JSONArray check(Context context) throws Exception {
        JSONArray sources;
        try(InputStream input=context.getAssets().open("desk/cards-sources.json")) {
            sources=new JSONArray(new String(bytes(input,32000),StandardCharsets.UTF_8));
        }
        ExecutorService pool=Executors.newFixedThreadPool(4);
        try {
            List<Callable<JSONObject>> jobs=new ArrayList<>();
            for (int i=0;i<sources.length();i++){
                JSONObject row=sources.getJSONObject(i);
                jobs.add(()->checkOne(row));
            }
            JSONArray rows=new JSONArray();
            List<Future<JSONObject>> results=pool.invokeAll(jobs,22,TimeUnit.SECONDS);
            for(int i=0;i<results.size();i++) {
                try {rows.put(results.get(i).get());}
                catch(ExecutionException | CancellationException e) {
                    rows.put(sources.getJSONObject(i).put("status","Unavailable"));
                }
            }
            return rows;
        } finally {pool.shutdownNow();}
    }

    private static JSONObject checkOne(JSONObject row) throws JSONException {
        if(row.optBoolean("browseOnly"))return row;
        String status="Unavailable";
        try {
            String body=page(row.optString("verify",row.getString("url")));
            String visible=TAG.matcher(HIDDEN.matcher(body).replaceAll(" ")).replaceAll(" ")
                .replace("&nbsp;"," ").replaceAll("\\s+"," ").toLowerCase(Locale.ROOT);
            status=visible.contains(row.getString("signal"))?"Source verified":"Review source";
        } catch(IOException ignored){}
        String date=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());
        return row.put("checked",date).put("status",status);
    }

    private static String page(String address) throws IOException {
        URL url=new URL(address);
        for(int redirects=0;redirects<=3;redirects++){
            if(!"https".equals(url.getProtocol()) || !HOSTS.contains(url.getHost()) ||
                (url.getPort()!=-1 && url.getPort()!=443) || url.getUserInfo()!=null)throw new IOException("Unexpected source");
            HttpsURLConnection conn=(HttpsURLConnection)url.openConnection();
            conn.setRequestMethod("GET");conn.setConnectTimeout(5000);conn.setReadTimeout(6000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestProperty("User-Agent","ArchiveDesk/1.12 (public seller intake verification)");
            try {
                int status=conn.getResponseCode();
                if(status>=300 && status<400){
                    String location=conn.getHeaderField("Location");
                    if(location==null)throw new IOException("Missing redirect");
                    url=new URL(url,location);continue;
                }
                if(status!=200)throw new IOException("Source unavailable");
                try(InputStream in=conn.getInputStream()){return new String(bytes(in,1_800_000),StandardCharsets.UTF_8);}
            } finally {conn.disconnect();}
        }
        throw new IOException("Too many redirects");
    }

    private static byte[] bytes(InputStream input,int limit) throws IOException {
        ByteArrayOutputStream buf=new ByteArrayOutputStream();
        byte[] block=new byte[8192];int total=0,n;
        while(total<limit && (n=input.read(block,0,Math.min(limit-total,block.length)))!=-1){
            buf.write(block,0,n);total+=n;
        }
        return buf.toByteArray();
    }
}
