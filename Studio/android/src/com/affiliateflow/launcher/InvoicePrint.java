package com.affiliateflow.launcher;

import android.app.Activity;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.print.pdf.PrintedPdfDocument;
import java.io.FileOutputStream;

final class InvoicePrint {
    private InvoicePrint() {}

    static void open(Activity activity, String invoice) {
        PrintManager printer = activity.getSystemService(PrintManager.class);
        printer.print("AffiliateFlow invoice", new PrintDocumentAdapter() {
            private PrintAttributes attributes;

            @Override public void onLayout(PrintAttributes before, PrintAttributes after, CancellationSignal cancel,
                    LayoutResultCallback callback, Bundle extras) {
                if (cancel.isCanceled()) { callback.onLayoutCancelled(); return; }
                attributes = after;
                callback.onLayoutFinished(new PrintDocumentInfo.Builder("affiliateflow-invoice.pdf")
                    .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).setPageCount(1).build(), !after.equals(before));
            }

            @Override public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancel,
                    WriteResultCallback callback) {
                if (cancel.isCanceled()) { callback.onWriteCancelled(); return; }
                boolean selected = false;
                for (PageRange range : pages) if (range.getStart() == 0) selected = true;
                if (!selected) { callback.onWriteFinished(new PageRange[0]); return; }
                PrintedPdfDocument document = new PrintedPdfDocument(activity, attributes);
                try (FileOutputStream stream = new FileOutputStream(destination.getFileDescriptor())) {
                    android.graphics.pdf.PdfDocument.Page page = document.startPage(0);
                    android.graphics.Canvas canvas = page.getCanvas();
                    android.graphics.Rect bounds = page.getInfo().getContentRect();
                    Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
                    paint.setTextSize(18);
                    paint.setTypeface(Typeface.DEFAULT_BOLD);
                    float x = bounds.left + 20;
                    float y = bounds.top + 32;
                    canvas.drawText("AffiliateFlow purchase invoice", x, y, paint);
                    paint.setTypeface(Typeface.DEFAULT);
                    paint.setTextSize(11);
                    y += 12;
                    for (String line : invoice.split("\n")) {
                        int at = 0;
                        while (at < line.length()) {
                            int length = paint.breakText(line, at, line.length(), true, bounds.width() - 40, null);
                            if (length <= 0) break;
                            y += 18;
                            canvas.drawText(line, at, at + length, x, y, paint);
                            at += length;
                        }
                    }
                    document.finishPage(page);
                    if (cancel.isCanceled()) { callback.onWriteCancelled(); return; }
                    document.writeTo(stream);
                    callback.onWriteFinished(new PageRange[] { new PageRange(0, 0) });
                } catch (Exception error) {
                    callback.onWriteFailed("Invoice PDF could not be created.");
                } finally {
                    document.close();
                }
            }
        }, null);
    }
}
