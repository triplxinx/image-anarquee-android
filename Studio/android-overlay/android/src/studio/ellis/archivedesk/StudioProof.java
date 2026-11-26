package studio.ellis.archivedesk;

import android.content.Context;
import android.net.Uri;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

final class StudioProof {
    static final String EXTRA = "authoring-studio-proof";
    private static final long TTL = 24 * 60 * 60 * 1000L;

    private StudioProof() {}

    static String stage(Context context, String encoded) throws IOException {
        if (encoded == null || encoded.length() > 2_000_000) throw new IOException("Invalid proof size");
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        if (bytes.length < 4 || (bytes[0] & 255) != 255 || (bytes[1] & 255) != 216) {
            throw new IOException("Expected a JPEG proof");
        }
        File dir = context.getCacheDir();
        File[] old = dir.listFiles((folder, name) -> valid(name));
        long cutoff = System.currentTimeMillis() - TTL;
        if (old != null) for (File file : old) if (file.lastModified() < cutoff) file.delete();
        File target = File.createTempFile("studio-proof-", ".jpg", dir);
        boolean saved = false;
        try {
            try (FileOutputStream output = new FileOutputStream(target)) { output.write(bytes); }
            saved = true;
            return target.getName();
        } finally {
            if (!saved) target.delete();
        }
    }

    static Uri uri(Context context, String name) {
        if (!valid(name)) return null;
        File file = new File(context.getCacheDir(), name);
        return file.isFile() ? Uri.fromFile(file) : null;
    }

    private static boolean valid(String name) {
        return name != null && name.matches("studio-proof-[0-9]+\\.jpg");
    }
}
