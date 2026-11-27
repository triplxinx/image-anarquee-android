package com.acid.camera;
import android.content.Context;import java.io.*;import org.json.*;
class FxCatalog {
 final JSONArray effects,presets;FxCatalog(Context c)throws Exception{effects=new JSONArray(read(c,"fx/catalog.json"));presets=new JSONArray(read(c,"fx/presets.json"));}
 static String read(Context c,String file)throws IOException{try(InputStream in=c.getAssets().open(file);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");}}
 JSONObject effect(int id){return effects.optJSONObject(Math.max(0,Math.min(FxState.COUNT-1,id)));}
 String name(int id){return effect(id).optString("name");}
 void assign(FxState.Slot slot,int id){JSONObject e=effect(id);slot.id=id;slot.enabled=true;slot.mix=1;JSONArray p=e.optJSONArray("defaults");for(int i=0;i<3;i++)slot.p[i]=(float)p.optDouble(i,.5);}
}
