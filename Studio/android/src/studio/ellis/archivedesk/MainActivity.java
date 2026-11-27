package studio.ellis.archivedesk;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64InputStream;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity {
    private static final String HOST = "archive-launch-desk.internal";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final int SELECT = 15;
    private static final int SAVE = 16;
    private static final int CARD_CAPTURE = 31, CARD_IMPORT = 33, CARD_EXPORT = 34;
    private static final long MAX_CATALOG_BYTES = 3L * 1024 * 1024;
    private static final int BATCH = 500;
    private static final Map<String,String> ASSETS;
    static {
        Map<String,String> assets = new LinkedHashMap<>();
        assets.put("/index.html", "text/html");
        assets.put("/styles.css", "text/css");
        assets.put("/ocr/tesseract.min.js","text/javascript");
        assets.put("/ocr/worker.min.js","text/javascript");
        assets.put("/ocr/tesseract-core-lstm.wasm.js","text/javascript");
        assets.put("/ocr/eng.traineddata.gz","application/octet-stream");
        assets.put("/cards.js","text/javascript");
        assets.put("/cards-sources.json","application/json");
        assets.put("/help.js","text/javascript");
        assets.put("/merch.js","text/javascript");
        assets.put("/brand/reactor.jpg","image/jpeg");
        assets.put("/brand/archive.json","application/json");
        assets.put("/brand/Curvy_Fonts_19-01-2023_57.png","image/png");
        assets.put("/brand/Design_for_the_Summer_Smoking_Room_at_Cardiff_Castle_2.jpg","image/jpeg");
        assets.put("/brand/3f53f5591d3bfd3720b9c8c1b6d4c253.jpg","image/jpeg");
        assets.put("/brand/1697455383-1-Zf2jDq58Lf.jpg","image/jpeg");
        assets.put("/brand/1703d315930e15232e2b09e1d0e449c8_e2e0cfab-2736-4808-b2aa-834427c4f761.jpg","image/jpeg");
        assets.put("/brand/7fac7d86998398bb587a5e26dfb5d92f.jpg","image/jpeg");
        assets.put("/brand/Kool7.png","image/png");
        assets.put("/brand/pp-504x498-pad-600x600-f8f8f8--1.jpg","image/jpeg");
        assets.put("/brand/a3dc509932cebb38cfa630cc5badb038.jpg","image/jpeg");
        assets.put("/promoters.js","text/javascript");
        assets.put("/affiliate.js","text/javascript");
        assets.put("/catalog.json","application/json");
        assets.put("/app.js", "text/javascript");
        assets.put("/leads.js", "text/javascript");
        assets.put("/plan.js", "text/javascript");
        assets.put("/intake.js", "text/javascript");
        assets.put("/idle.js", "text/javascript");
        assets.put("/licensing.js", "text/javascript");
        assets.put("/workdesk.js", "text/javascript");
        assets.put("/studio-render.js", "text/javascript");
        assets.put("/studio.js", "text/javascript");
        assets.put("/wide-net.js", "text/javascript");
        ASSETS = Collections.unmodifiableMap(assets);
    }

    private WebView browser;
    private ValueCallback<Uri[]> pendingSelection;
    private final AtomicBoolean wideScouting = new AtomicBoolean();
    private final AtomicBoolean scouting = new AtomicBoolean();
    private String pendingExport;
    private String pendingCard, pendingView, pendingBundle;
    private final AtomicBoolean cardScouting = new AtomicBoolean();

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (saved != null) {
            pendingCard = saved.getString("pendingCard");
            pendingView = saved.getString("pendingView");
            pendingBundle = saved.getString("pendingBundle");
        }
        browser = new WebView(this);
        browser.setBackgroundColor(0xFF111018);
        browser.getSettings().setJavaScriptEnabled(true);
        browser.getSettings().setDomStorageEnabled(true);
        browser.getSettings().setAllowFileAccess(false);
        // The native pickers grant read access to each selected content URI.
        browser.getSettings().setAllowContentAccess(true);
        browser.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        browser.getSettings().setSupportMultipleWindows(false);
        browser.setWebViewClient(new DashboardClient());
        browser.setWebChromeClient(new PickFilesClient());
        browser.addJavascriptInterface(new ExportBridge(), "ArchiveNative");
        if (Build.VERSION.SDK_INT >= 35) {
            browser.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(browser);
        if (saved == null || browser.restoreState(saved) == null) browser.loadUrl(HOME);
    }

    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);}
    @Override protected void onResume(){super.onResume();if(browser!=null)browser.evaluateJavascript("window.syncBackgroundScout?.()",null);}
    @Override protected void onSaveInstanceState(Bundle state) {
        browser.saveState(state);
        state.putString("pendingCard",pendingCard);
        state.putString("pendingView",pendingView);
        state.putString("pendingBundle",pendingBundle);
        super.onSaveInstanceState(state);
    }

    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && uri.getPort() == -1 && ASSETS.containsKey(uri.getPath());
    }

    private final class DashboardClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (local(uri)) {
                try {
                    String path = uri.getPath();
                    return new WebResourceResponse(ASSETS.get(path), "UTF-8", getAssets().open("desk" + path));
                } catch (IOException ignored) {}
            }
            String path = uri.getPath();
            if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPort()==-1
                && path != null && path.startsWith("/card-image/")) {
                String name=path.substring("/card-image/".length());
                java.io.File file=CardFiles.resolve(MainActivity.this,name);
                if(file!=null && file.isFile()) {
                    try {return new WebResourceResponse(CardFiles.mime(name),null,new java.io.FileInputStream(file));}
                    catch(IOException ignored){}
                }
            }
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (local(uri)) return false;
            if (request.isForMainFrame() && request.hasGesture()
                    && ("tel".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()))) {
                try { startActivity(new Intent("tel".equals(uri.getScheme()) ? Intent.ACTION_DIAL : Intent.ACTION_SENDTO, uri)); }
                catch (ActivityNotFoundException ignored) { notifyUser("No app is available for that contact route."); }
                return true;
            }
            if (request.isForMainFrame() && "https".equals(uri.getScheme())) {
                try {startActivity(new Intent(Intent.ACTION_VIEW, uri));}
                catch (ActivityNotFoundException ignored) {notifyUser("No browser is available for that link.");}
            }
            return true;
        }
    }

    private final class PickFilesClient extends WebChromeClient {
        @Override public boolean onShowFileChooser(WebView web, ValueCallback<Uri[]> callback, FileChooserParams params) {
            finishSelection(null);
            pendingSelection = callback;
            boolean images = false;
            boolean acceptsGeneric = false;
            for (String type : params.getAcceptTypes()) {
                if (type != null && (type.contains("ndjson") || type.contains("jsonl")
                    || type.equals(".imag3") || type.equals("application/octet-stream"))) acceptsGeneric = true;
                if (type != null && type.startsWith("image/")) images = true;
            }
            boolean multiple = params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;
            if (images && Build.VERSION.SDK_INT >= 33) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Choose image source")
                    .setItems(new String[]{"Photos (Google Photos if enabled)", "Files and Drive"}, (dialog, which) -> {
                        if (which == 0) openPhotoPicker(multiple);
                        else openFiles("image/*", multiple);
                    })
                    .setOnCancelListener(dialog -> finishSelection(null))
                    .show();
            } else {
                openFiles(images ? "image/*" : acceptsGeneric ? "*/*" : "application/json", multiple);
            }
            return true;
        }
    }

    private void openPhotoPicker(boolean multiple) {
        Intent intent = new Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*");
        if (multiple) {
            int limit = Math.min(BATCH, MediaStore.getPickImagesMaxLimit());
            if (limit > 1) intent.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, limit);
        }
        try {startActivityForResult(intent, SELECT);}
        catch (ActivityNotFoundException ignored) {openFiles("image/*", multiple);}
    }

    private void openFiles(String mime, boolean multiple) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
            .setType(mime).addCategory(Intent.CATEGORY_OPENABLE)
            .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {startActivityForResult(intent, SELECT);}
        catch (ActivityNotFoundException ignored) {
            finishSelection(null);
            notifyUser("Android Files was unavailable.");
        }
    }

    private void finishSelection(Uri[] result) {
        if (pendingSelection == null) return;
        ValueCallback<Uri[]> callback = pendingSelection;
        pendingSelection = null;
        callback.onReceiveValue(result);
    }

    @Override protected void onActivityResult(int code, int result, Intent intent) {
        super.onActivityResult(code, result, intent);
        if (code == CARD_CAPTURE || code == CARD_IMPORT) {
            String card=pendingCard, view=pendingView;
            pendingCard=null;pendingView=null;
            if(result==RESULT_OK && intent!=null && cardId(card)){
                if(code==CARD_CAPTURE)keepCardImage(card,intent.getStringExtra("view"),intent.getStringExtra("image"),intent.getStringExtra("audit"));
                else if(intent.getData()!=null) importCard(intent.getData(),card,view);
            }
            return;
        }
        if(code==CARD_EXPORT){
            String bundle=pendingBundle;pendingBundle=null;
            if(bundle!=null && bundle.matches("card-bundle-[0-9]+\\.json")) {
                java.io.File staged=new java.io.File(getCacheDir(),bundle);
                if(result==RESULT_OK && intent!=null && intent.getData()!=null)exportCards(intent.getData(),staged);
                else staged.delete();
            }
            return;
        }
        if (code == 17 && result == RESULT_OK && intent != null) {
            String choice = intent.getStringExtra("campaign");
            if (choice != null && choice.length() < 16000) {
                getSharedPreferences("affiliate-handoff", MODE_PRIVATE).edit().putString("choice", choice).apply();
                browser.evaluateJavascript("window.receiveAffiliateChoice?.()", null);
            }
            return;
        }
        if (code == SELECT) {
            if (result != RESULT_OK || intent == null) {finishSelection(null);return;}
            LinkedHashSet<Uri> selected = new LinkedHashSet<>();
            ClipData clips = intent.getClipData();
            if (clips != null) {
                for (int i = 0; i < clips.getItemCount(); i++) addContent(selected, clips.getItemAt(i).getUri());
            }
            addContent(selected, intent.getData());
            finishSelection(selected.isEmpty() ? null : selected.toArray(new Uri[0]));
        } else if (code == SAVE) {
            String export = pendingExport;
            pendingExport = null;
            Uri target = intent == null ? null : intent.getData();
            if (result == RESULT_OK && target != null && export != null) {
                new Thread(() -> writeExport(target, export), "archive-export").start();
            }
        }
    }

    private static void addContent(LinkedHashSet<Uri> set, Uri candidate) {
        if (candidate != null && "content".equals(candidate.getScheme())) set.add(candidate);
    }

    private void writeExport(Uri uri, String export) {
        try (InputStream source = new Base64InputStream(
                new ByteArrayInputStream(export.getBytes(StandardCharsets.US_ASCII)), android.util.Base64.DEFAULT);
             OutputStream sink = getContentResolver().openOutputStream(uri)) {
            if (sink == null) throw new IOException("No destination");
            byte[] buffer = new byte[16384];
            for (int length; (length = source.read(buffer)) != -1;) sink.write(buffer, 0, length);
        } catch (IOException | IllegalArgumentException ignored) {
            runOnUiThread(() -> notifyUser("Could not save the export."));
            return;
        }
        runOnUiThread(() -> notifyUser("Export saved."));
    }

    private static boolean cardId(String id) {
        return id != null && id.matches("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}");
    }

    private void cardEvent(String type, String json) {
        browser.evaluateJavascript("window.CardDesk?.receive("+org.json.JSONObject.quote(type)+","+json+")",null);
    }

    private void keepCardImage(String card, String view, String name, String audit) {
        java.io.File photo=CardFiles.resolve(this,name);
        if(!cardId(card) || photo==null || !photo.isFile())return;
        android.graphics.BitmapFactory.Options bounds=new android.graphics.BitmapFactory.Options();
        bounds.inJustDecodeBounds=true;
        android.graphics.BitmapFactory.decodeFile(photo.getPath(),bounds);
        int width=bounds.outWidth,height=bounds.outHeight;
        if(Build.VERSION.SDK_INT>=24) {
            try {
                int orientation=new android.media.ExifInterface(photo.getPath()).getAttributeInt("Orientation",1);
                if(orientation>=5 && orientation<=8){width=bounds.outHeight;height=bounds.outWidth;}
            } catch(IOException ignored){}
        }
        try {
            org.json.JSONObject payload=new org.json.JSONObject().put("id",card)
                .put("view",view).put("file",name).put("audit",audit)
                .put("width",width).put("height",height).put("bytes",photo.length());
            getSharedPreferences("card-delivery",MODE_PRIVATE).edit().putString(name,payload.toString()).apply();
            runOnUiThread(()->cardEvent("photo",payload.toString()));
        } catch(org.json.JSONException e){notifyUser("Could not store the image record.");}
    }

    private void importCard(Uri uri,String card,String view) {
        new Thread(()->{
            try {
                android.graphics.BitmapFactory.Options b=new android.graphics.BitmapFactory.Options();b.inJustDecodeBounds=true;
                try(InputStream input=getContentResolver().openInputStream(uri)){
                    if(input==null)throw new IOException("No image");
                    android.graphics.BitmapFactory.decodeStream(input,null,b);
                }
                if(b.outWidth<1 || b.outHeight<1)throw new IOException("Android could not read this image.");
                try(InputStream input=getContentResolver().openInputStream(uri)){
                    if(input==null)throw new IOException("No image");
                    String name=CardFiles.save(this,input,CardFiles.extension(b.outMimeType));
                    keepCardImage(card,view,name,"Imported original");
                }
            } catch(Exception e){notifyUser(e.getMessage()==null?"Image import failed.":e.getMessage());}
        },"card-import").start();
    }

    private void exportCards(Uri uri, java.io.File bundle) {
        new Thread(()->{
            try(OutputStream out=getContentResolver().openOutputStream(uri)) {
                if(out==null)throw new IOException("No output destination");
                byte[] bytes=new byte[(int)bundle.length()];
                try(java.io.DataInputStream in=new java.io.DataInputStream(new java.io.FileInputStream(bundle))){in.readFully(bytes);}
                org.json.JSONObject payload=new org.json.JSONObject(new String(bytes,StandardCharsets.UTF_8));
                org.json.JSONArray images=payload.getJSONArray("files");
                try(java.util.zip.ZipOutputStream zip=new java.util.zip.ZipOutputStream(out)) {
                    zip.putNextEntry(new java.util.zip.ZipEntry("catalog.json"));
                    zip.write(payload.get("metadata").toString().getBytes(StandardCharsets.UTF_8));
                    zip.closeEntry();
                    LinkedHashSet<String> seen=new LinkedHashSet<>();
                    byte[] buffer=new byte[65536];
                    for(int i=0;i<images.length();i++){
                        String id=images.getString(i);
                        if(!seen.add(id))continue;
                        java.io.File photo=CardFiles.resolve(this,id);
                        if(photo==null || !photo.isFile())throw new IOException("An original is unavailable");
                        zip.putNextEntry(new java.util.zip.ZipEntry("originals/"+id));
                        try(InputStream in=new java.io.FileInputStream(photo)){
                            int count;while((count=in.read(buffer))!=-1)zip.write(buffer,0,count);
                        }
                        zip.closeEntry();
                    }
                }
                notifyUser("Card portfolio exported.");
            } catch(Exception e) {
                try{android.provider.DocumentsContract.deleteDocument(getContentResolver(),uri);}catch(Exception ignored){}
                notifyUser("Portfolio export failed. Check that all originals are available.");
            } finally {bundle.delete();}
        },"card-export").start();
    }

    private final class ExportBridge {
        @JavascriptInterface public void openPhoneHost() {
            runOnUiThread(() -> startActivity(new Intent(MainActivity.this, PhoneHostActivity.class)));
        }

        @JavascriptInterface public boolean canStageStudioProof() {
            return getSharedPreferences(PhoneHostSettings.SETTINGS, MODE_PRIVATE)
                .getBoolean(PhoneHostSettings.USE_PHONE, true);
        }

        @JavascriptInterface public boolean openPhoneStudioOffer(String draft, String jpeg) {
            if (draft == null || draft.length() > 12000 || !canStageStudioProof()) return false;
            try {
                String proof = StudioProof.stage(MainActivity.this, jpeg);
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    startActivity(new Intent(MainActivity.this, PhoneHostActivity.class)
                        .putExtra(PhoneHostActivity.BRIEF, draft).putExtra(StudioProof.EXTRA, proof));
                });
                return true;
            } catch (IOException | IllegalArgumentException ignored) {
                return false;
            }
        }

        @JavascriptInterface public boolean openPhoneLicenseOffer(String draft) {
            if (draft == null || draft.length() > 12000 || !getSharedPreferences(
                PhoneHostSettings.SETTINGS, MODE_PRIVATE).getBoolean(PhoneHostSettings.USE_PHONE, true)) return false;
            runOnUiThread(() -> startActivity(new Intent(MainActivity.this, PhoneHostActivity.class)
                .putExtra(PhoneHostActivity.BRIEF, draft)));
            return true;
        }

        @JavascriptInterface public void openLicensingDesk(String address) {
            if (address == null || address.length() > 11000) return;
            Uri uri = Uri.parse(address);
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null ||
                uri.getUserInfo() != null || !"owner".equals(uri.getQueryParameter("license"))) return;
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
                } catch (ActivityNotFoundException ignored) {
                    notifyUser("No browser is available to open the licensing desk.");
                }
            });
        }

        @JavascriptInterface public void openCardCamera(String id, String view) {
            if(id==null || view==null || (!id.isEmpty() && !cardId(id)))return;
            runOnUiThread(()->{
                Intent intent=new Intent(MainActivity.this,CardCameraActivity.class).putExtra("view",view);
                if(id.isEmpty()){startActivity(intent);return;}
                pendingCard=id;
                startActivityForResult(intent.putExtra("returnPhoto",true),CARD_CAPTURE);
            });
        }

        @JavascriptInterface public void openAcidCamera() {
            runOnUiThread(()->{
                if(Build.VERSION.SDK_INT<29){notifyUser("ACID Camera effects require Android 10 or later.");return;}
                startActivity(new Intent(MainActivity.this,com.acid.camera.MainActivity.class));
            });
        }

        @JavascriptInterface public String acidAssets() {
            Map<String,?> all=getSharedPreferences("acid-asset-stack",MODE_PRIVATE).getAll();
            java.util.List<String> names=new java.util.ArrayList<>(all.keySet());
            names.sort((a,b)->Long.compare((Long)all.get(b),(Long)all.get(a)));
            org.json.JSONArray rows=new org.json.JSONArray();
            for(int i=0;i<Math.min(72,names.size());i++){
                String name=names.get(i);
                java.io.File original=CardFiles.resolve(MainActivity.this,name);
                if(original==null || !original.isFile())continue;
                try{rows.put(new org.json.JSONObject().put("file",name).put("date",all.get(name)));}
                catch(org.json.JSONException ignored){}
            }
            return rows.toString();
        }

        @JavascriptInterface public void attachAcidAsset(String id,String name,String view) {
            if(!cardId(id) || view==null || view.length()>32 || CardFiles.resolve(MainActivity.this,name)==null)return;
            if(!getSharedPreferences("acid-asset-stack",MODE_PRIVATE).contains(name))return;
            new Thread(()->keepCardImage(id,view,name,"Capture HUD original"),"card-attach").start();
        }

        @JavascriptInterface public void openCardRaster(String name) {
            java.io.File file=CardFiles.resolve(MainActivity.this,name);
            if(file!=null && file.isFile())runOnUiThread(()->startActivity(
                new Intent(MainActivity.this,RasterActivity.class).putExtra("image",name)));
        }

        @JavascriptInterface public void importCardPhoto(String id, String view) {
            if(!cardId(id) || view.length()>32)return;
            runOnUiThread(()->{
                pendingCard=id;pendingView=view;
                startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("image/*"),CARD_IMPORT);
            });
        }

        @JavascriptInterface public String cardPhotoInbox() {
            org.json.JSONArray rows=new org.json.JSONArray();
            for(Object item:getSharedPreferences("card-delivery",MODE_PRIVATE).getAll().values()){
                try{rows.put(new org.json.JSONObject(String.valueOf(item)));}catch(org.json.JSONException ignored){}
            }
            return rows.toString();
        }

        @JavascriptInterface public void acknowledgeCardPhoto(String name) {
            if(CardFiles.resolve(MainActivity.this,name)!=null)
                getSharedPreferences("card-delivery",MODE_PRIVATE).edit().remove(name).apply();
        }

        @JavascriptInterface public void scoutCards() {
            if(!cardScouting.compareAndSet(false,true))return;
            new Thread(()->{
                try{
                    String rows=CardScout.check(MainActivity.this).toString();
                    runOnUiThread(()->cardEvent("scout",rows));
                }catch(Exception e){runOnUiThread(()->cardEvent("scoutError","null"));}
                finally{cardScouting.set(false);}
            },"card-scout").start();
        }

        @JavascriptInterface public void exportCardPortfolio(String json) {
            if(json==null || json.length()>MAX_CATALOG_BYTES)return;
            runOnUiThread(()->{
                try {
                    java.io.File staged=java.io.File.createTempFile("card-bundle-", ".json", getCacheDir());
                    try(OutputStream out=new java.io.FileOutputStream(staged)){out.write(json.getBytes(StandardCharsets.UTF_8));}
                    pendingBundle=staged.getName();
                }catch(IOException e){notifyUser("Could not prepare the portfolio export.");return;}
                startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/zip").putExtra(Intent.EXTRA_TITLE,"Trading-card-portfolio.zip"),CARD_EXPORT);
            });
        }

        private final AtomicBoolean searchingCreators=new AtomicBoolean();
        @JavascriptInterface public boolean scoutCreators(String query) {
            if(query==null || query.trim().isEmpty() || query.length()>120 ||
               !searchingCreators.compareAndSet(false,true))return false;
            new Thread(()->{
                try{
                    String result=CreatorScout.search(query.trim());
                    runOnUiThread(()->{
                        if(!isDestroyed() && browser.getUrl()!=null && local(Uri.parse(browser.getUrl())))
                            browser.evaluateJavascript("window.CreatorDesk.receive("+result+")",null);
                    });
                }finally{searchingCreators.set(false);}
            },"creator-discovery").start();
            return true;
        }
        @JavascriptInterface public void openAffiliateDesk() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT < 28) {
                    notifyUser("The native owner desk requires Android 9 or later. Campaign drafting is available here.");
                    return;
                }
                startActivityForResult(new Intent(MainActivity.this, com.affiliateflow.launcher.MainActivity.class), 17);
            });
        }
        @JavascriptInterface public String pendingAffiliateChoice() {
            return getSharedPreferences("affiliate-handoff", MODE_PRIVATE).getString("choice", "");
        }
        @JavascriptInterface public void clearAffiliateChoice(String expected) {
            android.content.SharedPreferences prefs=getSharedPreferences("affiliate-handoff", MODE_PRIVATE);
            if(expected.equals(prefs.getString("choice",""))) prefs.edit().remove("choice").apply();
        }
        @JavascriptInterface public boolean backgroundScoutEnabled(){return BackgroundScout.prefs(MainActivity.this).getBoolean("enabled",false);}
        @JavascriptInterface public void configureBackgroundScout(boolean enabled){runOnUiThread(()->{if(enabled && Build.VERSION.SDK_INT>=33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},91);BackgroundScout.configure(MainActivity.this,enabled);});}
        @JavascriptInterface public String backgroundScoutResult(){return BackgroundScout.prefs(MainActivity.this).getString("result", "");}
        @JavascriptInterface public String takeScoutTarget(){Intent i=getIntent();if(i==null||!i.hasExtra("scoutSource"))return "null";String source=i.getStringExtra("scoutSource");i.removeExtra("scoutSource");return org.json.JSONObject.quote(source==null?"":source);}
        @JavascriptInterface public void openWideNetSearch(String address) {
            if (address == null || address.length() > 3500) return;
            Uri uri = Uri.parse(address);
            if (!"https".equals(uri.getScheme()) || !"www.google.com".equals(uri.getHost()) ||
                uri.getPort() != -1 || uri.getUserInfo() != null || !"/search".equals(uri.getPath())) return;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (ActivityNotFoundException ignored) { notifyUser("No browser is available to search."); }
            });
        }

        @JavascriptInterface public boolean refreshWideNet() {
            if (!wideScouting.compareAndSet(false, true)) return true;
            new Thread(() -> {
                String result;
                try { result = WideNetScout.fetch(); }
                catch (RuntimeException unavailable) { result = "{\"rows\":[],\"summary\":\"Sweep unavailable.\"}"; }
                final String payload = result;
                runOnUiThread(() -> {
                    wideScouting.set(false);
                    String page = browser.getUrl();
                    if (!isFinishing() && !isDestroyed() && page != null && local(Uri.parse(page))) {
                        browser.evaluateJavascript("window.WideNet?.receive("+payload+")",null);
                    }
                });
            },"wide-net-scout").start();
            return true;
        }

        @JavascriptInterface public void refreshPublicLeads() {
            if (!scouting.compareAndSet(false, true)) return;
            new Thread(() -> {
                String result;
                try { result = PublicLeadScout.fetch(); }
                finally { scouting.set(false); }
                runOnUiThread(() -> {
                    String page = browser.getUrl();
                    if (!isFinishing() && !isDestroyed() && page != null && local(Uri.parse(page))) {
                        browser.evaluateJavascript("window.acceptPublicLeadRefresh(" + result + ")", null);
                    }
                });
            }, "public-lead-scout").start();
        }
        @JavascriptInterface public void saveFile(String name, String mime, String data) {
            runOnUiThread(() -> {
                if (pendingExport != null) {notifyUser("Finish the current export first.");return;}
                if (data == null || data.length() > 90_000_000) {
                    notifyUser("This file is too large for in-app export.");return;
                }
                pendingExport = data;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime)
                    .putExtra(Intent.EXTRA_TITLE, name == null ? "archive-export" : name.replaceAll("[/\\\\]", "_"));
                try {startActivityForResult(intent, SAVE);}
                catch (ActivityNotFoundException ignored) {
                    pendingExport = null;
                    notifyUser("Android Files was unavailable.");
                }
            });
        }
    }

    private void notifyUser(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }
}
