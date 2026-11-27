package studio.ellis.archivedesk;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.util.UUID;
import java.util.regex.Pattern;

final class CardFiles {
    private static final Pattern NAME = Pattern.compile("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\\.(jpg|png|webp|heic|gif|bin)");
    static final int MAX_BYTES = 48 * 1024 * 1024;

    static File root(Context c) {
        File folder = new File(c.getFilesDir(), "card-originals");
        folder.mkdirs();
        return folder;
    }

    static File resolve(Context c, String name) {
        return name != null && NAME.matcher(name).matches() ? new File(root(c), name) : null;
    }

    static String save(Context c, InputStream in, String ext) throws IOException {
        String name = UUID.randomUUID() + "." + ext;
        File path = resolve(c, name);
        if (path == null) throw new IOException("Unsupported extension");
        AtomicFile file = new AtomicFile(path);
        FileOutputStream out = file.startWrite();
        try {
            byte[] buffer = new byte[65536];
            int total = 0, count;
            while ((count = in.read(buffer)) != -1) {
                total += count;
                if (total > MAX_BYTES) throw new IOException("Image exceeds 48 MB");
                out.write(buffer, 0, count);
            }
            if (total == 0) throw new IOException("Image is empty");
            file.finishWrite(out);
            return name;
        } catch (IOException | RuntimeException ex) {
            file.failWrite(out);
            throw ex;
        }
    }

    static String mime(String name) {
        String ext = name.substring(name.lastIndexOf('.') + 1);
        return "jpg".equals(ext) ? "image/jpeg" : "bin".equals(ext) ? "application/octet-stream" : "image/" + ext;
    }

    static String extension(String mime) {
        if ("image/jpeg".equals(mime)) return "jpg";
        if ("image/png".equals(mime)) return "png";
        if ("image/webp".equals(mime)) return "webp";
        if ("image/heic".equals(mime) || "image/heif".equals(mime)) return "heic";
        if ("image/gif".equals(mime)) return "gif";
        return "bin";
    }
}
