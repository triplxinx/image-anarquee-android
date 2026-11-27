package studio.ellis.archivedesk;

import android.app.Activity;
import android.content.Intent;
import android.graphics.*;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.util.Locale;
import java.util.concurrent.*;
import java.util.zip.CRC32;
import org.json.*;

public final class RasterActivity extends Activity {
    private static final int SAVE = 32;
    private static final String[] PROFILES = {"Archival photo", "Trading card 1:1", "Image licensing", "Proof image", "Merch preview",
        "Wide vinyl banner", "Screen print", "Textile print", "Apparel 1:1", "Collectible detail", "Web gallery", "Custom"};
    // Inches and nominal delivery PPI. Shared printer or lab specifications take precedence.
    private static final double[][] DEFAULTS = {{8,10,600},{2.5,3.5,600},{8,12,300},{6,9,300},{10,10,180},
        {96,24,75},{12,16,300},{12,16,150},{12,16,300},{4,6,600},{6,8,160},{8,10,300}};
    private final ExecutorService work = Executors.newSingleThreadExecutor();
    private File original;
    private String name;
    private Bitmap thumbnail;
    private Crop cropper;
    private SeekBar exposure, contrast, temperature, saturation;
    private EditText width,height,ppi;
    private Spinner profile, format, fit;
    private CheckBox neutral, background;
    private TextView stats;
    private Button save;
    private int fullWidth, fullHeight;
    private RectF selection = new RectF(0,0,1,1);
    private Settings pending;
    private boolean saving, rasterizing, destroyed;
    private int refresh;
    private final Handler main = new Handler(Looper.getMainLooper());
    private RasterCalibration calibration=RasterCalibration.NONE;
    private boolean captureReference;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        name=getIntent().getStringExtra("image");
        original=CardFiles.resolve(this,name);
        if(original==null || !original.isFile()) {finish();return;}
        if(state!=null) {
            selection=new RectF(state.getFloat("left"),state.getFloat("top"),state.getFloat("right",1),state.getFloat("bottom",1));
            pending=(Settings)state.getSerializable("pending");
        }
        loadCalibration();
        build();
        if (state!=null) neutral.setChecked(state.getBoolean("applyReference",captureReference&&calibration.paired));
        work.execute(() -> {
            try {
                BitmapFactory.Options bounds=new BitmapFactory.Options(); bounds.inJustDecodeBounds=true;
                BitmapFactory.decodeFile(original.getPath(),bounds);
                if (bounds.outWidth<1 || bounds.outHeight<1) throw new IOException("Unsupported raster");
                int n=1;
                while (Math.max(bounds.outWidth,bounds.outHeight)/n>1100) n*=2;
                Bitmap small=decode(n);
                int orientation=orientation();
                fullWidth=orientation>=5 && orientation<=8?bounds.outHeight:bounds.outWidth;
                fullHeight=orientation>=5 && orientation<=8?bounds.outWidth:bounds.outHeight;
                runOnUiThread(() -> {
                    if (destroyed) {small.recycle();return;}
                    thumbnail=small; update();
                });
            } catch(Exception ex) { runOnUiThread(()->stats.setText("Android could not decode this image.")); }
        });
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putFloat("left",selection.left);state.putFloat("top",selection.top);
        state.putFloat("right",selection.right);state.putFloat("bottom",selection.bottom);
        state.putSerializable("pending",pending);
        state.putBoolean("applyReference",neutral.isChecked());
    }

    private int orientation() {
        if(Build.VERSION.SDK_INT<24) return 1;
        try { return new android.media.ExifInterface(original.getPath()).getAttributeInt("Orientation",1); }
        catch(IOException ex) {return 1;}
    }

    private Bitmap decode(int sample) throws IOException {
        BitmapFactory.Options opts=new BitmapFactory.Options();opts.inSampleSize=sample;opts.inPreferredConfig=Bitmap.Config.ARGB_8888;
        if(Build.VERSION.SDK_INT>=26) opts.inPreferredColorSpace=ColorSpace.get(ColorSpace.Named.SRGB);
        Bitmap b=BitmapFactory.decodeFile(original.getPath(),opts);
        if(b==null) throw new IOException("Android could not decode the image");
        Matrix m=new Matrix();
        switch(orientation()) {
            case 2:m.setScale(-1,1);break;
            case 3:m.setRotate(180);break;
            case 4:m.setScale(1,-1);break;
            case 5:m.setRotate(90);m.postScale(-1,1);break;
            case 6:m.setRotate(90);break;
            case 7:m.setRotate(-90);m.postScale(-1,1);break;
            case 8:m.setRotate(-90);break;
            default:return b;
        }
        Bitmap oriented=Bitmap.createBitmap(b,0,0,b.getWidth(),b.getHeight(),m,true);
        if(oriented!=b)b.recycle();
        return oriented;
    }

    private void loadCalibration() {
        android.content.SharedPreferences notes=getSharedPreferences("card-image-notes",MODE_PRIVATE);
        calibration=RasterCalibration.decode(notes.getString(name+".neutral",""));
        captureReference=calibration!=RasterCalibration.NONE;
        if (captureReference) return;
        android.content.SharedPreferences saved=getSharedPreferences(RasterCalibration.PREFS,MODE_PRIVATE);
        try {
            JSONArray history=new JSONArray(saved.getString("history","[]"));
            RasterCalibration current=RasterCalibration.decode(
                RasterCalibration.snapshot(history,saved.getInt("cursor",0),-1,false));
            if (current.paired) calibration=current;
        } catch(JSONException ignored){}
    }

    private void build() {
        ScrollView scroll=new ScrollView(this); scroll.setFillViewport(true);
        LinearLayout body=new LinearLayout(this); body.setOrientation(1);
        body.setBackgroundColor(0xff101413);
        body.setPadding(dp(12),dp(8),dp(12),dp(10));
        scroll.addView(body);
        body.setOnApplyWindowInsetsListener((v,in)->{
            v.setPadding(dp(12)+in.getSystemWindowInsetLeft(),dp(8)+in.getSystemWindowInsetTop(),
                dp(12)+in.getSystemWindowInsetRight(),dp(10)+in.getSystemWindowInsetBottom());
            return in;
        });
        text(body,"ACIDBATH   /   RASTER DESK",21);
        text(body,"Drag green corners to crop the derivative. The original stays intact.",13);
        cropper=new Crop(); body.addView(cropper,new LinearLayout.LayoutParams(-1,dp(270)));
        Button reset=new Button(this);reset.setText("Reset crop");reset.setOnClickListener(v->{selection.set(0,0,1,1);update();});body.addView(reset);
        profile=spinner(body,"Export profile",PROFILES);
        LinearLayout dimensions=new LinearLayout(this);body.addView(dimensions);
        width=number(dimensions,"Width in",true);height=number(dimensions,"Height in",true);ppi=number(dimensions,"PPI",false);
        format=spinner(body,"Encoding",new String[]{"PNG · lossless","JPEG · quality 98","TIFF · lossless, sRGB ICC"});
        fit=spinner(body,"Fit to print dimensions",new String[]{"Fit · letterbox","Fill · center crop"});
        neutral=new CheckBox(this);
        boolean available=calibration!=RasterCalibration.NONE;
        neutral.setText(!available?"Camera calibration unavailable for this image":captureReference
            ? (calibration.paired?"Apply captured white and black references":"Apply captured white reference")
            : "Apply saved white and black references (manual)");
        neutral.setEnabled(available);
        neutral.setChecked(captureReference&&calibration.paired);
        body.addView(neutral);
        if (available&&!captureReference)
            text(body,"Use the saved references only if this image was taken with the same camera and lighting.",13);
        background=new CheckBox(this);background.setText("Transparent PNG margins");body.addView(background);
        exposure=slider(body,"Brightness",80,40);contrast=slider(body,"Contrast",80,40);temperature=slider(body,"Warmth",60,30);
        saturation=slider(body,"Saturation",200,100);
        Button autoTune=new Button(this);autoTune.setText("Suggest conservative adjustment");
        autoTune.setOnClickListener(v->suggest());body.addView(autoTune);
        stats=text(body,"Reading original…",13);
        save=new Button(this);save.setText("Export raster");save.setOnClickListener(v -> chooseDestination());body.addView(save);
        setContentView(scroll);
        profile.setOnItemSelectedListener(new Selection(() -> {
            double[] row=DEFAULTS[profile.getSelectedItemPosition()];
            width.setText(String.valueOf(row[0]));height.setText(String.valueOf(row[1]));ppi.setText(String.valueOf((int)row[2]));
            format.setSelection(profile.getSelectedItemPosition()==0?2:0);
            update();
        }));
        for(EditText e:new EditText[]{width,height,ppi})e.addTextChangedListener(new android.text.TextWatcher(){
            public void beforeTextChanged(CharSequence s,int start,int count,int after){}
            public void onTextChanged(CharSequence s,int start,int before,int count){update();}
            public void afterTextChanged(android.text.Editable e){}
        });
        for(Spinner s:new Spinner[]{format,fit})s.setOnItemSelectedListener(new Selection(this::update));
        neutral.setOnCheckedChangeListener((v,on)->update());
        background.setOnCheckedChangeListener((v,on)->update());
    }

    private TextView text(LinearLayout parent,String value,int size) {
        TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(0xffc7ffe3);parent.addView(t);return t;
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private Spinner spinner(LinearLayout root,String label,String[] values){
        text(root,label,13);
        Spinner s=new Spinner(this);s.setContentDescription(label);
        s.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,values));
        root.addView(s);return s;
    }
    private EditText number(LinearLayout row,String label,boolean fraction){
        LinearLayout cell=new LinearLayout(this);cell.setOrientation(1);row.addView(cell,new LinearLayout.LayoutParams(0,-2,1));
        text(cell,label,13);
        EditText e=new EditText(this);e.setSingleLine(true);e.setContentDescription(label);
        e.setInputType(android.text.InputType.TYPE_CLASS_NUMBER|(fraction?android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL:0));
        cell.addView(e);return e;
    }
    private SeekBar slider(LinearLayout root,String label,int max,int middle){
        TextView t=text(root,label+" · "+(middle==100?"100%":"0"),13);
        SeekBar s=new SeekBar(this);s.setContentDescription(label);s.setMax(max);s.setProgress(middle);root.addView(s);
        s.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onStartTrackingTouch(SeekBar s){}
            public void onStopTrackingTouch(SeekBar s){}
            public void onProgressChanged(SeekBar s,int v,boolean user) {
                t.setText(label+" · "+(middle==100?v+"%":String.format(Locale.US,"%+d",v-middle)));update();
            }
        });
        return s;
    }

    private Settings settings() {
        try {
            double w=Double.parseDouble(width.getText().toString()),h=Double.parseDouble(height.getText().toString());
            int p=Integer.parseInt(ppi.getText().toString());
            long px=Math.round(w*p),py=Math.round(h*p);
            if(w<=0 || h<=0 || p<36 || p>2400 || px<1 || py<1 || px>18000 || py>18000 || px*py>32000000L)
                return null;
            return new Settings((int)px,(int)py,p,format.getSelectedItemPosition(),fit.getSelectedItemPosition()==1,
                background.isChecked(),neutral.isChecked()?calibration:RasterCalibration.NONE,exposure.getProgress()-40,
                contrast.getProgress()-40,temperature.getProgress()-30,saturation.getProgress(),new RectF(selection));
        } catch(RuntimeException e){return null;}
    }

    private void update() {
        if (stats==null || destroyed) return;
        Settings s=settings();
        cropper.invalidate();
        save.setEnabled(thumbnail!=null && s!=null && !saving);
        if(thumbnail==null) return;
        int rev=++refresh;
        main.removeCallbacksAndMessages(null);
        if(s==null){stats.setText("Use positive dimensions, 36–2400 PPI, and up to 32 megapixels.");return;}
        double availableX=fullWidth*s.cropW,availableY=fullHeight*s.cropH;
        double scale=s.fill?Math.max(s.w/availableX,s.h/availableY):Math.min(s.w/availableX,s.h/availableY);
        String dimensions=String.format(Locale.US,"%d × %d px · %d PPI · sRGB output\n%s",
            s.w,s.h,s.ppi,scale>1.005?"Upsampling: source detail is "+Math.round(s.ppi/scale)+" effective PPI":"Source supports the selected PPI");
        stats.setText(dimensions);
        main.postDelayed(()->{
            if(destroyed || saving || rasterizing || thumbnail==null)return;
            rasterizing=true;
            work.execute(()->{
                String audit;
                try {
                    Bitmap mini=Bitmap.createBitmap(144,216,Bitmap.Config.ARGB_8888);
                    try {drawImage(new Canvas(mini),thumbnail,s,false,144,216);audit=CardAudit.scan(mini).strict();}
                    finally {mini.recycle();}
                } catch(Exception e) {audit="Preview audit unavailable";}
                String result=audit;
                runOnUiThread(()->{
                    rasterizing=false;
                    if(destroyed)return;
                    if(rev==refresh) stats.setText(dimensions+"\n"+result);
                    else update();
                });
            });
        },160);
    }

    private void suggest() {
        if(thumbnail==null || saving)return;
        Bitmap src=thumbnail;
        work.execute(()->{
            Bitmap sample=Bitmap.createScaledBitmap(src,144,216,true);
            CardAudit.Reading original;
            try{original=CardAudit.scan(sample);}finally{if(sample!=src)sample.recycle();}
            int offset=original.clipping>.012 || original.darkClipping>.035 ? 0 :
                (int)Math.max(-12,Math.min(12,(121-original.light)*.18));
            if(original.high+offset>=247 || original.low+offset<=8)offset=0;
            int result=offset;
            runOnUiThread(()->{
                if(destroyed || saving)return;
                exposure.setProgress(40+result);contrast.setProgress(40);
                temperature.setProgress(30);saturation.setProgress(100);
                if (captureReference) neutral.setChecked(neutral.isEnabled());
                update();
                Toast.makeText(this,"Adjustment previewed. Inspect the image and quality checks before export.",Toast.LENGTH_SHORT).show();
            });
        });
    }

    private void chooseDestination() {
        pending=settings();if(pending==null)return;
        String extension=pending.png?".png":pending.tiff?".tif":".jpg";
        startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType(pending.png?"image/png":pending.tiff?"image/tiff":"image/jpeg").putExtra(Intent.EXTRA_TITLE,"ACID-"+name.substring(0,8)+extension),SAVE);
    }

    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request!=SAVE || result!=RESULT_OK || data==null || data.getData()==null || pending==null)return;
        Settings s=pending;Uri uri=data.getData();pending=null;saving=true;update();
        work.execute(()->export(uri,s));
    }

    private void export(Uri uri, Settings s) {
        File temp=null;
        Bitmap source=null,result=null;
        try {
            int sample=1;
            double croppedW=fullWidth*s.cropW,croppedH=fullHeight*s.cropH;
            double scale=s.fill?Math.max(s.w/croppedW,s.h/croppedH):Math.min(s.w/croppedW,s.h/croppedH);
            while (sample*2*scale<=1) sample*=2;
            if((long)(fullWidth/sample)*(fullHeight/sample)+(long)s.w*s.h>38_000_000L)
                throw new IOException("Export exceeds the working image memory limit. Reduce output dimensions or crop a smaller original.");
            source=decode(sample);
            result=Bitmap.createBitmap(s.w,s.h,Bitmap.Config.ARGB_8888);
            drawImage(new Canvas(result),source,s,true,s.w,s.h);
            if(s.tiff) {
                byte[] icc;
                try(InputStream in=getAssets().open("raster-srgb.icc")){
                    ByteArrayOutputStream tmp=new ByteArrayOutputStream();transfer(in,tmp);icc=tmp.toByteArray();
                }
                try(OutputStream out=getContentResolver().openOutputStream(uri)){
                    if(out==null)throw new IOException("Export destination unavailable");
                    RasterTiff.write(result,s.ppi,icc,out);
                }
                done("TIFF saved · "+s.w+" × "+s.h+" px");
                return;
            }
            temp=File.createTempFile("acid-raster",s.png?".png":".jpg",getCacheDir());
            try(OutputStream out=new FileOutputStream(temp)){
                if(!result.compress(s.png?Bitmap.CompressFormat.PNG:Bitmap.CompressFormat.JPEG,98,out))throw new IOException("Encoding failed");
            }
            if(!s.png && Build.VERSION.SDK_INT>=24) {
                android.media.ExifInterface meta=new android.media.ExifInterface(temp.getPath());
                meta.setAttribute("XResolution",s.ppi+"/1");meta.setAttribute("YResolution",s.ppi+"/1");
                meta.setAttribute("ResolutionUnit","2");meta.setAttribute("ColorSpace","1");meta.saveAttributes();
            }
            try(OutputStream out=getContentResolver().openOutputStream(uri)){
                if(out==null)throw new IOException("Export destination unavailable");
                try(InputStream in=new FileInputStream(temp)){
                    if(s.png) writePngDensity(in,out,s.ppi);
                    else transfer(in,out);
                }
            }
            done("Export saved · "+s.w+" × "+s.h+" px");
        } catch(Exception | OutOfMemoryError e){
            try {android.provider.DocumentsContract.deleteDocument(getContentResolver(),uri);}
            catch(Exception ignored){}
            done(e instanceof OutOfMemoryError?"Insufficient memory for this size":e.getMessage());
        } finally { if(source!=null)source.recycle();if(result!=null)result.recycle();if(temp!=null)temp.delete(); }
    }

    private void done(String message) {runOnUiThread(()->{if(!destroyed){saving=false;update();Toast.makeText(this,message,Toast.LENGTH_LONG).show();}});}

    private static void transfer(InputStream in, OutputStream out) throws IOException {
        byte[] data=new byte[32768];int n;while((n=in.read(data))!=-1)out.write(data,0,n);
    }

    static void writePngDensity(InputStream stream,OutputStream dest,int ppi) throws IOException {
        DataInputStream in=new DataInputStream(stream);DataOutputStream out=new DataOutputStream(dest);
        byte[] signature=new byte[8];in.readFully(signature);out.write(signature);
        byte[] buffer=new byte[32768];
        for(;;){
            int n=in.readInt(),kind=in.readInt();
            if(n<0)throw new IOException("Invalid PNG chunk");
            if(kind==0x70485973){if(n!=9)throw new IOException("Invalid PNG density");in.readFully(new byte[9]);in.readInt();continue;}
            out.writeInt(n);out.writeInt(kind);
            for(int left=n;left>0;){int count=Math.min(left,buffer.length);in.readFully(buffer,0,count);out.write(buffer,0,count);left-=count;}
            out.writeInt(in.readInt());
            if(kind==0x49484452) {
                ByteArrayOutputStream bytes=new ByteArrayOutputStream(13);DataOutputStream density=new DataOutputStream(bytes);
                int meter=(int)Math.round(ppi/.0254);
                density.writeInt(0x70485973);density.writeInt(meter);density.writeInt(meter);density.writeByte(1);
                byte[] chunk=bytes.toByteArray();CRC32 crc=new CRC32();crc.update(chunk);
                out.writeInt(9);out.write(chunk);out.writeInt((int)crc.getValue());
            }
            if(kind==0x49454e44)break;
        }
    }

    private static void drawImage(Canvas canvas,Bitmap image,Settings s,boolean fitPrint,int w,int h) {
        Rect r=sourceRect(image,s);
        boolean transparent=s.png&&s.transparency;
        canvas.drawColor(transparent?Color.TRANSPARENT:Color.WHITE);
        RectF target=new RectF(0,0,w,h);
        if(fitPrint){
            float scale=s.fill?Math.max((float)w/r.width(),(float)h/r.height()):Math.min((float)w/r.width(),(float)h/r.height());
            float dw=r.width()*scale,dh=r.height()*scale;
            target.set((w-dw)/2,(h-dh)/2,(w+dw)/2,(h+dh)/2);
        }
        Paint p=new Paint(Paint.FILTER_BITMAP_FLAG);p.setColorFilter(s.filter());
        canvas.drawBitmap(image,r,target,p);
    }

    private static Rect sourceRect(Bitmap image,Settings s){
        int left=Math.round(s.x*image.getWidth()),top=Math.round(s.y*image.getHeight());
        return new Rect(left,top,Math.max(left+1,Math.round((s.x+s.cropW)*image.getWidth())),
            Math.max(top+1,Math.round((s.y+s.cropH)*image.getHeight())));
    }

    @Override protected void onDestroy(){
        destroyed=true;main.removeCallbacksAndMessages(null);
        if(thumbnail!=null)work.execute(()->thumbnail.recycle());
        work.shutdown();super.onDestroy();
    }

    private final class Crop extends View {
        final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        final RectF area=new RectF();
        int corner=-1;
        Crop(){super(RasterActivity.this);setContentDescription("Crop image with four draggable corners");}
        @Override protected void onDraw(Canvas canvas){
            if(thumbnail==null)return;
            float scale=Math.min((float)getWidth()/thumbnail.getWidth(),(float)getHeight()/thumbnail.getHeight());
            float w=thumbnail.getWidth()*scale,h=thumbnail.getHeight()*scale,x=(getWidth()-w)/2,y=(getHeight()-h)/2;
            area.set(x,y,x+w,y+h); paint.setStyle(Paint.Style.FILL);
            Settings s=settings();paint.setColorFilter(s==null?null:s.filter());
            canvas.drawBitmap(thumbnail,null,area,paint);paint.setColorFilter(null);
            float a=x+selection.left*w,b=y+selection.top*h,c=x+selection.right*w,d=y+selection.bottom*h;
            paint.setColor(0x99000000);
            canvas.drawRect(x,y,x+w,b,paint);canvas.drawRect(x,d,x+w,y+h,paint);
            canvas.drawRect(x,b,a,d,paint);canvas.drawRect(c,b,x+w,d,paint);
            paint.setColor(0xffabffc2);paint.setStrokeWidth(dp(2));paint.setStyle(Paint.Style.STROKE);
            canvas.drawRect(a,b,c,d,paint);paint.setStyle(Paint.Style.FILL);
            for(float i:new float[]{a,c})for(float j:new float[]{b,d})canvas.drawCircle(i,j,dp(8),paint);
        }
        @Override public boolean onTouchEvent(MotionEvent e){
            if(area.isEmpty())return false;
            float x=(e.getX()-area.left)/area.width(),y=(e.getY()-area.top)/area.height();
            switch(e.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    float cx=Math.abs(x-selection.left)<=Math.abs(x-selection.right)?selection.left:selection.right;
                    float cy=Math.abs(y-selection.top)<=Math.abs(y-selection.bottom)?selection.top:selection.bottom;
                    if(Math.hypot((x-cx)*area.width(),(y-cy)*area.height())>dp(32))return false;
                    corner=(cx==selection.left?0:1)+(cy==selection.top?0:2);
                    getParent().requestDisallowInterceptTouchEvent(true);return true;
                case MotionEvent.ACTION_MOVE:
                    if(corner<0)return false;
                    if((corner&1)==0)selection.left=Math.max(0,Math.min(selection.right-.08f,x));
                    else selection.right=Math.min(1,Math.max(selection.left+.08f,x));
                    if((corner&2)==0)selection.top=Math.max(0,Math.min(selection.bottom-.08f,y));
                    else selection.bottom=Math.min(1,Math.max(selection.top+.08f,y));
                    update();return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    getParent().requestDisallowInterceptTouchEvent(false);corner=-1;return true;
                default:return false;
            }
        }
    }

    private static final class Selection implements AdapterView.OnItemSelectedListener {
        final Runnable action;Selection(Runnable action){this.action=action;}
        public void onItemSelected(AdapterView<?> v,View row,int position,long id){action.run();}
        public void onNothingSelected(AdapterView<?> v){}
    }

    private static final class Settings implements Serializable {
        private static final long serialVersionUID=1L;
        final int w,h,ppi,brightness,contrast,warmth,saturation;
        final boolean png,tiff,fill,transparency;
        final float[] gains, blackOffsets;
        final float x,y,cropW,cropH;
        Settings(int w,int h,int ppi,int format,boolean fill,boolean transparency,RasterCalibration calibration,
            int brightness,int contrast,int warmth,int saturation,RectF crop) {
            this.w=w;this.h=h;this.ppi=ppi;this.png=format==0;this.tiff=format==2;this.fill=fill;this.transparency=transparency;
            this.gains=calibration.gain;this.blackOffsets=calibration.offset;
            this.brightness=brightness;this.contrast=contrast;this.warmth=warmth;this.saturation=saturation;
            x=crop.left;y=crop.top;cropW=crop.width();cropH=crop.height();
        }
        ColorMatrixColorFilter filter(){
            float c=1+contrast/100f,offset=brightness+128*(1-c);
            float[] black=blackOffsets==null?RasterCalibration.NONE.offset:blackOffsets;
            ColorMatrix m=new ColorMatrix(new float[]{
                gains[0],0,0,0,black[0], 0,gains[1],0,0,black[1], 0,0,gains[2],0,black[2], 0,0,0,1,0});
            ColorMatrix saturationMatrix=new ColorMatrix();
            saturationMatrix.setSaturation(saturation/100f);
            m.postConcat(saturationMatrix);
            m.postConcat(new ColorMatrix(new float[]{c,0,0,0,offset+warmth,0,c,0,0,offset,
                0,0,c,0,offset-warmth,0,0,0,1,0}));
            return new ColorMatrixColorFilter(m);
        }
    }
}
