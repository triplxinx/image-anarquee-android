package studio.ellis.archivedesk;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.hardware.Camera;
import android.os.*;
import android.view.*;
import android.widget.*;
import java.io.ByteArrayInputStream;
import java.util.*;
import org.json.*;

@SuppressWarnings("deprecation")
public final class CardCameraActivity extends Activity implements TextureView.SurfaceTextureListener {
    private static final int INTERVAL = 175;
    private static final String[] STEPS = {"White reference", "Black reference", "Light evenness", "Exposure headroom"};
    private static final String[] FACES = {"Front", "Back", "Left edge", "Right edge", "Top edge", "Bottom edge", "Slab label", "Raking light", "Detail", "General image"};
    private final Handler main = new Handler(Looper.getMainLooper());
    private final SharedPreferences prefs() { return getSharedPreferences(RasterCalibration.PREFS, MODE_PRIVATE); }
    private TextureView preview;
    private Guide guide;
    private TextView meters, status;
    private SeekBar zoom,ev;
    private TextView cameraSettings;
    private int minEv;
    private float evStep;
    private Button capture, automatic, lamp, cal, undo, redo, skip, reset;
    private Spinner side;
    private Camera camera;
    private HandlerThread thread;
    private Handler worker;
    private CardAudit.Reading last, previous;
    private volatile boolean running;
    private boolean busy, auto, armed = true, torch, hasTorch, calibrating, previewing;
    private int lightMode, stable, dark, bright, facing, sensor, previewRotation;
    private volatile int generation;
    private int savedCursor, calibrationFrames, calibrationEpoch;
    private boolean restoreCalibrationTorch;
    private JSONArray history = new JSONArray();
    private String acceptedName;
    private boolean returnPhoto;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state!=null) calibrating=state.getBoolean("calibrating");
        returnPhoto = getIntent().getBooleanExtra("returnPhoto", false);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        loadCalibration();
        build();
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.CAMERA}, 1);
    }

    private void build() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xff080a09);
        preview = new TextureView(this);
        preview.setSurfaceTextureListener(this);
        root.addView(preview, new FrameLayout.LayoutParams(-1,-1));
        guide = new Guide();
        root.addView(guide, new FrameLayout.LayoutParams(-1,-1));
        LinearLayout top = new LinearLayout(this);
        top.setOrientation(1); top.setPadding(dp(12), dp(5), dp(12), dp(3));
        top.setBackgroundColor(0xcd101415);
        TextView title = label(returnPhoto ? "ACIDBATH  /  CARD SCANNER" : "ACIDBATH  /  CAPTURE HUD", 16);
        title.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        LinearLayout heading=row(top);
        heading.addView(title,new LinearLayout.LayoutParams(0,dp(44),5));
        button(heading,"(?)",this::help);
        meters = label("R ---   G ---   B ---   A ---", 13);
        meters.setTypeface(Typeface.MONOSPACE);
        top.addView(meters);
        root.addView(top, new FrameLayout.LayoutParams(-1,-2,Gravity.TOP));
        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(1); bottom.setBackgroundColor(0xe5131516);
        bottom.setPadding(dp(5),dp(4),dp(5),dp(3));
        status = label("Opening rear camera", 13);
        status.setMinLines(2);
        bottom.addView(status);
        side = new Spinner(this);
        side.setContentDescription("Photograph view");
        ArrayAdapter<String> choices = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, FACES);
        side.setAdapter(choices);
        int requested=Arrays.asList(FACES).indexOf(getIntent().getStringExtra("view"));
        side.setSelection(requested>=0?requested:returnPhoto?0:FACES.length-1);
        side.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            public void onNothingSelected(AdapterView<?> v) {}
            public void onItemSelected(AdapterView<?> v, View row, int i, long id) { stable=0; armed=true; }
        });
        bottom.addView(side);
        LinearLayout primary = row(bottom);
        capture = button(primary,"Shutter", () -> { if (calibrating) sampleReference(false); else take(); });
        automatic = button(primary,"Auto off", () -> {auto = !auto; armed = true; stable=0; labels();});
        lamp = button(primary,"Light auto", () -> { lightMode=(lightMode+1)%3; torch(lightMode==1); labels(); });
        cal = button(primary,"Calibrate", () -> { calibrating=!calibrating; stable=0;
            calibrationChanged(); });
        zoom = new SeekBar(this); zoom.setContentDescription("Optical or digital preview zoom");
        zoom.setProgress(0);
        zoom.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onStartTrackingTouch(SeekBar s) {}
            public void onStopTrackingTouch(SeekBar s) {}
            public void onProgressChanged(SeekBar s, int value, boolean fromUser) {
                if (camera == null || !fromUser) return;
                try { Camera.Parameters p=camera.getParameters(); p.setZoom(value); camera.setParameters(p); stable=0;resetReferenceReading();cameraSettings(); }
                catch (RuntimeException ignored) {}
            }
        });
        cameraSettings=label("Zoom 1.00×   EV +0.0",12);bottom.addView(cameraSettings);
        bottom.addView(zoom);
        ev=new SeekBar(this);ev.setContentDescription("Exposure compensation");
        ev.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            public void onStartTrackingTouch(SeekBar s){}
            public void onStopTrackingTouch(SeekBar s){}
            public void onProgressChanged(SeekBar s,int value,boolean fromUser){
                if(!fromUser || camera==null)return;
                try {
                    Camera.Parameters params=camera.getParameters();
                    params.setExposureCompensation(minEv+value);camera.setParameters(params);stable=0;resetReferenceReading();cameraSettings();
                }catch(RuntimeException ignored){}
            }
        });
        bottom.addView(ev);
        LinearLayout tools = row(bottom);
        undo=button(tools,"Undo", () -> move(-1)); redo=button(tools,"Redo", () -> move(1));
        skip=button(tools,"Skip", () -> sampleReference(true));
        reset=button(tools,"Restart", () -> new android.app.AlertDialog.Builder(this).setMessage("Restart calibration and clear its saved steps?")
            .setNegativeButton("Cancel",null).setPositiveButton("Restart",(d,w)->{history=new JSONArray();savedCursor=0;persist();calibrationChanged();}).show());
        FrameLayout.LayoutParams bottomParams = new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);
        root.addView(bottom,bottomParams);
        root.setOnApplyWindowInsetsListener((v,in) -> {
            top.setTranslationY(in.getSystemWindowInsetTop());
            bottom.setTranslationY(-in.getSystemWindowInsetBottom());
            preview.setPadding(0,0,0,0);
            return in;
        });
        setContentView(root);
        labels();
    }

    private TextView label(String value, int sp) {
        TextView view = new TextView(this); view.setText(value); view.setTextSize(sp); view.setTextColor(0xffbaffd6);
        return view;
    }

    private LinearLayout row(LinearLayout parent) {
        LinearLayout result = new LinearLayout(this); parent.addView(result); return result;
    }

    private Button button(LinearLayout row, String text, Runnable action) {
        Button b = new Button(this); b.setText(text); b.setAllCaps(false); b.setTextSize(12);
        b.setTextColor(0xffbbffdc); b.setMinWidth(0); b.setPadding(0,0,0,0);
        b.setOnClickListener(v -> action.run());
        row.addView(b, new LinearLayout.LayoutParams(0,dp(44),1));
        return b;
    }

    private int dp(int n) { return Math.round(getResources().getDisplayMetrics().density*n); }

    private void help() {
        new android.app.AlertDialog.Builder(this).setTitle("Capture HUD")
            .setItems(new String[]{"Shutter and alignment","Lighting and RGBA","White and black calibration","Raster and evidence"},(d,i)-> {
                String[] details={
                    "For a front or back view, place the full card on a contrasting, matte background. Line up all four sides with the guide. Arm Auto and hold still, or tap Shutter to capture at any time. For an edge or detail, select that view before capturing.",
                    "Light auto turns the torch on when shadows stay too dark. Switch to Light off or tilt the card if foil or a sleeve reflects the light. RGBA shows sampled preview channels. Luma, contrast span and clipping help you evaluate the exposure.",
                    "Use clean, unprinted white printer paper under the same light you will use for the card. Zoom in until all edges disappear, then tap Sample white. Next, cover the camera completely with your hand. Keep it covered until the black sample is saved. The torch stays off during that step. Use Skip if needed. Your place and undo/redo history are saved. Restart clears the samples.",
                    "Use Crop / export to tune a separate derivative. Check the original for scratches, edge whitening and other condition details. Paired samples estimate neutral white and black in the camera’s processed RGB. Certified color measurement requires a calibrated target."
                };
                new android.app.AlertDialog.Builder(this).setMessage(details[i]).setPositiveButton("Close",null).show();
            }).setNegativeButton("Close",null).show();
    }

    private RectF cardGuide() {
        float aspect=(float)Math.max(1,preview.getWidth())/Math.max(1,preview.getHeight());
        float h=Math.max(.36f,Math.min(.59f,.68f*aspect*1.4f));
        return new RectF(.16f,.50f-h/2,.84f,.50f+h/2);
    }

    private void labels() {
        if (capture == null) return;
        capture.setText(calibrating ? (savedCursor==0?"Sample white":blackStep()?"Sample black":"Sample") : "Shutter");
        capture.setEnabled(!busy && (calibrating ? previewing && savedCursor < STEPS.length && calibrationFrames>=3 : previewing));
        automatic.setText(auto ? "Auto armed" : "Auto off");
        automatic.setEnabled(!calibrating && !busy);
        lamp.setText(blackStep()?"Light off":new String[]{"Light auto","Light on","Light off"}[lightMode]);
        lamp.setEnabled(hasTorch && !busy && !blackStep());
        zoom.setEnabled(zoom.getMax()>0 && previewing && !busy && !blackStep());
        ev.setEnabled(ev.getMax()>0 && previewing && !busy && !blackStep());
        cal.setText(calibrating ? "Done" : "Calibrate");
        cal.setEnabled(!busy);
        side.setVisibility(calibrating? View.GONE : View.VISIBLE);
        undo.setEnabled(calibrating && !busy && savedCursor > 0); redo.setEnabled(calibrating && !busy && savedCursor < history.length());
        skip.setEnabled(calibrating && !busy && savedCursor < STEPS.length);
        reset.setEnabled(!busy);
        for (Button b : new Button[]{undo,redo,skip,reset}) b.setVisibility(calibrating ? View.VISIBLE : View.GONE);
        if (calibrating) reportCalibration();
        guide.invalidate();
    }

    private boolean blackStep() { return calibrating && savedCursor==1; }

    private void resetReferenceReading() {
        calibrationEpoch++;
        calibrationFrames=0;
        last=null;
    }

    private void calibrationChanged() {
        resetReferenceReading();
        dark=0;
        bright=0;
        if (blackStep()) {
            restoreCalibrationTorch=torch;
            torch(false);
        } else if (calibrating && savedCursor==2 && (lightMode==1 || (lightMode==0 && restoreCalibrationTorch))) {
            torch(true);
        } else if (!calibrating && lightMode==1) {
            torch(true);
        }
        labels();
    }

    private void reportCalibration() {
        if (busy) return;
        if (blackStep() && torch) {status.setText("Turn the torch off before taking the black reference.");return;}
        if (savedCursor >= STEPS.length) {status.setText("Calibration saved. Tap Done, Undo or Restart."); return;}
        JSONObject white=blackStep()?history.optJSONObject(0):null;
        String whitePoint=white!=null && white.has("r")
            ? String.format(Locale.US,"  White RGB %d/%d/%d.",white.optInt("r"),white.optInt("g"),white.optInt("b")) : "";
        String instruction=blackStep()
            ? "Cover the camera completely with your hand. Keep it covered while sampling." + whitePoint
            : (savedCursor==2?"Uncover the lens. ":"")+"Fill the frame with evenly lit, blank white printer paper.";
        status.setText(STEPS[savedCursor]+" · "+instruction+(calibrationFrames>=3?" Ready.":""));
    }

    private void loadCalibration() {
        try { history = new JSONArray(prefs().getString("history","[]")); }
        catch (JSONException ignored) { history=new JSONArray(); }
        savedCursor = Math.max(0, Math.min(history.length(),prefs().getInt("cursor",0)));
        if (prefs().getInt("referenceVersion",1)<2) {
            // The first legacy sample is still usable for white-only correction.
            savedCursor=Math.min(savedCursor,1);
            while (history.length()>1) history.remove(history.length()-1);
            persist();
        }
    }

    private void persist() {
        prefs().edit().putString("history",history.toString()).putInt("cursor",savedCursor)
            .putInt("referenceVersion",2).apply();
    }

    private void move(int direction) { savedCursor+=direction; persist(); calibrationChanged(); }

    private void sampleReference(boolean skipStep) {
        if (busy || savedCursor >= STEPS.length) return;
        boolean black=blackStep();
        if (skipStep) {storeSample(null,black,torch);return;}
        if (!previewing || camera==null || calibrationFrames<3) return;
        boolean sampleTorch=torch;
        int session=generation;
        busy=true;
        previewing=false;
        labels();
        status.setText(black?"Sampling black. Keep the camera covered…":"Sampling the white paper…");
        try {
            camera.takePicture(null,null,(bytes,c)-> {
                if (session!=generation || !running) return;
                worker.post(()-> {
                    if (session!=generation || !running) return;
                    CardAudit.Reading reading;
                    try (CapturePriority ignored=new CapturePriority()) {reading=referenceReading(bytes);}
                    catch (Exception e) {reading=null;}
                    CardAudit.Reading result=reading;
                    main.post(()->{
                        if (session!=generation || !running) return;
                        busy=false;
                        resetReferenceReading();
                        restartPreview();
                        if (result!=null && (black?result.covered():result.paper())) {
                            storeSample(result,black,sampleTorch);
                        } else {
                            status.setText(black?"Black sample too bright. Seal the lens with your hand and try again."
                                :"White sample uneven or clipped. Adjust the paper and try again.");
                        }
                    });
                });
            });
        } catch (RuntimeException e) {
            busy=false;
            resetReferenceReading();
            restartPreview();
            status.setText("Could not take the reference sample. Try again.");
        }
    }

    private static CardAudit.Reading referenceReading(byte[] jpeg) {
        if (jpeg==null || jpeg.length==0) return null;
        BitmapFactory.Options options=new BitmapFactory.Options();
        options.inSampleSize=8;
        Bitmap decoded=BitmapFactory.decodeByteArray(jpeg,0,jpeg.length,options);
        if (decoded==null) return null;
        try {
            Bitmap sample=Bitmap.createScaledBitmap(decoded,144,216,true);
            try {return CardAudit.scan(sample);}
            finally {if(sample!=decoded)sample.recycle();}
        } finally {decoded.recycle();}
    }

    private void storeSample(CardAudit.Reading sample, boolean black, boolean sampleTorch) {
        try {
            JSONObject step=new JSONObject().put("skipped",sample==null)
                .put("kind",black?"black":savedCursor==0?"white":"paper");
            if (sample!=null) step.put("r",sample.red).put("g",sample.green).put("b",sample.blue)
                .put("luma",sample.light).put("uniformity",sample.flatness).put("clip",sample.clipping)
                .put("torch",sampleTorch).put("camera",sensor);
            while (history.length()>savedCursor) history.remove(history.length()-1);
            history.put(step);
            savedCursor++;
            persist();
            calibrationChanged();
        } catch (JSONException ex) { status.setText("Could not save this calibration sample"); }
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putBoolean("calibrating",calibrating);
        super.onSaveInstanceState(state);
    }

    @Override protected void onResume() {
        super.onResume();
        running=true;
        thread=new HandlerThread("acid-card-audit"); thread.start(); worker=new Handler(thread.getLooper());
        if (preview.isAvailable()) open();
    }

    @Override protected void onPause() {
        running=false; generation++;
        main.removeCallbacks(poll);
        release();
        thread.quitSafely();
        busy=false; resetReferenceReading();
        super.onPause();
    }

    @Override public void onRequestPermissionsResult(int request, String[] p, int[] result) {
        super.onRequestPermissionsResult(request,p,result);
        if (result.length!=0 && result[0]==PackageManager.PERMISSION_GRANTED && preview.isAvailable()) open();
        else status.setText("Camera permission is required. Card photos can also be imported from the desk.");
    }

    @Override public void onSurfaceTextureAvailable(SurfaceTexture texture, int w, int h) {open();}
    @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture texture) {generation++;main.removeCallbacks(poll);release();busy=false;return true;}
    @Override public void onSurfaceTextureSizeChanged(SurfaceTexture texture,int w,int h) {fitPreview();}
    @Override public void onSurfaceTextureUpdated(SurfaceTexture texture) {}

    private void open() {
        if (!running || camera!=null || checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED) return;
        try {
            int n=Camera.getNumberOfCameras();
            int selected=-1;
            for (int i=0;i<n;i++) {
                Camera.CameraInfo info=new Camera.CameraInfo(); Camera.getCameraInfo(i,info);
                if (selected<0) selected=i;
                if (info.facing==Camera.CameraInfo.CAMERA_FACING_BACK) {selected=i;break;}
            }
            if (selected<0) throw new IllegalStateException("No camera");
            sensor=selected;
            Camera.CameraInfo info=new Camera.CameraInfo(); Camera.getCameraInfo(selected,info); facing=info.facing;
            camera=Camera.open(selected);
            Camera.Parameters params=camera.getParameters();
            List<String> flashes=params.getSupportedFlashModes();
            hasTorch=flashes!=null && flashes.contains(Camera.Parameters.FLASH_MODE_TORCH);
            List<String> focus=params.getSupportedFocusModes();
            if (focus!=null && focus.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE))
                params.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE);
            Camera.Size still=Collections.max(params.getSupportedPictureSizes(),
                Comparator.comparingInt(s -> s.width*s.height));
            Camera.Size live=Collections.min(params.getSupportedPreviewSizes(),
                Comparator.comparingDouble(s -> 20*Math.abs((double)s.width/s.height-(double)still.width/still.height)
                    +Math.abs(s.width-1280)/1280.0));
            params.setPictureSize(still.width,still.height); params.setPreviewSize(live.width,live.height);
            int rotation=getWindowManager().getDefaultDisplay().getRotation();
            int degrees=rotation==Surface.ROTATION_90?90:rotation==Surface.ROTATION_180?180:rotation==Surface.ROTATION_270?270:0;
            int jpegRotation=facing==Camera.CameraInfo.CAMERA_FACING_FRONT?(info.orientation+degrees)%360:(info.orientation-degrees+360)%360;
            previewRotation=facing==Camera.CameraInfo.CAMERA_FACING_FRONT?(360-jpegRotation)%360:jpegRotation;
            params.setJpegQuality(98); params.setRotation(jpegRotation);
            if(hasTorch)params.setFlashMode(Camera.Parameters.FLASH_MODE_OFF);
            camera.setParameters(params);
            camera.setDisplayOrientation(previewRotation);
            preview.getSurfaceTexture().setDefaultBufferSize(live.width,live.height);
            fitPreview();
            camera.setErrorCallback((code,c)->{ release(); labels(); status.setText("Camera stopped. Reopen the HUD to try again."); });
            camera.setPreviewTexture(preview.getSurfaceTexture()); camera.startPreview(); previewing=true;
            if (!params.isZoomSupported()) zoom.setMax(0);
            if (params.isZoomSupported()) {zoom.setMax(params.getMaxZoom());zoom.setProgress(params.getZoom());}
            minEv=params.getMinExposureCompensation();evStep=params.getExposureCompensationStep();
            int maxEv=params.getMaxExposureCompensation();ev.setMax(maxEv-minEv);ev.setEnabled(maxEv>minEv);
            ev.setProgress(params.getExposureCompensation()-minEv);
            cameraSettings();
            status.setText("Keep all four edges inside the guide. Tap Shutter or arm auto capture.");
            if(lightMode==1 && !blackStep())torch(true);
            labels(); main.removeCallbacks(poll); main.postDelayed(poll,INTERVAL);
        } catch (Exception e) {release(); labels(); status.setText("Camera unavailable. Close other camera apps or import a photo.");}
    }

    private void cameraSettings() {
        if(camera==null)return;
        try {
            Camera.Parameters p=camera.getParameters();
            double z=p.isZoomSupported()?p.getZoomRatios().get(p.getZoom())/100.0:1;
            cameraSettings.setText(String.format(Locale.US,"Zoom %.2f×   /   EV %+.1f",z,p.getExposureCompensation()*evStep));
        }catch(RuntimeException ignored){}
    }

    private void fitPreview() {
        if (camera==null || preview.getWidth()==0 || preview.getHeight()==0) return;
        Camera.Size size=camera.getParameters().getPreviewSize();
        float image=previewRotation%180==0?(float)size.width/size.height:(float)size.height/size.width;
        float view=(float)preview.getWidth()/preview.getHeight();
        Matrix matrix=new Matrix();
        matrix.setScale(Math.max(1f,image/view), Math.max(1f,view/image), preview.getWidth()/2f, preview.getHeight()/2f);
        preview.setTransform(matrix);
    }

    private void release() {
        if (camera!=null) {
            torch(false);
            camera.release(); camera=null;
        }
        previewing=false; hasTorch=false; dark=0; bright=0; stable=0; previous=null; armed=true; torch=false;
    }

    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (!running || camera==null) return;
            if (previewing && !busy && preview.isAvailable() && preview.getWidth()>0) {
                Bitmap frame=preview.getBitmap(144,216);
                int session = generation, revision=calibrationEpoch;
                boolean active = (calibrating && savedCursor<STEPS.length) || (!calibrating && auto && armed);
                RectF region=cardGuide();
                if (frame!=null) worker.post(() -> {
                    try {
                        CardAudit.Reading a;
                        if (active) try (CapturePriority ignored=new CapturePriority()) { a=CardAudit.scan(frame,region); }
                        else a=CardAudit.scan(frame,region);
                        main.post(()->{ if (generation==session && revision==calibrationEpoch && previewing && !busy) update(a); });
                    } finally {frame.recycle();}
                    main.post(()->{if (generation==session && running) main.postDelayed(poll,INTERVAL);});
                });
                else main.postDelayed(this,INTERVAL);
            } else main.postDelayed(this,INTERVAL);
        }
    };

    private void update(CardAudit.Reading a) {
        meters.setText(a.hud());
        if (!blackStep() && lightMode==0 && hasTorch) {
            dark=a.light<43?dark+1:0;
            bright=(a.clipping>.13 || a.light>231)?bright+1:0;
            if (!torch && dark>=3 && bright==0 && SystemClock.elapsedRealtime()>nextLampChange) torch(true);
            else if (torch && bright>=3 && SystemClock.elapsedRealtime()>nextLampChange) torch(false);
        }
        if (calibrating) {
            boolean valid=blackStep()?!torch && a.covered():a.paper();
            calibrationFrames=valid?(a.stable(last)?Math.min(3,calibrationFrames+1):1):0;
            last=a;
            capture.setEnabled(previewing && savedCursor<STEPS.length && calibrationFrames>=3);
            reportCalibration();
            return;
        }
        boolean edge=side.getSelectedItemPosition()>=2;
        boolean qualifies=a.fast(edge);
        boolean consistent=a.stable(previous);
        previous=a;
        if (qualifies && consistent) stable++; else stable=0;
        guide.ready=stable>=2; guide.invalidate();
        status.setText(qualifies ? (auto && armed ? "Hold still · auto shutter ready" : "Ready · " + a.strict())
            : a.light < 43 ? "More light needed" : a.clipping>.13 ? "Tilt away from glare"
            : !edge && !a.aligned ? "Line up all four edges on the guide" : "Hold steady and check focus");
        if (auto && armed && stable>=3) {armed=false; take();}
    }

    private long nextLampChange;
    private void torch(boolean on) {
        if (!hasTorch || camera==null || on==torch) return;
        try {
            Camera.Parameters p=camera.getParameters();
            p.setFlashMode(on?Camera.Parameters.FLASH_MODE_TORCH:Camera.Parameters.FLASH_MODE_OFF);
            camera.setParameters(p); torch=on; stable=0;resetReferenceReading();
            nextLampChange=SystemClock.elapsedRealtime()+1700;
        } catch (RuntimeException ignored) {hasTorch=false;labels();}
    }

    private void take() {
        if (camera==null || !previewing || busy) return;
        int session=generation;
        int selectedFace=side.getSelectedItemPosition();
        boolean capturedWithTorch=torch;
        String neutralReference=RasterCalibration.snapshot(history,savedCursor,sensor,capturedWithTorch);
        busy=true; previewing=false; labels(); status.setText("Saving the full-resolution original…");
        try {
            camera.takePicture(null,null,(bytes,c)-> {
                if (session!=generation || !running) return;
                worker.post(()-> {
                    if (session!=generation || !running) return;
                    String name=null, reading="Review this capture";
                    try (CapturePriority ignored=new CapturePriority()) {
                        name=CardFiles.save(this,new ByteArrayInputStream(bytes),"jpg");
                        android.graphics.BitmapFactory.Options options=new android.graphics.BitmapFactory.Options();
                        options.inSampleSize=8;
                        Bitmap decoded=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);
                        if (decoded!=null) {
                            try {
                                Bitmap audit=Bitmap.createScaledBitmap(decoded,144,216,true);
                                try { reading=CardAudit.scan(audit).strict(); }
                                finally {if (audit!=decoded) audit.recycle();}
                            } finally {decoded.recycle();}
                        }
                        getSharedPreferences("card-image-notes",MODE_PRIVATE).edit().putString(name,reading)
                            .putString(name+".neutral",neutralReference).apply();
                    } catch (Exception ex) {if (name==null) reading="Capture could not be saved";}
                    String result=name, audit=reading;
                    main.post(()-> {
                        if (session!=generation || !running) {
                            java.io.File orphan=CardFiles.resolve(this,result);
                            if (orphan!=null) orphan.delete();
                            return;
                        }
                        acceptedName=result;
                        busy=false;
                        if (acceptedName==null) {restartPreview(); status.setText(audit); return;}
                        torch(false);
                        if (returnPhoto) {
                            setResult(RESULT_OK,new Intent().putExtra("image",acceptedName).putExtra("view",FACES[selectedFace]).putExtra("audit",audit));
                            finish();
                        } else {
                            getSharedPreferences("acid-asset-stack",MODE_PRIVATE).edit()
                                .putLong(acceptedName,System.currentTimeMillis()).apply();
                            startActivity(new Intent(this,RasterActivity.class).putExtra("image",acceptedName));
                        }
                    });
                });
            });
        } catch (RuntimeException e) {busy=false;restartPreview();status.setText("Shutter failed. Try again.");}
    }

    private void restartPreview() {
        try { if (camera!=null) {camera.startPreview();previewing=true;} }
        catch (RuntimeException e) {release();}
        labels();
    }

    private final class Guide extends View {
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        boolean ready;
        Guide() {super(CardCameraActivity.this);}
        @Override protected void onDraw(Canvas canvas) {
            float w=getWidth(),h=getHeight();
            RectF card=cardGuide();
            float x=w*card.left,y=h*card.top,r=w*card.right,b=h*card.bottom;
            paint.setColor(calibrating?0xfffbdf82:ready?0xff8affbc:0xff9cf4db);
            paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(dp(2));
            if (blackStep()) return;
            if (calibrating) {canvas.drawRect(w*.25f,h*.25f,w*.75f,h*.75f,paint);return;}
            float mark=w*.09f;
            for (float ox:new float[]{x,r}) for (float oy:new float[]{y,b}) {
                canvas.drawLine(ox,oy,ox+(ox==x?mark:-mark),oy,paint);
                canvas.drawLine(ox,oy,ox,oy+(oy==y?mark:-mark),paint);
            }
            canvas.drawLine(w/2-dp(7),h/2,w/2+dp(7),h/2,paint);
            canvas.drawLine(w/2,h/2-dp(7),w/2,h/2+dp(7),paint);
        }
    }
}
