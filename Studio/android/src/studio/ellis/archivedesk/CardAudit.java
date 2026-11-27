package studio.ellis.archivedesk;

import android.graphics.Bitmap;
import android.graphics.RectF;
import java.util.Locale;

final class CardAudit {
    // Analysis coordinates match the on-screen inner guide.
    static final float LEFT = .16f, RIGHT = .84f, TOP = .17f, BOTTOM = .83f;

    static final class Reading {
        int red, green, blue, low, high, peakDarkTile, nearWhite, lightLeaks, sampleCount, frameCount;
        double light, contrast, flatness, detail, clipping, darkClipping, glare, borders, uniformity;
        final int[] blocks=new int[9];
        boolean sharp, aligned;
        boolean fast(boolean edge) {
            return light >= 43 && light <= 232 && clipping < .13 && darkClipping < .45
                && contrast >= 14 && sharp && (edge || aligned);
        }
        String strict() {
            if (light < 52 || light > 216) return "Review exposure";
            if (clipping > .015 || darkClipping > .04 || glare > .07) return "Review clipped tones or glare";
            if (!sharp || contrast < 24) return "Review detail and contrast";
            return "Image quality checks passed";
        }
        boolean paper() {
            return light >= 125 && light <= 241 && clipping < .025 && flatness < 11 && uniformity < 16
                && nearWhite * 100L <= sampleCount * 2L
                && Math.max(red, Math.max(green, blue)) - Math.min(red, Math.min(green, blue)) < 75;
        }
        boolean covered() {
            return Math.max(red, Math.max(green,blue))<=24 && peakDarkTile<=24
                && uniformity<=14 && high<=26 && flatness<=6 && lightLeaks * 200L <= frameCount;
        }
        boolean stable(Reading before) {
            if(before==null || Math.abs(light-before.light)>8 || Math.abs(detail-before.detail)>5)return false;
            int distance=0;
            for(int i=0;i<blocks.length;i++)distance+=Math.abs(blocks[i]-before.blocks[i]);
            return distance<45;
        }
        String hud() {
            return String.format(Locale.US, "R %03d   G %03d   B %03d   A 255\nLUMA %03.0f    SPAN %03.0f    DETAIL %04.1f\nCLIP %.1f%% / %.1f%%    FRAME %d/4",
                (int)red, (int)green, (int)blue, light, contrast, detail, darkClipping * 100, clipping * 100, (int)borders);
        }
    }

    static Reading scan(Bitmap b) { return scan(b,new RectF(LEFT,TOP,RIGHT,BOTTOM)); }

    static Reading scan(Bitmap b,RectF roi) {
        int w = b.getWidth(), h = b.getHeight();
        int[] pixels = new int[w * h], lum = new int[w * h], hist = new int[256];
        b.getPixels(pixels, 0, w, 0, 0, w, h);
        Reading a = new Reading();
        a.frameCount=lum.length;
        for (int i = 0; i < lum.length; i++) {
            int p=pixels[i], r=p>>16&255, g=p>>8&255, bl=p&255;
            lum[i]=(54*r+183*g+19*bl)>>8;
            if (r>34 || g>34 || bl>34) a.lightLeaks++;
        }
        int total = 0, red = 0, green = 0, blue = 0, sum = 0, clipped = 0, dark = 0, glare = 0;
        long square = 0;
        double detail = 0;
        int left=(int)((roi.left+roi.width()*.10f)*w), right=(int)((roi.right-roi.width()*.10f)*w);
        int top=(int)((roi.top+roi.height()*.10f)*h), bottom=(int)((roi.bottom-roi.height()*.10f)*h);
        for (int y=top; y<bottom; y++) {
            for (int x=left; x<right; x++) {
                int i = y*w+x, p = pixels[i], l = lum[i];
                int r = p >> 16 & 255, g = p >> 8 & 255, bl = p & 255;
                hist[l]++; total++; sum += l; square += l*l;
                red += r; green += g; blue += bl;
                if (l >= 250) clipped++;
                if (r>=250 || g>=250 || bl>=250) a.nearWhite++;
                if (l <= 6) dark++;
                if (l >= 239 && Math.max(r, Math.max(g, bl)) - Math.min(r, Math.min(g, bl)) < 10) glare++;
                detail += Math.abs(4*l-lum[i-1]-lum[i+1]-lum[i-w]-lum[i+w]);
            }
        }
        a.sampleCount=total;
        a.red = red / total; a.green = green / total; a.blue = blue / total;
        a.light = (double)sum / total;
        a.flatness = Math.sqrt(Math.max(0, (double)square / total - a.light*a.light));
        a.low = percentile(hist, total, .05); a.high = percentile(hist, total, .95);
        a.contrast = a.high - a.low;
        a.clipping = (double)clipped / total; a.darkClipping = (double)dark / total; a.glare = (double)glare / total;
        a.detail = detail / total;
        a.sharp = a.detail >= 4.0;
        int min=255,max=0;
        for(int row=0;row<3;row++) for(int col=0;col<3;col++) {
            int centerX=(int)(w*(.12+.38*col)),centerY=(int)(h*(.12+.38*row)), light=0;
            for(int j=-3;j<=3;j++) for(int i=-3;i<=3;i++) light+=lum[(centerY+j)*w+centerX+i];
            int value=light/49;min=Math.min(min,value);max=Math.max(max,value);
            centerX=left+(right-left)*(2*col+1)/6;centerY=top+(bottom-top)*(2*row+1)/6;light=0;
            for(int j=-3;j<=3;j++)for(int i=-3;i<=3;i++)light+=lum[(centerY+j)*w+centerX+i];
            a.blocks[row*3+col]=light/49;
        }
        a.uniformity=max-min;
        a.peakDarkTile=max;
        a.borders=(edge(lum,w,h,roi.left,roi.top,roi.bottom,true)?1:0)
            +(edge(lum,w,h,roi.right,roi.top,roi.bottom,true)?1:0)
            +(edge(lum,w,h,roi.top,roi.left,roi.right,false)?1:0)
            +(edge(lum,w,h,roi.bottom,roi.left,roi.right,false)?1:0);
        a.aligned = a.borders == 4;
        return a;
    }

    private static int percentile(int[] hist, int total, double target) {
        int count = 0;
        for (int i = 0; i < hist.length; i++) {
            count += hist[i];
            if (count >= total * target) return i;
        }
        return 255;
    }

    private static boolean edge(int[] lum, int w, int h, float at, float start, float end, boolean vertical) {
        int across = vertical ? w : h, along = vertical ? h : w;
        int found = 0, previous = -100, stable = 0;
        for (int j = 0; j < 13; j++) {
            int pos = (int)(along * (start+(end-start)*(.14+j*.06)));
            int best = 0, bestAt = 0;
            for (int k = Math.max(2,(int)(across*(at-.035))); k <= Math.min(across-3,across*(at+.035)); k++) {
                int index = vertical ? pos*w+k : k*w+pos, stride = vertical ? 1 : w;
                int delta = Math.abs(lum[index-stride*2]-lum[index+stride*2]);
                if (delta > best) { best = delta; bestAt = k; }
            }
            if (best >= 19) {
                found++;
                if (Math.abs(previous-bestAt) <= across * .026) stable++;
                previous = bestAt;
            }
        }
        return found >= 9 && stable >= 7;
    }

    private CardAudit() {}
}
