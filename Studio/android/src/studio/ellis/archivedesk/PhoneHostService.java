package studio.ellis.archivedesk;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class PhoneHostService extends Service {
    static final String STOP = "stop-phone-host";
    static final String LAN = "enable-lan";
    private static final String CHANNEL = "xxxink-host";
    static volatile String status = "Stopped";
    static volatile List<String> localAddresses = Collections.emptyList();
    static volatile String publicAddress = "";
    private PhoneSite server;
    private static PhoneOffers store;

    static synchronized PhoneOffers store(Context context) {
        if (store == null) store = new PhoneOffers(new File(context.getFilesDir(), "phone-license-offers"));
        return store;
    }

    private static List<String> availableLanAddresses() throws Exception {
        List<String> addresses = new ArrayList<>();
        for (NetworkInterface network : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (!network.isUp() || network.isLoopback()) continue;
            String name = network.getName();
            if (!name.startsWith("wlan") && !name.startsWith("eth") && !name.startsWith("ap") && !name.startsWith("swlan")) continue;
            for (InetAddress address : Collections.list(network.getInetAddresses())) {
                if (address instanceof Inet4Address && address.isSiteLocalAddress()) addresses.add(address.getHostAddress());
            }
        }
        return addresses;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        startForeground(8043, notice());
        closeServer();
        try {
            boolean lan = intent.getBooleanExtra(LAN, false);
            List<String> addresses = lan ? availableLanAddresses() : Collections.emptyList();
            if (lan && addresses.isEmpty()) throw new IllegalStateException("Connect to Wi-Fi or Ethernet before starting Wi-Fi mode.");
            String origin = getSharedPreferences(PhoneHostSettings.SETTINGS, MODE_PRIVATE)
                .getString(PhoneHostSettings.PUBLIC_ORIGIN, "");
            String secureHost = origin.isEmpty() ? "" : origin.substring("https://".length());
            List<String> hosts = new ArrayList<>();
            String bind = lan ? addresses.get(0) : "127.0.0.1";
            hosts.add(bind + ":" + PhoneSite.PORT);
            if (!secureHost.isEmpty()) hosts.add(secureHost);
            String style;
            try (InputStream input = getAssets().open("phone-site.css"); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] bytes = new byte[4096];
                int count;
                while ((count = input.read(bytes)) != -1) out.write(bytes, 0, count);
                style = new String(out.toByteArray(), StandardCharsets.UTF_8);
            }
            server = new PhoneSite(bind, PhoneSite.PORT, store(this),
                style, secureHost, hosts.toArray(new String[0]));
            server.start(5000, false);
            List<String> links = new ArrayList<>();
            links.add("http://" + bind + ":" + PhoneSite.PORT);
            localAddresses = Collections.unmodifiableList(links);
            publicAddress = origin;
            status = lan ? "Running on this phone and Wi-Fi" : "Running on this phone";
        } catch (Exception error) {
            closeServer();
            status = "Could not start. " + error.getMessage();
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private Notification notice() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL, "XXX!NK website host",
                NotificationManager.IMPORTANCE_LOW));
        }
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, PhoneHostActivity.class),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, PhoneHostService.class).setAction(STOP),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        return builder.setSmallIcon(studio.ellis.archivedesk.studio.R.drawable.archive_icon)
            .setContentTitle("XXX!NK website is running").setContentText("Buyer previews are served from this phone.")
            .setContentIntent(open).setOngoing(true).addAction(0, "Stop", stop).build();
    }

    private void closeServer() {
        if (server != null) {
            server.stop();
            server = null;
        }
        localAddresses = Collections.emptyList();
        publicAddress = "";
    }

    @Override public void onDestroy() {
        closeServer();
        if (!status.startsWith("Could not")) status = "Stopped";
        super.onDestroy();
    }
}
