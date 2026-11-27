package studio.ellis.archivedesk;

import org.json.*;
import java.io.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;

final class CreatorScout {
    private static String read(String address) throws IOException {
        HttpsURLConnection c=(HttpsURLConnection)new URL(address).openConnection();
        try {
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(7000);
            c.setReadTimeout(7000);
            if(c.getResponseCode()!=200)throw new IOException();
            try(InputStream in=c.getInputStream(); ByteArrayOutputStream out=new ByteArrayOutputStream()){
                byte[] buf=new byte[8192];
                for(int n;(n=in.read(buf))!=-1;){
                    if(out.size()+n>2*1024*1024)throw new IOException();
                    out.write(buf,0,n);
                }
                return new String(out.toByteArray(),StandardCharsets.UTF_8);
            }
        }finally{c.disconnect();}
    }

    static String search(String niche) {
        JSONObject result=new JSONObject();
        try {
            result.put("query",niche);
            try {
                JSONArray source=new JSONObject(read("https://itunes.apple.com/search?country=US&media=podcast&entity=podcast&limit=25&term="+URLEncoder.encode(niche,"UTF-8"))).getJSONArray("results");
                JSONArray shows=new JSONArray();
                for(int i=0;i<source.length();i++){
                    JSONObject s=source.getJSONObject(i);
                    String url=s.optString("collectionViewUrl","");
                    if(url.startsWith("https://podcasts.apple.com/"))shows.put(new JSONObject()
                      .put("name",s.optString("collectionName")).put("url",url).put("publisher",s.optString("artistName")));
                }
                result.put("shows",shows);
            }catch(Exception ignored){result.put("showsError",true);}
            try {result.put("trends",read("https://trends.google.com/trending/rss?geo=US"));}
            catch(IOException ignored){result.put("trendsError",true);}
        }catch(JSONException ignored){}
        return result.toString();
    }
}
