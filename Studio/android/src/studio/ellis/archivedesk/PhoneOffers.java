package studio.ellis.archivedesk;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class PhoneOffers {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final File directory;

    PhoneOffers(File directory) {
        this.directory = directory;
    }

    static String random(int byteCount) {
        byte[] bytes = new byte[byteCount];
        RANDOM.nextBytes(bytes);
        char[] digits = "0123456789abcdef".toCharArray();
        char[] encoded = new char[bytes.length * 2];
        for (int index = 0; index < bytes.length; index++) {
            encoded[index * 2] = digits[(bytes[index] >>> 4) & 15];
            encoded[index * 2 + 1] = digits[bytes[index] & 15];
        }
        return new String(encoded);
    }

    private File folder(String id) {
        if (!id.matches("[0-9a-f]{24}")) throw new IllegalArgumentException("Invalid offer ID.");
        return new File(directory, id);
    }

    private static byte[] read(File file) throws IOException {
        try (FileInputStream in = new FileInputStream(file); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            return out.toByteArray();
        }
    }

    private static void write(File destination, byte[] bytes) throws IOException {
        File staged = File.createTempFile("staged-", ".tmp", destination.getParentFile());
        try {
            try (FileOutputStream out = new FileOutputStream(staged)) {
                out.write(bytes);
                out.getFD().sync();
            }
            if (!staged.renameTo(destination)) throw new IOException("Could not save offer.");
        } finally {
            if (staged.exists()) staged.delete();
        }
    }

    synchronized JSONObject create(JSONObject offer, byte[] preview, int hours) throws IOException, JSONException {
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Could not initialize private offers.");
        String id = random(12);
        File folder = folder(id);
        if (!folder.mkdir()) throw new IOException("Could not create offer.");
        long now = System.currentTimeMillis();
        offer.put("id", id).put("key", id + "." + random(16)).put("created", now)
            .put("expires", now + hours * 3600000L).put("revoked", false);
        write(new File(folder, "proof.jpg"), preview);
        save(offer);
        return offer;
    }

    private void save(JSONObject offer) throws IOException {
        write(new File(folder(offer.optString("id")), "offer.json"),
            offer.toString().getBytes(StandardCharsets.UTF_8));
    }

    synchronized JSONObject get(String id) throws IOException, JSONException {
        if (!id.matches("[0-9a-f]{24}")) return null;
        File file = new File(folder(id), "offer.json");
        return file.isFile() ? new JSONObject(new String(read(file), StandardCharsets.UTF_8)) : null;
    }

    synchronized List<JSONObject> list() throws IOException, JSONException {
        List<JSONObject> offers = new ArrayList<>();
        String[] entries = directory.list();
        if (entries == null) return offers;
        for (String id : entries) {
            JSONObject offer = get(id);
            if (offer != null) offers.add(offer);
        }
        Collections.sort(offers, (a, b) -> Long.compare(b.optLong("created"), a.optLong("created")));
        return offers;
    }

    static boolean live(JSONObject offer) {
        return offer != null && !offer.optBoolean("revoked") && offer.optLong("expires") > System.currentTimeMillis();
    }

    synchronized String unlock(String key) throws IOException, JSONException {
        if (!key.matches("[0-9a-f]{24}\\.[0-9a-f]{32}")) return null;
        String id = key.substring(0, 24);
        JSONObject offer = get(id);
        if (!live(offer)) return null;
        return MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),
            offer.optString("key").getBytes(StandardCharsets.UTF_8)) ? id : null;
    }

    synchronized boolean request(String id, String name, String email, String notes) throws IOException, JSONException {
        JSONObject offer = get(id);
        if (!live(offer) || offer.has("request")) return false;
        offer.put("request", new JSONObject().put("name", name).put("email", email).put("notes", notes)
            .put("reference", random(8)).put("received", System.currentTimeMillis()));
        save(offer);
        return true;
    }

    synchronized byte[] proof(String id) throws IOException, JSONException {
        if (!live(get(id))) return null;
        return read(new File(folder(id), "proof.jpg"));
    }

    synchronized void revoke(String id) throws IOException, JSONException {
        JSONObject offer = get(id);
        if (offer == null) throw new IOException("Offer unavailable.");
        offer.put("revoked", true);
        save(offer);
    }
}
