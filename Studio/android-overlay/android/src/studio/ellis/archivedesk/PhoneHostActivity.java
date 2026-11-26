package studio.ellis.archivedesk;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputFilter;
import android.text.InputType;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.DateFormat;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

public final class PhoneHostActivity extends Activity {
    private static final int PICK_MOCKUP = 410, EXPORT_GHOST = 412;
    private String exportId;
    static final String BRIEF = "license-brief";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, EditText> fields = new LinkedHashMap<>();
    private LinearLayout page, inbox;
    private TextView status, imageStatus;
    private EditText origin;
    private CheckBox lan, rights;
    private Uri mockup;
    private SharedPreferences settings;
    private PhoneOffers offers;
    private final Runnable refreshStatus = new Runnable() {
        @Override public void run() {
            StringBuilder message = new StringBuilder(PhoneHostService.status);
            for (String address : PhoneHostService.localAddresses) message.append("\n").append(address);
            if (!PhoneHostService.publicAddress.isEmpty()) message.append("\nPublic address configured: ")
                .append(PhoneHostService.publicAddress).append("\nRequires a reachable HTTPS endpoint (relay optional).");
            status.setText(message.toString());
            handler.postDelayed(this, 700);
        }
    };

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        settings = getSharedPreferences(PhoneHostSettings.SETTINGS, MODE_PRIVATE);
        offers = PhoneHostService.store(this);
        JSONObject draft = new JSONObject();
        String incoming = saved == null ? getIntent().getStringExtra(BRIEF) : saved.getString(BRIEF);
        try { if (incoming != null) draft = new JSONObject(incoming); } catch (Exception ignored) {}
        if (saved != null) { mockup = saved.getParcelable("mockup"); exportId = saved.getString("exportId"); }
        else mockup = StudioProof.uri(this, getIntent().getStringExtra(StudioProof.EXTRA));
        ScrollView scroll = new ScrollView(this);
        page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(18), dp(12), dp(18), dp(20));
        scroll.addView(page);
        if (Build.VERSION.SDK_INT >= 35) {
            scroll.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(scroll);
        heading("XXX!NK.  /  HOST WEBSITE");
        body("Serve your licensing previews from iMAG3. Your offer editor and request inbox stay in the app.");
        status = body(PhoneHostService.status);
        CheckBox usePhone = check("Use this phone when I create a licensing preview from a lead",
            settings.getBoolean(PhoneHostSettings.USE_PHONE, true));
        usePhone.setOnCheckedChangeListener((view, checked) ->
            settings.edit().putBoolean(PhoneHostSettings.USE_PHONE, checked).apply());
        lan = check("Allow preview access over Wi-Fi / hotspot",
            saved == null ? settings.getBoolean(PhoneHostService.LAN, false) : saved.getBoolean("lan"));
        origin = input("Public HTTPS address (optional)", settings.getString(PhoneHostSettings.PUBLIC_ORIGIN, ""), 255, InputType.TYPE_TEXT_VARIATION_URI);
        body("Local Ghost needs no relay. Use trusted Wi-Fi or hotspot only: local HTTP is not encrypted. Remote Ghost requires a reachable HTTPS endpoint, which can be direct or relayed. Restart after changing networks.");
        button(page, "Start / restart hosting", view -> startHost());
        button(page, "Stop hosting", view -> {
            PhoneHostService.status = "Stopped";
            stopService(new Intent(this, PhoneHostService.class));
        });
        button(page, "Open buyer key page on this phone", view -> {
            if (PhoneHostService.localAddresses.isEmpty()) {
                toast("Start hosting first.");
                return;
            }
            open(Uri.parse(PhoneHostService.localAddresses.get(0) + "/"));
        });

        heading("Create a private offer");
        body("Attach a mockup composed for the buyer’s project. iMAG3 makes a smaller watermarked copy for the site.");
        add(draft, "buyer", "Lead or organization", 250, 0);
        add(draft, "email", "Buyer email (optional)", 254, InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        add(draft, "source", "Original brief URL (optional)", 1000, InputType.TYPE_TEXT_VARIATION_URI);
        add(draft, "project", "Project title", 250, 0);
        add(draft, "context", "What they asked for and how the work fits", 2200, InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        add(draft, "placement", "Example placement", 250, 0);
        add(draft, "scope", "Proposed usage, term, territory and exclusivity", 2200, InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        add(draft, "price", "Proposed fee (optional)", 180, 0);
        add(draft, "pitch", "Pitch to send", 6000, InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        fields.put("hours", input("Ghost Host expiry in hours (1–2160)", draft.optString("hours", "24"), 4, -1));
        imageStatus = body(mockup == null ? "No mockup selected" : "Mockup selected");
        button(page, "Choose mockup", view -> {
            Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(pick, PICK_MOCKUP);
        });
        rights = check("I have permission to show this work and offer the proposed use", saved != null && saved.getBoolean("rights"));
        button(page, "Create preview and pitch link", this::create);

        heading("Offers and buyer requests");
        button(page, "Refresh inbox", view -> refreshInbox());
        inbox = new LinearLayout(this);
        inbox.setOrientation(LinearLayout.VERTICAL);
        page.addView(inbox);
        refreshInbox();
        if (incoming != null && saved == null) handler.post(() -> fields.get("buyer").requestFocus());
    }

    @Override protected void onResume() { super.onResume(); handler.post(refreshStatus); }
    @Override protected void onPause() { handler.removeCallbacks(refreshStatus); super.onPause(); }
    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putString(BRIEF, draft().toString());
        state.putString("exportId", exportId);
        state.putParcelable("mockup", mockup);
        state.putBoolean("lan", lan.isChecked());
        state.putBoolean("rights", rights.isChecked());
    }

    private void startHost() {
        try {
            String target = PhoneHostSettings.publicOrigin(origin.getText().toString());
            settings.edit().putString(PhoneHostSettings.PUBLIC_ORIGIN, target)
                .putBoolean(PhoneHostService.LAN, lan.isChecked()).apply();
            Intent service = new Intent(this, PhoneHostService.class).putExtra(PhoneHostService.LAN, lan.isChecked());
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(service);
            else startService(service);
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 411);
            }
        } catch (Exception badAddress) { toast(badAddress.getMessage()); }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == EXPORT_GHOST && result == RESULT_OK && data != null && data.getData() != null) {
            try {
                JSONObject record = offers.get(exportId);
                if (record == null || !PhoneOffers.live(record)) throw new IllegalStateException("Offer closed");
                String html = portableHtml(record);
                try (java.io.OutputStream out = getContentResolver().openOutputStream(data.getData(), "wt")) {
                    if (out == null) throw new java.io.IOException("Cannot open export");
                    out.write(html.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                }
                toast("Portable preview saved. Share the HTML file manually.");
            } catch (Exception error) { toast("Export failed: " + error.getMessage()); }
            return;
        }
        if (request == PICK_MOCKUP && result == RESULT_OK && data != null && data.getData() != null) {
            mockup = data.getData();
            imageStatus.setText("Mockup selected");
        }
    }

    private void create(android.view.View view) {
        JSONObject offer = draft();
        int hours = offer.optInt("hours", 0);
        for (String required : new String[]{"buyer", "project", "context", "placement", "scope", "pitch"}) {
            if (offer.optString(required).isEmpty()) {
                fields.get(required).requestFocus();
                toast("Complete the lead, project, brief, placement, usage and pitch.");
                return;
            }
        }
        String email = offer.optString("email");
        String source = offer.optString("source");
        if ((!email.isEmpty() && !PhoneHostSettings.validEmail(email)) ||
            (!source.isEmpty() && !PhoneHostSettings.validSource(source))) {
            toast("Check the buyer email and original brief URL.");
            return;
        }
        if (hours < 1 || hours > 2160 || mockup == null || !rights.isChecked()) {
            toast("Choose a mockup, confirm rights, and enter an expiry of 1–2160 hours.");
            return;
        }
        Uri selected = mockup;
        view.setEnabled(false);
        new Thread(() -> {
            try {
                byte[] preview = createPreview(selected);
                JSONObject saved = offers.create(offer, preview, hours);
                if ("file".equals(selected.getScheme())) {
                    Uri staged = StudioProof.uri(this, getIntent().getStringExtra(StudioProof.EXTRA));
                    if (selected.equals(staged)) new java.io.File(selected.getPath()).delete();
                }
                runOnUiThread(() -> {
                    if (isDestroyed()) return;
                    for (Map.Entry<String, EditText> field : fields.entrySet())
                        field.getValue().setText("hours".equals(field.getKey()) ? "24" : "");
                    mockup = null;
                    rights.setChecked(false);
                    imageStatus.setText("No mockup selected");
                    refreshInbox();
                    showOffer(saved);
                });
            } catch (Exception error) {
                runOnUiThread(() -> toast(error.getMessage()));
            } finally {
                runOnUiThread(() -> view.setEnabled(true));
            }
        }, "xxxink-mockup").start();
    }

    private byte[] createPreview(Uri uri) throws Exception {
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        try (InputStream input = getContentResolver().openInputStream(uri)) {
            BitmapFactory.decodeStream(input, null, options);
        }
        int longEdge = Math.max(options.outWidth, options.outHeight);
        if (Math.min(options.outWidth, options.outHeight) < 120 || longEdge > 12000 ||
            (long)options.outWidth * options.outHeight > 48000000L)
            throw new IllegalArgumentException("Use a readable image at least 120 × 120 and up to 48 megapixels.");
        int orientation = readOrientation(uri);
        options.inSampleSize = 1;
        while (longEdge / options.inSampleSize > 2200) options.inSampleSize *= 2;
        options.inJustDecodeBounds = false;
        Bitmap image;
        try (InputStream input = getContentResolver().openInputStream(uri)) {
            image = BitmapFactory.decodeStream(input, null, options);
        }
        if (image == null) throw new IllegalArgumentException("iMAG3 could not decode this image.");
        android.graphics.Matrix rotation = new android.graphics.Matrix();
        switch (orientation) {
            case 2: rotation.setScale(-1, 1); break;
            case 3: rotation.setRotate(180); break;
            case 4: rotation.setScale(1, -1); break;
            case 5: rotation.setRotate(90); rotation.postScale(-1, 1); break;
            case 6: rotation.setRotate(90); break;
            case 7: rotation.setRotate(270); rotation.postScale(-1, 1); break;
            case 8: rotation.setRotate(270); break;
            default: break;
        }
        if (!rotation.isIdentity()) {
            Bitmap upright = Bitmap.createBitmap(image, 0, 0, image.getWidth(), image.getHeight(), rotation, true);
            if (upright != image) image.recycle();
            image = upright;
        }
        double scale = Math.min(1d, 1100d / Math.max(image.getWidth(), image.getHeight()));
        int width = Math.max(1, (int)Math.round(image.getWidth() * scale));
        int height = Math.max(1, (int)Math.round(image.getHeight() * scale));
        Bitmap target = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(target);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        canvas.drawColor(Color.WHITE);
        canvas.drawBitmap(image, null, new android.graphics.Rect(0, 0, width, height), paint);
        image.recycle();
        float size = Math.max(12, Math.min(width / 10f, 38));
        paint.setColor(0xa9000000);
        canvas.drawRect(0, height / 2f - size, width, height / 2f + size, paint);
        paint.setColor(Color.WHITE);
        paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTextSize(size);
        canvas.drawText("PRIVATE PREVIEW", width / 2f, height / 2f - (paint.ascent() + paint.descent()) / 2, paint);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        boolean ok = target.compress(Bitmap.CompressFormat.JPEG, 84, bytes);
        target.recycle();
        if (!ok) throw new IllegalStateException("Could not create the preview.");
        return bytes.toByteArray();
    }

    private int readOrientation(Uri uri) {
        if (Build.VERSION.SDK_INT >= 24) {
            try (InputStream input = getContentResolver().openInputStream(uri)) {
                return new android.media.ExifInterface(input).getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, 1);
            } catch (Exception ignored) {}
        }
        return 1;
    }

    private void refreshInbox() {
        inbox.removeAllViews();
        try {
            java.util.List<JSONObject> records = offers.list();
            if (records.isEmpty()) text(inbox, "No offers yet.");
            for (JSONObject offer : records) {
                JSONObject request = offer.optJSONObject("request");
                String status = request != null ? " · Request received" : PhoneOffers.live(offer) ? " · Active" : " · Closed";
                button(inbox, offer.optString("project") + " · " + offer.optString("buyer") + status, view -> showOffer(offer));
            }
        } catch (Exception error) {
            text(inbox, "Could not read the inbox.");
        }
    }

    private void showOffer(JSONObject offer) {
        try {
            offer = offers.get(offer.optString("id"));
            if (offer == null) return;
            final JSONObject record = offer;
            JSONObject request = record.optJSONObject("request");
            StringBuilder text = new StringBuilder(record.optString("buyer")).append("\n");
            text.append(PhoneOffers.live(record) ? "Expires " + DateFormat.getDateTimeInstance().format(new Date(record.optLong("expires"))) : "Link closed");
            if (request != null) text.append("\n\nBuyer request\n").append(request.optString("name")).append("\n")
                .append(request.optString("email")).append("\n").append(request.optString("notes"))
                .append("\nReference ").append(request.optString("reference"));
            if (PhoneOffers.live(record)) text.append("\n\nPreview key\n").append(record.optString("key"));
            AlertDialog.Builder dialog = new AlertDialog.Builder(this).setTitle(record.optString("project"))
                .setMessage(text.toString()).setNeutralButton("Close", null);
            if (PhoneOffers.live(record)) {
                dialog.setPositiveButton("Share or copy pitch", (box, which) -> share(record));
                dialog.setNegativeButton("Revoke", (box, which) -> new AlertDialog.Builder(this)
                    .setMessage("Revoke this preview link?")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Revoke", (confirm, action) -> {
                        try { offers.revoke(record.optString("id")); refreshInbox(); toast("Preview revoked."); }
                        catch (Exception error) { toast("Could not revoke the preview."); }
                    }).show());
            }
            dialog.show();
        } catch (Exception error) { toast("Could not open the offer."); }
    }

    private void share(JSONObject offer) {
        if (!PhoneOffers.live(offer)) { toast("Preview is expired or revoked."); return; }
        new AlertDialog.Builder(this).setTitle("Ghost Host presentation mode")
            .setItems(new String[]{"Local Ghost — Wi-Fi / hotspot", "Remote Ghost — direct HTTPS or optional relay", "Portable Ghost — HTML file, no server"}, (dialog, which) -> {
                if (which == 2) { exportPortable(offer); return; }
                if (which == 0) {
                    java.util.List<String> addresses = PhoneHostService.localAddresses;
                    if (addresses.isEmpty() || addresses.get(0).contains("127.0.0.1")) { toast("Enable Wi-Fi / hotspot and start hosting first."); return; }
                    shareLink(offer, addresses.get(0), "Unencrypted local HTTP. Use only a trusted shared network. Test on the buyer device first.");
                } else {
                    String base = PhoneHostService.publicAddress;
                    if (base.isEmpty()) { toast("Configure a reachable HTTPS endpoint and start hosting first."); return; }
                    shareLink(offer, base, "Test this HTTPS endpoint from another network before sharing. A relay is optional; direct access needs network routing and TLS.");
                }
            }).show();
    }

    private void exportPortable(JSONObject offer) {
        new AlertDialog.Builder(this).setTitle("Portable Ghost")
            .setMessage("This watermarked HTML copy can be saved or forwarded by the buyer. Expiration, revocation and buyer inbox do not apply to exported files. Continue?")
            .setNegativeButton("Cancel", null).setPositiveButton("Export", (d,w) -> {
                exportId = offer.optString("id");
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("text/html")
                    .addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, "ghost-preview.html");
                startActivityForResult(intent, EXPORT_GHOST);
            }).show();
    }

    private String portableHtml(JSONObject offer) throws Exception {
        StringBuilder html = new StringBuilder("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='referrer' content='no-referrer'><title>Private preview</title><style>body{background:#151515;color:#eee;font:18px system-ui;max-width:900px;margin:auto;padding:24px}img{max-width:100%;height:auto}p{white-space:pre-wrap}</style></head><body><h1>Private licensing preview</h1>");
        for (String field : new String[]{"project", "context", "placement", "scope", "price"}) {
            html.append("<p>").append(android.text.TextUtils.htmlEncode(offer.optString(field))).append("</p>");
        }
        html.append("<img alt='Watermarked mockup' src='data:image/jpeg;base64,")
            .append(android.util.Base64.encodeToString(offers.proof(offer.optString("id")), android.util.Base64.NO_WRAP))
            .append("'><p>Preview only. No license is granted by this file. Contact the sender to discuss usage.</p></body></html>");
        return html.toString();
    }

    private void shareLink(JSONObject offer, String base, String warning) {
        String link = base + "/#key=" + offer.optString("key");
        String pitch = offer.optString("pitch");
        String preview = "Private licensing preview\n" + link + "\nPreview key: " + offer.optString("key");
        pitch = pitch.contains("[Relevant sample link]") ? pitch.replace("[Relevant sample link]", preview) : pitch + "\n\n" + preview;
        String shareText = pitch;
        String recipient = offer.optString("email");
        AlertDialog.Builder choices = new AlertDialog.Builder(this).setTitle("Share licensing offer")
            .setMessage(warning + "\n\n" + link)
            .setNeutralButton("Copy pitch", (dialog, which) -> {
                getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Licensing pitch", shareText));
                toast("Pitch copied.");
            })
            .setPositiveButton("Share pitch", (dialog, which) -> {
                Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, shareText);
                if (!recipient.isEmpty()) send.putExtra(Intent.EXTRA_EMAIL, new String[]{recipient});
                send.putExtra(Intent.EXTRA_SUBJECT, "Licensing preview — " + offer.optString("project"));
                startActivity(Intent.createChooser(send, "Share pitch"));
            });
        choices.show();
    }

    private void open(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception ignored) { toast("Could not open a browser."); }
    }

    private JSONObject draft() {
        JSONObject draft = new JSONObject();
        for (Map.Entry<String, EditText> field : fields.entrySet()) {
            try { draft.put(field.getKey(), field.getValue().getText().toString().trim()); }
            catch (Exception ignored) {}
        }
        return draft;
    }

    private void add(JSONObject draft, String name, String label, int limit, int type) {
        fields.put(name, input(label, draft.optString(name), limit, type));
    }

    private EditText input(String label, String value, int limit, int type) {
        TextView description = body(label);
        EditText edit = new EditText(this);
        edit.setId(android.view.View.generateViewId());
        description.setLabelFor(edit.getId());
        edit.setFilters(new InputFilter[]{new InputFilter.LengthFilter(limit)});
        edit.setInputType(type == -1 ? InputType.TYPE_CLASS_NUMBER : InputType.TYPE_CLASS_TEXT | type);
        edit.setText(value);
        if (type == InputType.TYPE_TEXT_FLAG_MULTI_LINE) edit.setMinLines(3);
        page.addView(edit, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return edit;
    }

    private CheckBox check(String label, boolean checked) {
        CheckBox check = new CheckBox(this);
        check.setText(label);
        check.setChecked(checked);
        page.addView(check);
        return check;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private TextView text(LinearLayout parent, String value) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(16);
        text.setPadding(0, dp(6), 0, dp(4));
        parent.addView(text);
        return text;
    }

    private TextView body(String value) { return text(page, value); }
    private void heading(String value) { TextView header = body(value); header.setTextSize(23); header.setTextColor(0xffc2f55b); }
    private void button(LinearLayout parent, String title, android.view.View.OnClickListener click) {
        Button button = new Button(this);
        button.setText(title);
        button.setOnClickListener(click);
        parent.addView(button, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
    }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
}
