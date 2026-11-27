package com.affiliateflow.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final int PAPER = Color.rgb(220, 222, 207);
    private static final int INK = Color.rgb(16, 19, 16);
    private static final int MUTED = Color.rgb(62, 86, 75);
    private static final int ACCENT = Color.rgb(13, 71, 48);
    private static final int WHITE = Color.WHITE;
    private static final int ERROR = Color.rgb(145, 38, 44);
    private static final int SAVE_CSV = 9;
    private static final String[] STAGES = {"research","applied","approved","publishing","paused","declined"};
    private static final String[] RELATIONSHIPS = {"joined","pending","suspended","rejected","notjoined"};

    // Keep refresh-token rotation serialized across activity recreation.
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private boolean helpMode;
    private SharedPreferences settings;
    private MobileClient client;
    private JSONObject directory;
    private JSONObject account = new JSONObject();
    private LinearLayout screen;
    private TextView status;
    private int generation;
    private String section;
    private String activeProgram = "";
    private String catalogFilter = "";
    private String pendingCsv;
    private boolean sessionReady;
    private boolean closingAccount;
    private boolean authenticating;
    private interface Task<T> { T run() throws Exception; }
    private interface Result<T> { void show(T value); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if (BuildConfig.PRIVATE_EDITION) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        settings = getPreferences(MODE_PRIVATE);
        helpMode=settings.getBoolean("context-help",false);
        String origin = BuildConfig.DEFAULT_ORIGIN.isEmpty() ? settings.getString("origin", "") : BuildConfig.DEFAULT_ORIGIN;
        String normalized = MobileClient.normalizeOrigin(origin);
        client = new MobileClient(getApplicationContext(), normalized == null ? "" : normalized);
        try { directory = new JSONObject(MobileClient.read(getAssets().open("catalog.json"))); }
        catch (Exception failed) { directory = new JSONObject(); }
        Uri opened = getIntent().getData();
        boolean paypalReturn = !BuildConfig.PRIVATE_EDITION && opened != null &&
            "affiliateflow-pro://checkout/return".equals(opened.toString());
        section = paypalReturn ? "Invoices" : state == null ?
            (BuildConfig.PRIVATE_EDITION ? "Desk" : "Programs") : state.getString("section", "Programs");
        catalogFilter = state == null ? "" : state.getString("filter", "");
        draw(section);
        restore();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putString("section", section);
        state.putString("filter", catalogFilter);
        super.onSaveInstanceState(state);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (!BuildConfig.PRIVATE_EDITION && intent.getData() != null &&
            "affiliateflow-pro://checkout/return".equals(intent.getData().toString())) {
            draw("Invoices");
        }
    }

    @Override public void onBackPressed() {
        String home = BuildConfig.PRIVATE_EDITION ? "Desk" : "Programs";
        if (!activeProgram.isEmpty() || !home.equals(section)) draw(home);
        else super.onBackPressed();
    }

    private void restore() {
        if (client.origin().isEmpty()) { sessionReady = true; return; }
        IO.execute(() -> {
            try {
                final JSONObject remote = client.restore() ? client.call("account", object()) : new JSONObject();
                runOnUiThread(() -> {
                    if (isDestroyed()) return;
                    sessionReady = true;
                    account = remote;
                    if (activeProgram.isEmpty()) draw(section);
                });
            } catch (Exception failed) {
                runOnUiThread(() -> {
                    if (isDestroyed()) return;
                    sessionReady = true;
                    say(message(failed), true);
                });
            }
        });
    }

    private <T> void run(Task<T> task, Result<T> done) {
        final int screenVersion = generation;
        say("Working…", false);
        IO.execute(() -> {
            try {
                T result = task.run();
                runOnUiThread(() -> {
                    if (isDestroyed() || generation != screenVersion) return;
                    say("", false);
                    done.show(result);
                });
            } catch (Exception failure) {
                runOnUiThread(() -> {
                    if (isDestroyed() || generation != screenVersion) return;
                    if (!client.signedIn() && failure instanceof MobileClient.ApiException &&
                        ((MobileClient.ApiException) failure).status == 401) {
                        account = new JSONObject();
                        draw("Account");
                    }
                    say(message(failure), true);
                });
            }
        });
    }

    private String message(Exception error) {
        if (error instanceof MobileClient.ApiException) return error.getMessage();
        return "Could not complete the request. Check your connection and try again.";
    }

    private void call(String action, JSONObject data, Result<JSONObject> callback) {
        run(() -> client.call(action, data), callback);
    }

    private void draw(String next) {
        section = next;
        activeProgram = "";
        frame(next);
        if ("Settings".equals(next)) { settingsView(); return; }
        if ("Account".equals(next)) { accountView(); return; }
        if (BuildConfig.PRIVATE_EDITION && !"owner".equals(account.optString("tier"))) {
            heading("Owner access");
            paragraph(sessionReady ? "Sign in with the approved owner account to open this desk." : "Checking your account…");
            button(screen, "Account", () -> draw("Account"));
            if (client.origin().isEmpty()) button(screen, "Connect your server", () -> draw("Settings"));
            return;
        }
        switch (next) {
            case "Programs": programs(); break;
            case "Networks": networks(); break;
            case "Pricing": pricing(); break;
            case "Invoices": invoices(0); break;
            case "Links": links(0); break;
            case "Progress": dashboard(); break;
            case "Desk": desk(); break;
            default: programs();
        }
    }

    private void frame(String title) {
        generation++;
        LinearLayout root = column();
        root.setBackgroundColor(PAPER);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets edges = insets.getInsets(WindowInsets.Type.systemBars() |
                    WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
            } else {
                view.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        TextView brand = label(BuildConfig.APP_LABEL, 23, INK, true);
        brand.setPadding(dp(20), dp(12), dp(16), dp(8));
        LinearLayout headingBar = new LinearLayout(this);
        headingBar.setBackgroundColor(INK);
        brand.setTextColor(Color.rgb(205, 255, 61));
        brand.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        headingBar.setGravity(Gravity.CENTER_VERTICAL);
        headingBar.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
        Button helpSwitch = new Button(this);
        helpSwitch.setMinHeight(dp(48));
        helpSwitch.setText(helpMode ? "(!)" : "(?)");
        helpSwitch.setContentDescription(helpMode ? "Turn help off" : "Turn help on");
        helpSwitch.setOnClickListener(v -> {
            helpMode=!helpMode;
            settings.edit().putBoolean("context-help",helpMode).apply();
            helpSwitch.setText(helpMode ? "(!)" : "(?)");
            helpSwitch.setContentDescription(helpMode ? "Turn help off" : "Turn help on");
            if(helpMode){
                ((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(v.getWindowToken(),0);
                v.requestFocus();
                toast("Tap a control to learn how to use it.");
            }
        });
        headingBar.addView(helpSwitch);
        root.addView(headingBar);
        HorizontalScrollView navigation = new HorizontalScrollView(this);
        navigation.setHorizontalScrollBarEnabled(false);
        LinearLayout navItems = new LinearLayout(this);
        navItems.setPadding(dp(12), 0, dp(12), dp(6));
        String[] routes = BuildConfig.PRIVATE_EDITION ?
            new String[] {"Desk", "Programs", "Progress", "Networks", "Links", "Account", "Settings"} :
            new String[] {"Programs", "Progress", "Networks", "Links", "Pricing", "Invoices", "Account", "Settings"};
        for (String item : routes) {
            Button tab = action(item, item.equals(title), () -> draw(item));
            LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(-2, dp(46));
            size.setMargins(dp(3), 0, dp(3), 0);
            navItems.addView(tab, size);
        }
        navigation.addView(navItems);
        root.addView(navigation);
        status = label("", 14, MUTED, false);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        status.setPadding(dp(20), dp(5), dp(20), dp(6));
        status.setVisibility(View.GONE);
        root.addView(status);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        screen = column();
        screen.setPadding(dp(18), dp(8), dp(18), dp(24));
        scroll.addView(screen);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        root.requestApplyInsets();
        View selected = null;
        for (int i = 0; i < routes.length; i++) if (routes[i].equals(title)) selected = navItems.getChildAt(i);
        if (selected != null) {
            final View current = selected;
            navigation.post(() -> navigation.scrollTo(Math.max(0, current.getLeft() - dp(55)), 0));
        }
    }

    private void settingsView() {
        heading("Server settings");
        paragraph("Account sync, guide access and purchases use the AffiliateFlow HTTPS API. The included directory works offline.");
        if (!BuildConfig.DEFAULT_ORIGIN.isEmpty()) {
            paragraph(client.origin());
            button(screen, "Check connection", () -> run(() -> client.catalog(), this::connected));
            return;
        }
        EditText endpoint = field("AffiliateFlow HTTPS origin", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        endpoint.setText(client.origin());
        screen.addView(endpoint);
        button(screen, "Connect", () -> {
            hideKeyboard();
            String origin = MobileClient.normalizeOrigin(text(endpoint));
            if (origin == null) { say("Enter an HTTPS origin without a path.", true); return; }
            boolean changed = !origin.equals(client.origin());
            run(() -> {
                JSONObject data = client.connect(origin);
                if (changed) settings.edit().putString("origin", origin)
                    .remove("pending-order").remove("pending-account").apply();
                return data;
            }, data -> {
                if (changed) account = new JSONObject();
                connected(data);
            });
        });
    }

    private void connected(JSONObject data) {
        directory = data;
        say("Connected to AffiliateFlow.", false);
        button(screen, "Open account", () -> draw("Account"));
    }

    private void accountView() {
        heading("Account");
        if (!sessionReady) { paragraph("Checking your session…"); return; }
        if (client.signedIn()) {
            paragraph(account.optString("email") + "  •  " + account.optString("tier", "Account connected"));
            paragraph("Free guides selected: " + array(account, "freePicks").length() + " of 3");
            button(screen, "Refresh account", () -> call("account", object(), data -> { account = data; draw("Account"); }));
            button(screen, "Sign out", () -> {
                if (closingAccount) return;
                closingAccount = true;
                say("Signing out…", false);
                IO.execute(() -> {
                    boolean revoked;
                    try { client.logout(); revoked = true; } catch (Exception error) { revoked = false; }
                    final boolean remote = revoked;
                    runOnUiThread(() -> {
                        if (isDestroyed()) return;
                        closingAccount = false;
                        account = new JSONObject();
                        settings.edit().remove("pending-order").remove("pending-account").apply();
                        draw("Account");
                        if (!remote) say("Signed out on this device. Server revocation could not be confirmed.", true);
                    });
                });
            });
            return;
        }
        if (client.origin().isEmpty()) {
            paragraph("Connect your AffiliateFlow server first.");
            button(screen, "Open settings", () -> draw("Settings"));
            return;
        }
        EditText email = field("Email address", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText password = field("Password", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        screen.addView(email);
        screen.addView(password);
        button(screen, "Sign in", () -> login("login", email, password));
        if (!BuildConfig.PRIVATE_EDITION) button(screen, "Create account", () -> login("register", email, password));
    }

    private void login(String action, EditText email, EditText password) {
        if (authenticating) return;
        String address = text(email);
        String pass = password.getText().toString();
        if (address.isEmpty() || pass.length() < 6) { say("Enter your email and password.", true); return; }
        hideKeyboard();
        authenticating = true;
        say("Contacting account service…", false);
        IO.execute(() -> {
            try {
                JSONObject response = client.login(action, object("email", address, "password", pass));
                boolean verify = response.optBoolean("verificationRequired");
                JSONObject profile = verify ? new JSONObject() : client.call("account", object());
                runOnUiThread(() -> {
                    if (isDestroyed()) return;
                    authenticating = false;
                    account = profile;
                    password.setText("");
                    draw(verify ? "Account" : BuildConfig.PRIVATE_EDITION ? "Desk" : "Account");
                    if (verify) say("Check your inbox to confirm your email, then sign in.", false);
                });
            } catch (Exception failure) {
                runOnUiThread(() -> {
                    if (isDestroyed()) return;
                    authenticating = false;
                    say(message(failure), true);
                });
            }
        });
    }

    private boolean requireAccount() {
        if (client.signedIn()) return true;
        paragraph(sessionReady ? "Sign in to use this feature." : "Checking your session…");
        button(screen, "Open account", () -> draw("Account"));
        return false;
    }

    private void programs() {
        heading("Affiliate programs");
        paragraph("Review eligibility and terms before choosing a setup guide.");
        EditText filter = field("Search programs or categories", InputType.TYPE_CLASS_TEXT);
        filter.setText(catalogFilter);
        screen.addView(filter);
        button(screen, "Refresh from server", () -> run(() -> client.catalog(), data -> { directory = data; draw("Programs"); }));
        LinearLayout listings = column();
        screen.addView(listings);
        Result<String> render = query -> {
            listings.removeAllViews();
            for (JSONObject program : list(directory, "programs")) {
                String searchable = program.optString("name") + " " + program.optString("category") + " " + program.optString("network");
                if (!searchable.toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT))) continue;
                LinearLayout row = card(listings, program.optString("name"));
                row.addView(label(program.optString("category") + "  •  " + program.optString("network"), 13, MUTED, false));
                button(row, "View terms and guide", () -> guide(program));
            }
            if (listings.getChildCount() == 0) listings.addView(label("No matching programs.", 15, MUTED, false));
        };
        render.show(catalogFilter);
        filter.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                catalogFilter = s.toString();
                render.show(catalogFilter.trim());
            }
            @Override public void afterTextChanged(Editable value) {}
        });
    }

    private void dashboard() {
        heading("Guide progress");
        if (!requireAccount()) return;
        call("account", object(), data -> {
            account = data;
            boolean any = false;
            for (JSONObject program : list(directory, "programs")) {
                String key = program.optString("id");
                JSONObject saved = progress(key);
                int steps = array(saved, "steps_done").length();
                boolean favorite = saved.optBoolean("favorite");
                if (!favorite && steps == 0 && !contains(array(account, "freePicks"), key) &&
                    !contains(array(account, "unlocked"), key)) continue;
                any = true;
                LinearLayout item = card(screen, program.optString("name"));
                item.addView(label(steps + " of " + program.optInt("stepCount") + " steps complete" +
                    (favorite ? " · Favorite" : ""), 14, MUTED, false));
                button(item, "Open guide", () -> guide(program));
            }
            if (!any) paragraph("Choose a guide or save a favorite to see it here.");
        });
    }

    private void networks() {
        heading("Affiliate networks");
        for (JSONObject item : list(directory, "networks")) {
            LinearLayout panel = card(screen, item.optString("name"));
            panel.addView(label(item.optString("note"), 15, MUTED, false));
            button(panel, "Open official portal", () -> openExternal(item.optString("url"), false));
        }
        button(screen, "FTC affiliate disclosure guidance", () -> openExternal(directory.optString("disclosure"), false));
    }

    private void guide(JSONObject program) {
        frame("Programs");
        activeProgram = program.optString("id");
        String key = activeProgram;
        button(screen, "Back to programs", () -> draw("Programs"));
        heading(program.optString("name"));
        paragraph(program.optString("eligibility"));
        LinearLayout rules = card(screen, "Program obligations");
        JSONArray restrictions = array(program, "restrictions");
        for (int i = 0; i < restrictions.length(); i++) rules.addView(label("• " + restrictions.optString(i), 15, INK, false));
        rules.addView(label("Disclose commissions near the recommendation and link.", 15, INK, false));
        button(rules, "Read official terms", () -> openExternal(program.optString("terms"), false));
        button(rules, "FTC disclosure rules", () -> openExternal(directory.optString("disclosure"), false));
        paragraph("Commission · " + program.optString("commission") + "\nAttribution · " + program.optString("cookie") +
            "\nPayout · " + program.optString("payout"));
        if (!requireAccount()) return;
        JSONObject progress = progress(key);
        boolean favorite = progress.optBoolean("favorite");
        button(screen, favorite ? "Remove favorite" : "Add favorite", () -> call("progress", object("programId", key, "favorite", !favorite),
            result -> refreshAccount(() -> guide(program))));
        if ("owner".equals(account.optString("tier"))) button(screen, "Track application", () -> editPipeline(key, program.optString("name")));
        if (hasGuideAccess(key)) button(screen, "Open setup checklist", () -> loadSteps(key, program));
        if (!BuildConfig.PRIVATE_EDITION && !hasGuideAccess(key)) {
            if (array(account, "freePicks").length() < 3) button(screen, "Use a free guide pick",
                () -> new AlertDialog.Builder(this).setTitle("Use a free pick?")
                    .setMessage("You can choose three free guides per account. Each selection is permanent.")
                    .setNegativeButton("Cancel", null).setPositiveButton("Claim", (dialog, which) ->
                        call("claim", object("programId", key), ignored -> refreshAccount(() -> guide(program)))).show());
            JSONObject product = directory.optJSONObject("products");
            JSONObject single = product == null ? null : product.optJSONObject("guide_unlock");
            int cents = single == null ? 0 : single.optInt("cents");
            if (cents > 0) button(screen, "Buy this guide · " + money(cents), () -> checkout("guide_unlock", key, program.optString("name")));
        }
    }

    private boolean hasGuideAccess(String key) {
        String tier = account.optString("tier", "lite");
        return !"lite".equals(tier) || contains(array(account, "freePicks"), key) || contains(array(account, "unlocked"), key);
    }

    private void loadSteps(String key, JSONObject program) {
        call("guide", object("programId", key), response -> {
            frame("Programs");
            activeProgram = key;
            button(screen, "Back to program terms", () -> guide(program));
            heading(program.optString("name") + " setup");
            Set<Integer> finished = new LinkedHashSet<>();
            JSONArray saved = array(progress(key), "steps_done");
            for (int i = 0; i < saved.length(); i++) finished.add(saved.optInt(i));
            int index = 0;
            for (JSONObject step : list(response, "steps")) {
                final int number = index++;
                LinearLayout panel = card(screen, step.optString("title"));
                CheckBox done = new CheckBox(this);
                done.setText("Complete step " + (number + 1));
                done.setTextColor(INK);
                done.setChecked(finished.contains(number));
                done.setOnCheckedChangeListener((view, checked) -> {
                    if (checked) finished.add(number); else finished.remove(number);
                });
                inspectField(done,done.getText().toString());
                panel.addView(done);
                panel.addView(label(step.optString("detail"), 15, INK, false));
                JSONArray actions = array(step, "actions");
                for (int i = 0; i < actions.length(); i++) panel.addView(label("• " + actions.optString(i), 14, MUTED, false));
                JSONObject resource = step.optJSONObject("resource");
                if (resource != null) button(panel, resource.optString("label"), () -> openExternal(resource.optString("url"), false));
            }
            button(screen, "Save checklist progress", () -> call("progress",
                object("programId", key, "steps", new JSONArray(finished)), result ->
                    refreshAccount(() -> say("Checklist saved.", false))));
        });
    }

    private void refreshAccount(Runnable next) {
        call("account", object(), profile -> { account = profile; next.run(); });
    }

    private JSONObject progress(String key) {
        for (JSONObject row : list(account, "progress")) if (key.equals(row.optString("program_id"))) return row;
        return new JSONObject();
    }

    private void pricing() {
        heading("Guide access");
        paragraph("Select three free guides, buy a single guide from its program screen, or open every guide with a pass.");
        JSONObject products = directory.optJSONObject("products");
        if (products != null) for (String sku : new String[] {"pro_monthly", "lifetime_onetime"}) {
            JSONObject product = products.optJSONObject(sku);
            if (product == null) continue;
            String name = product.optString("name");
            LinearLayout plan = card(screen, name);
            plan.addView(label(money(product.optInt("cents")) + " USD before WA sales tax", 18, INK, true));
            plan.addView(label("One payment. " + ("pro_monthly".equals(sku) ? "Access for 30 days." : "Lifetime guide access."), 15, MUTED, false));
            button(plan, "Continue", () -> { if (client.signedIn()) checkout(sku, "", name); else draw("Account"); });
        }
    }

    private void checkout(String sku, String key, String name) {
        frame("Pricing");
        heading(name);
        paragraph("Enter the Washington address where you will receive access.");
        EditText street = field("Street address", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_POSTAL_ADDRESS);
        EditText city = field("City", InputType.TYPE_CLASS_TEXT);
        EditText zip = field("ZIP code", InputType.TYPE_CLASS_TEXT);
        screen.addView(street);
        screen.addView(city);
        screen.addView(zip);
        final boolean[] pending = {false};
        button(screen, "Calculate tax and total", () -> {
            if (pending[0]) return;
            hideKeyboard();
            pending[0] = true;
            JSONObject order = object("sku", sku, "street", text(street), "city", text(city), "zip", text(zip));
            if (!key.isEmpty()) put(order, "programId", key);
            int version = generation;
            say("Checking address and tax…", false);
            IO.execute(() -> {
                try {
                    JSONObject quote = client.call("checkout", order);
                    runOnUiThread(() -> {
                        pending[0] = false;
                        if (!isDestroyed() && version == generation) quoteView(name, quote);
                    });
                } catch (Exception error) {
                    runOnUiThread(() -> {
                        pending[0] = false;
                        if (!isDestroyed() && version == generation) say(message(error), true);
                    });
                }
            });
        });
        button(screen, "Cancel", () -> draw("Pricing"));
    }

    private void quoteView(String name, JSONObject quote) {
        frame("Pricing");
        heading(name);
        int subtotal = quote.optInt("subtotal"), tax = quote.optInt("tax");
        paragraph("Subtotal  " + money(subtotal) + "\nWashington sales tax (" + quote.optString("location") + ")  " + money(tax));
        heading("Total  " + money(subtotal + tax) + " USD");
        paragraph("Approve the payment on PayPal. Return to Invoices to check its status.");
        button(screen, "Continue to PayPal", () -> {
            if (openExternal(quote.optString("approval"), true)) {
                settings.edit().putString("pending-order", quote.optString("order"))
                    .putString("pending-account", client.accountId()).apply();
                draw("Invoices");
            }
        });
        button(screen, "Cancel", () -> draw("Pricing"));
    }

    private void invoices(int page) {
        heading("Purchase invoices");
        if (!requireAccount()) return;
        String pending = settings.getString("pending-order", "");
        if (!pending.isEmpty() && client.accountId().equals(settings.getString("pending-account", ""))) {
            button(screen, "Check PayPal order", () -> call("settle", object("order", pending), result -> {
                settings.edit().remove("pending-order").remove("pending-account").apply();
                refreshAccount(() -> draw("Invoices"));
            }));
        }
        call("invoices", object("page", page), data -> {
            if (array(data, "invoices").length() == 0) paragraph("No completed purchases are available on this page.");
            for (JSONObject invoice : list(data, "invoices")) {
                LinearLayout item = card(screen, invoice.optString("product"));
                String content = invoiceText(invoice);
                item.addView(label(content, 14, INK, false));
                button(item, "Print or save PDF", () -> InvoicePrint.open(this, content));
            }
            if (page > 0) button(screen, "Previous invoices", () -> { frame("Invoices"); invoices(page - 1); });
            if (data.optBoolean("next")) button(screen, "More invoices", () -> { frame("Invoices"); invoices(page + 1); });
        });
    }

    private String invoiceText(JSONObject invoice) {
        int tax = invoice.optInt("tax"), subtotal = invoice.optInt("subtotal");
        return (invoice.optBoolean("reversed") ? "Reversed" : "Paid") +
            ("sandbox".equals(invoice.optString("environment")) ? " · PayPal Sandbox" : "") +
            "\nProduct: " + invoice.optString("product") + "\nSeller: " + invoice.optString("seller") +
            "\nBuyer: " + invoice.optString("email") + "\nInvoice: " + invoice.optString("id") +
            "\nDate: " + invoice.optString("date") + "\nPayPal capture: " + invoice.optString("capture") +
            "\nSubtotal: " + money(subtotal) + "\nWA sales tax (" + invoice.optString("location") + "): " + money(tax) +
            "\nTotal (USD): " + money(subtotal + tax);
    }

    private void links(int page) {
        heading("Affiliate links");
        if (!requireAccount()) return;
        paragraph("Save links issued by your affiliate providers and record confirmed USD commissions.");
        button(screen, "Save provider link", this::saveLink);
        call("analytics", object("page", page), response -> {
            if (array(response, "links").length() == 0) paragraph("No saved links on this page.");
            for (JSONObject link : list(response, "links")) {
                String id = link.optString("id"), url = link.optString("destination_url");
                LinearLayout item = card(screen, link.optString("label"));
                item.addView(label(programName(link.optString("program_id")) + " · " + count(link, "link_clicks") +
                    " historical clicks · " + count(link, "conversions") + " confirmed commissions", 14, MUTED, false));
                item.addView(label(url, 13, INK, false));
                button(item, "Use link in Image Anarquee", () -> {
                    Intent handoff = new Intent();
                    handoff.putExtra("campaign", object("program", link.optString("program_id"),
                        "url", url, "label", link.optString("label")).toString());
                    setResult(RESULT_OK, handoff);
                    finish();
                });
                button(item, "Copy affiliate link", () -> {
                    ClipboardManager clipboard = getSystemService(ClipboardManager.class);
                    clipboard.setPrimaryClip(ClipData.newPlainText("Affiliate link", url));
                    toast("Affiliate link copied");
                });
                button(item, "View or record commissions", () -> commissions(id, link.optString("label"), 0));
                button(item, "Delete saved link", () -> new AlertDialog.Builder(this).setTitle("Delete saved link?")
                    .setMessage("This also deletes its click and commission history in AffiliateFlow.")
                    .setNegativeButton("Keep", null).setPositiveButton("Delete", (dialog, which) ->
                        call("delete-link", object("linkId", id), ignored -> draw("Links"))).show());
            }
            if (page > 0) button(screen, "Previous links", () -> { frame("Links"); links(page - 1); });
            if (response.optBoolean("next")) button(screen, "More links", () -> { frame("Links"); links(page + 1); });
        });
    }

    private void saveLink() {
        frame("Links");
        heading("Save affiliate link");
        ArrayList<JSONObject> programs = list(directory, "programs");
        if (programs.isEmpty()) { paragraph("Refresh the program directory first."); return; }
        String[] names = new String[programs.size()];
        for (int i = 0; i < names.length; i++) names[i] = programs.get(i).optString("name");
        Spinner program = spinner(names);
        EditText placement = field("Placement name", InputType.TYPE_CLASS_TEXT);
        EditText url = field("Provider HTTPS link", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        screen.addView(program);
        screen.addView(placement);
        screen.addView(url);
        button(screen, "Save link", () -> {
            if (text(placement).isEmpty() || text(url).isEmpty()) { say("Enter a placement and link.", true); return; }
            hideKeyboard();
            call("save-link", object("programId", programs.get(program.getSelectedItemPosition()).optString("id"),
                "label", text(placement), "url", text(url)), data -> draw("Links"));
        });
    }

    private void commissions(String link, String title, int page) {
        frame("Links");
        heading(title + " commissions");
        EditText amount = field("Confirmed USD commission", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        screen.addView(amount);
        final String draftId = UUID.randomUUID().toString();
        button(screen, "Record amount", () -> {
            final int cents;
            try {
                cents = new BigDecimal(text(amount)).movePointRight(2).intValueExact();
                if (cents <= 0 || cents > 100000000) throw new ArithmeticException();
            } catch (Exception invalid) { say("Enter a positive USD amount with at most two decimal places.", true); return; }
            call("save-commission", object("linkId", link, "cents", cents, "idempotencyKey", draftId),
                ignored -> commissions(link, title, 0));
        });
        call("commissions", object("linkId", link, "page", page), data -> {
            if (array(data, "commissions").length() == 0) paragraph("No recorded commissions on this page.");
            for (JSONObject record : list(data, "commissions")) paragraph(money(record.optInt("amount_cents")) + " · " +
                record.optString("status") + " · " + record.optString("occurred_at"));
            if (page > 0) button(screen, "Previous entries", () -> commissions(link, title, page - 1));
            if (data.optBoolean("next")) button(screen, "More entries", () -> commissions(link, title, page + 1));
        });
    }

    private void desk() {
        heading("Private affiliate desk");
        paragraph("Track applications, check live Awin relationships, and review the research backlog.");
        button(screen, "Browse reviewed guides", () -> draw("Programs"));
        button(screen, "Application pipeline", this::pipeline);
        button(screen, "Discover on Awin", this::awin);
        button(screen, "Research backlog", this::backlog);
        button(screen, "Export Washington sales CSV", () -> run(this::ledgerCsv, csv -> {
            pendingCsv = csv;
            Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("text/csv")
                .addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, "affiliateflow-wa-sales.csv");
            startActivityForResult(save, SAVE_CSV);
        }));
    }

    private void pipeline() {
        frame("Desk");
        heading("Application pipeline");
        call("pipeline", object(), data -> {
            if (array(data, "records").length() == 0) paragraph("Choose Track application on a program to add it here.");
            for (JSONObject entry : list(data, "records")) {
                String key = entry.optString("program_id");
                LinearLayout item = card(screen, programName(key));
                item.addView(label(entry.optString("status"), 14, MUTED, false));
                button(item, "Edit application", () -> editPipeline(key, programName(key)));
            }
        });
    }

    private void editPipeline(String key, String name) {
        frame("Desk");
        heading(name);
        call("pipeline", object(), data -> {
            JSONObject existing = new JSONObject();
            for (JSONObject entry : list(data, "records")) if (key.equals(entry.optString("program_id"))) existing = entry;
            Spinner stage = spinner(STAGES);
            for (int i = 0; i < STAGES.length; i++) if (STAGES[i].equals(existing.optString("status"))) stage.setSelection(i);
            EditText notes = field("Application notes", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
            notes.setSingleLine(false);
            notes.setMinLines(3);
            notes.setText(existing.optString("notes"));
            screen.addView(stage);
            screen.addView(notes);
            button(screen, "Save application", () -> {
                if (notes.length() > 4000) { say("Use 4,000 characters or fewer.", true); return; }
                call("save-pipeline", object("programId", key, "status", STAGES[stage.getSelectedItemPosition()], "notes", text(notes)),
                    ignored -> pipeline());
            });
        });
    }

    private void awin() {
        frame("Desk");
        heading("Awin publisher programs");
        paragraph("Check the advertiser’s active agreement inside Awin for obligations, allowed channels and payout terms.");
        Spinner relationship = spinner(RELATIONSHIPS);
        screen.addView(relationship);
        LinearLayout results = column();
        button(screen, "Fetch programs", () -> call("awin", object("relationship", RELATIONSHIPS[relationship.getSelectedItemPosition()]), data -> {
            results.removeAllViews();
            if (array(data, "advertisers").length() == 0) results.addView(label("No matching programs.", 15, MUTED, false));
            for (JSONObject entry : list(data, "advertisers")) {
                String key = "awin-" + entry.optLong("id");
                LinearLayout item = card(results, entry.optString("name"));
                item.addView(label("Awin #" + entry.optLong("id") + " · " + entry.optString("status"), 14, MUTED, false));
                button(item, "Track application", () -> editPipeline(key, entry.optString("name")));
            }
        }));
        button(screen, "Open Awin", () -> openExternal("https://ui.awin.com/", false));
        screen.addView(results);
    }

    private void backlog() {
        frame("Desk");
        heading("Research backlog");
        paragraph("These listings need independent confirmation before applying or promoting.");
        call("backlog", object(), data -> {
            for (JSONObject item : list(data, "entries")) {
                LinearLayout candidate = card(screen, item.optString("name"));
                candidate.addView(label(item.optString("category") + " · Needs review", 14, MUTED, false));
                button(candidate, "Open research source", () -> openExternal(item.optString("reference"), false));
            }
        });
    }

    private String ledgerCsv() throws Exception {
        StringBuilder csv = new StringBuilder("invoice,paid_at,reversed_at,sku,subtotal_cents,sales_tax_cents,tax_rate,dor_location,paypal_capture\n");
        for (int page = 0; ; page++) {
            JSONObject data = client.call("ledger", object("page", page));
            for (JSONObject row : list(data, "sales")) {
                String[] fields = {"id", "captured_at", "revoked_at", "sku", "subtotal_cents", "tax_cents", "tax_rate", "tax_location", "provider_capture"};
                for (int i = 0; i < fields.length; i++) {
                    if (i > 0) csv.append(',');
                    csv.append('"').append(row.isNull(fields[i]) ? "" : row.optString(fields[i]).replace("\"", "\"\"")).append('"');
                }
                csv.append('\n');
            }
            if (!data.optBoolean("next")) return csv.toString();
        }
    }

    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != SAVE_CSV) return;
        String content = pendingCsv;
        pendingCsv = null;
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        if (content == null) { toast("Export expired. Run it again."); return; }
        run(() -> {
            try (OutputStream file = getContentResolver().openOutputStream(data.getData(), "wt")) {
                if (file == null) throw new IllegalStateException();
                file.write(content.getBytes(StandardCharsets.UTF_8));
            }
            return true;
        }, ignored -> say("Washington sales CSV saved.", false));
    }

    private boolean openExternal(String url, boolean paypal) {
        try {
            URI parsed = new URI(url).parseServerAuthority();
            String host = parsed.getHost();
            if (!"https".equalsIgnoreCase(parsed.getScheme()) || host == null || parsed.getRawUserInfo() != null ||
                (paypal && !("www.paypal.com".equals(host) || "www.sandbox.paypal.com".equals(host)))) {
                throw new IllegalArgumentException();
            }
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));
            return true;
        } catch (Exception invalid) {
            say("Unable to open this link. Check that a browser is available.", true);
            return false;
        }
    }

    private String programName(String id) {
        for (JSONObject program : list(directory, "programs")) if (id.equals(program.optString("id"))) return program.optString("name");
        return id;
    }

    private static boolean contains(JSONArray values, String value) {
        for (int i = 0; i < values.length(); i++) if (value.equals(values.optString(i))) return true;
        return false;
    }

    private static int count(JSONObject row, String key) {
        JSONArray array = array(row, key);
        JSONObject count = array.optJSONObject(0);
        return count == null ? 0 : count.optInt("count");
    }

    private static JSONObject object(Object... fields) {
        JSONObject result = new JSONObject();
        for (int i = 0; i < fields.length; i += 2) put(result, (String) fields[i], fields[i + 1]);
        return result;
    }

    private static void put(JSONObject object, String key, Object value) {
        try { object.put(key, value); }
        catch (JSONException badValue) { throw new IllegalArgumentException(badValue); }
    }

    private static JSONArray array(JSONObject data, String key) {
        JSONArray values = data.optJSONArray(key);
        return values == null ? new JSONArray() : values;
    }

    private static ArrayList<JSONObject> list(JSONObject data, String key) {
        ArrayList<JSONObject> result = new ArrayList<>();
        JSONArray values = array(data, key);
        for (int i = 0; i < values.length(); i++) {
            JSONObject item = values.optJSONObject(i);
            if (item != null) result.add(item);
        }
        return result;
    }

    private static String money(int cents) { return String.format(Locale.US, "$%.2f", cents / 100.0); }
    private static String text(EditText input) { return input.getText().toString().trim(); }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private LinearLayout column() { LinearLayout view = new LinearLayout(this); view.setOrientation(LinearLayout.VERTICAL); return view; }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_SHORT).show(); }

    private void hideKeyboard() {
        if (getCurrentFocus() != null) getSystemService(InputMethodManager.class)
            .hideSoftInputFromWindow(getCurrentFocus().getWindowToken(), 0);
    }

    private void say(String message, boolean error) {
        if (status == null) return;
        status.setVisibility(message.isEmpty() ? View.GONE : View.VISIBLE);
        status.setTextColor(error ? ERROR : MUTED);
        status.setText(message);
        if (error && !message.isEmpty()) toast(message);
    }

    private TextView label(String value, int size, int color, boolean strong) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        if (strong) text.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        text.setPadding(0, dp(4), 0, dp(4));
        text.setLineSpacing(dp(2), 1f);
        return text;
    }

    private void heading(String value) {
        TextView title = label(value, 27, INK, true);
        title.setAccessibilityHeading(true);
        screen.addView(title);
    }

    private void paragraph(String value) { screen.addView(label(value, 16, MUTED, false)); }

    private GradientDrawable background(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radius));
        return drawable;
    }

    private LinearLayout card(LinearLayout parent, String title) {
        LinearLayout panel = column();
        panel.setPadding(dp(15), dp(11), dp(15), dp(10));
        panel.setBackground(background(WHITE, 2));
        LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(-1, -2);
        size.setMargins(0, dp(7), 0, dp(5));
        parent.addView(panel, size);
        TextView name = label(title, 18, INK, true);
        name.setAccessibilityHeading(true);
        panel.addView(name);
        return panel;
    }

    private Button action(String title, boolean primary, Runnable click) {
        Button target = new Button(this);
        target.setText(title);
        target.setAllCaps(false);
        target.setTextColor(primary ? WHITE : ACCENT);
        target.setTextSize(14);
        target.setMinHeight(dp(48));
        target.setPadding(dp(12), dp(7), dp(12), dp(7));
        target.setGravity(Gravity.CENTER);
        target.setBackground(new android.graphics.drawable.RippleDrawable(
            ColorStateList.valueOf(Color.argb(40, 20, 65, 42)), background(primary ? ACCENT : Color.rgb(210, 249, 111), 2), null));
        target.setOnClickListener(view -> { if(helpMode) explain(title); else click.run(); });
        return target;
    }

    private void inspectField(View view,String name) {
        view.setOnTouchListener((v,event)->{
            if(!helpMode)return false;
            if(event.getActionMasked()==android.view.MotionEvent.ACTION_UP) explain(name);
            return true;
        });
        view.setOnKeyListener((v,key,event)->{
            if(!helpMode || key==android.view.KeyEvent.KEYCODE_TAB || key==android.view.KeyEvent.KEYCODE_BACK ||
               (key>=android.view.KeyEvent.KEYCODE_DPAD_UP && key<=android.view.KeyEvent.KEYCODE_DPAD_RIGHT)) return false;
            if(event.getAction()==android.view.KeyEvent.ACTION_UP)explain(name);
            return true;
        });
        view.setAccessibilityDelegate(new View.AccessibilityDelegate(){
            @Override public boolean performAccessibilityAction(View host,int action,Bundle args){
                if(helpMode && (action==16 || action==32 || action==2097152)){
                    explain(name);return true;
                }
                return super.performAccessibilityAction(host,action,args);
            }
        });
    }

    private void explain(String name){
        String key=name.toLowerCase(Locale.ROOT);
        String[] pages;
        if(key.contains("commission") || key.equals("record amount"))
            pages=new String[]{"Review earnings attached to the selected provider link.","Enter the confirmed USD amount from your provider record. Check the amount and save it once."};
        else if(key.equals("connect") || key.contains("server") || key.equals("check connection") || key.equals("settings"))
            pages=new String[]{"Set the address used to reach your AffiliateFlow account service.","Enter the HTTPS server origin in Settings, connect, then use Account to sign in."};
        else if(key.contains("use link in image"))
            pages=new String[]{"Use this provider-issued link in a campaign draft.","Choose its placement and write a recommendation in Image Anarquee.","Save the draft to Workdesk for review."};
        else if(key.contains("sign in") || key.equals("account"))
            pages=new String[]{"Access the account connected to this desk.","Enter your account email and password. Complete any verification requested by the server."};
        else if(key.contains("delete"))
            pages=new String[]{"Remove the selected record.","Review the confirmation and its effect on associated history before confirming."};
        else if(key.contains("application") || key.equals("desk"))
            pages=new String[]{"Track a merchant application and its progress.","Select the program, choose the current stage, add any notes, then save the application."};
        else if(key.contains("guide") || key.contains("checklist") || key.equals("progress"))
            pages=new String[]{"Review this program’s setup instructions and your progress.","Open the guide, complete the relevant steps, tick them off, and save progress."};
        else if(key.contains("save link") || key.contains("save provider link") || key.equals("links"))
            pages=new String[]{"Manage links issued by your approved programs.","Choose the program, enter the placement name, paste the provider link and save."};
        else if(key.contains("export") || key.contains("print or save"))
            pages=new String[]{"Prepare a copy of the selected records.","Choose a destination in the Android file or print dialog and confirm the export."};
        else if(key.contains("awin") || key.contains("fetch programs"))
            pages=new String[]{"Research merchants on Awin.","Choose a relationship filter and fetch programs. Open a matching program to review or track it."};
        else if(key.startsWith("complete step")) pages=new String[]{"Mark this setup task complete after performing the instruction on its card. Use Save checklist progress to keep the change."};
        else if(key.equals("programs")) pages=new String[]{"Browse available merchants. Select a program to read its eligibility and terms."};
        else if(key.equals("networks")) pages=new String[]{"Browse affiliate networks and open their official partner portals."};
        else if(key.startsWith("open ") || key.contains("rules") || key.contains("terms")) pages=new String[]{"Follow this control to review "+name+" for the selected program."};
        else pages=new String[]{"Use “"+name+"” on the "+section+" screen. Close this explanation and switch (!) off to use the control."};
        helpPage(name,pages,0);
    }

    private void helpPage(String title,String[] pages,int index){
        AlertDialog.Builder dialog=new AlertDialog.Builder(this)
            .setTitle(title+(pages.length>1?" ("+(index+1)+"/"+pages.length+")":""))
            .setMessage(pages[index]).setNegativeButton("Close help",null);
        if(index>0)dialog.setNeutralButton("Back",(d,w)->helpPage(title,pages,index-1));
        if(index+1<pages.length)dialog.setPositiveButton("Next",(d,w)->helpPage(title,pages,index+1));
        dialog.show();
    }

    private void button(LinearLayout parent, String title, Runnable click) {
        Button target = action(title, false, click);
        LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(-1, -2);
        size.setMargins(0, dp(5), 0, dp(5));
        parent.addView(target, size);
    }

    private EditText field(String hint, int inputType) {
        EditText field = new EditText(this);
        field.setInputType(inputType);
        field.setSingleLine(true);
        field.setHint(hint);
        field.setTextColor(INK);
        field.setHintTextColor(MUTED);
        field.setTextSize(16);
        field.setMinHeight(dp(50));
        field.setSelectAllOnFocus(false);
        inspectField(field,hint);
        return field;
    }

    private Spinner spinner(String[] values) {
        Spinner spinner = new Spinner(this, Spinner.MODE_DROPDOWN);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, values);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setMinimumHeight(dp(48));
        inspectField(spinner,"Choose "+("Links".equals(section)?"a program":"Desk".equals(section)?"a filter or application stage":"an option"));
        return spinner;
    }
}
