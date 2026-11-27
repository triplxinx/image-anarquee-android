package studio.ellis.archivedesk;

import android.os.Process;
import android.util.Log;

final class CapturePriority implements AutoCloseable {
    private final int tid = Process.myTid();
    private final int original = Process.getThreadPriority(tid);

    CapturePriority() {
        try { Process.setThreadPriority(tid, Process.THREAD_PRIORITY_DISPLAY); }
        catch (SecurityException ignored) { /* The device can enforce the default. */ }
    }

    @Override public void close() {
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                if (Process.getThreadPriority(tid) != original) Process.setThreadPriority(tid, original);
                if (Process.getThreadPriority(tid) != original) throw new IllegalStateException("Worker priority was not restored");
            } catch (RuntimeException e) {
                if (attempt == 2) {
                    Log.e("CardCamera", "Ending worker after priority restore failure", e);
                    throw e;
                }
            }
        }
    }
}
