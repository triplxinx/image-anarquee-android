package studio.ellis.archivedesk;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class RasterCalibration {
    static final String PREFS = "acid-paper-calibration";
    static final RasterCalibration NONE = new RasterCalibration(new float[]{1,1,1}, new float[3], false);

    private static final String[] CHANNELS = {"r","g","b"};
    final float[] gain, offset;
    final boolean paired;

    private RasterCalibration(float[] gain, float[] offset, boolean paired) {
        this.gain=gain;
        this.offset=offset;
        this.paired=paired;
    }

    static String snapshot(JSONArray history, int cursor, int camera, boolean torch) {
        if (cursor<1) return "";
        JSONObject white=history.optJSONObject(0);
        if (white==null || white.optBoolean("skipped") || !white.has("camera") ||
            (camera>=0 && (white.optInt("camera",-1)!=camera || white.optBoolean("torch")!=torch))) return "";
        JSONObject black=cursor>=2?history.optJSONObject(1):null;
        if (black==null || !"black".equals(black.optString("kind")) || black.optBoolean("skipped") ||
            black.optBoolean("torch") || black.optInt("camera",-2)!=white.optInt("camera",-1)) return white.toString();
        try { return new JSONObject().put("white",white).put("black",black).toString(); }
        catch (JSONException e) { return white.toString(); }
    }

    static RasterCalibration decode(String snapshot) {
        if (snapshot.isEmpty()) return NONE;
        try {
            JSONObject root=new JSONObject(snapshot);
            JSONObject white=root.optJSONObject("white");
            JSONObject black=root.optJSONObject("black");
            if (white==null || black==null) return whiteOnly(read(white==null?root:white));
            int[] whites=read(white), blacks=read(black);
            return paired(whites,blacks);
        } catch (JSONException e) { return NONE; }
    }

    private static int[] read(JSONObject values) throws JSONException {
        int[] points=new int[3];
        for (int i=0;i<points.length;i++) points[i]=values.getInt(CHANNELS[i]);
        return points;
    }

    static RasterCalibration paired(int[] white, int[] black) {
        double target=(white[0]+white[1]+white[2])/3.0;
        float[] gain=new float[3], offset=new float[3];
        for (int i=0;i<3;i++) {
            int span=white[i]-black[i];
            if (black[i]<0 || black[i]>24 || white[i]>249 || span<100) return whiteOnly(white);
            gain[i]=(float)(target/span);
            if (gain[i]<.7f || gain[i]>1.55f) return whiteOnly(white);
            offset[i]=-black[i]*gain[i];
        }
        return new RasterCalibration(gain,offset,true);
    }

    private static RasterCalibration whiteOnly(int[] white) {
        double target=(white[0]+white[1]+white[2])/3.0;
        float[] gain=new float[3];
        for (int i=0;i<3;i++) {
            if (white[i]<=0 || white[i]>255) return NONE;
            gain[i]=(float)Math.max(.87,Math.min(1.14,target/white[i]));
        }
        return new RasterCalibration(gain,new float[3],false);
    }
}
