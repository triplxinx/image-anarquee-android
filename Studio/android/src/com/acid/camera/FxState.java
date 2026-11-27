package com.acid.camera;
import org.json.*;
/** Versioned, finite and bounded data-only preset; no executable shader imports. */
public class FxState {
 public static final int COUNT=54;
 public static class Slot {public int id=0;public boolean enabled=true;public float mix=1;public float[] p={.5f,.5f,.25f};Slot copy(){Slot s=new Slot();s.id=id;s.enabled=enabled;s.mix=mix;s.p=p.clone();return s;}}
 public Slot[] slots={new Slot(),new Slot(),new Slot()};public String name="Custom";public boolean bypass=false;
 public synchronized FxState copy(){FxState s=new FxState();s.name=name;s.bypass=bypass;for(int i=0;i<3;i++)s.slots[i]=slots[i].copy();return s;}
 public boolean active(){if(bypass)return false;for(Slot s:slots)if(s.enabled&&s.id!=0&&s.mix>0)return true;return false;}
 public boolean temporal(){if(bypass)return false;for(Slot s:slots)if(s.enabled&&s.mix>0&&s.id>=50)return true;return false;}
 public synchronized String json(){try{JSONObject j=new JSONObject();j.put("schema",1).put("name",name).put("bypass",bypass);JSONArray a=new JSONArray();for(Slot s:slots){JSONObject o=new JSONObject();JSONArray p=new JSONArray();for(float f:s.p)p.put(f);o.put("id",s.id).put("enabled",s.enabled).put("mix",s.mix).put("p",p);a.put(o);}return j.put("slots",a).toString(2);}catch(Exception e){throw new IllegalStateException(e);}}
 static float finite(double d)throws JSONException{if(Double.isNaN(d)||Double.isInfinite(d)||d<0||d>1)throw new JSONException("Parameters must be finite values from 0 to 1");return (float)d;}
 public static FxState parse(String text)throws JSONException{if(text.length()>65536)throw new JSONException("Preset exceeds 64 KB");JSONObject j=new JSONObject(text);if(j.getInt("schema")!=1)throw new JSONException("Unsupported preset schema");JSONArray a=j.getJSONArray("slots");if(a.length()!=3)throw new JSONException("A stack must have exactly three slots");FxState s=new FxState();s.name=j.optString("name","Imported");if(s.name.length()>100)s.name=s.name.substring(0,100);s.bypass=j.optBoolean("bypass",false);for(int i=0;i<3;i++){JSONObject o=a.getJSONObject(i);Slot slot=s.slots[i];slot.id=o.getInt("id");if(slot.id<0||slot.id>=COUNT)throw new JSONException("Unknown effect ID");slot.enabled=o.optBoolean("enabled",true);slot.mix=finite(o.getDouble("mix"));JSONArray p=o.getJSONArray("p");if(p.length()!=3)throw new JSONException("Expected three parameters");for(int k=0;k<3;k++)slot.p[k]=finite(p.getDouble(k));}return s;}
}
