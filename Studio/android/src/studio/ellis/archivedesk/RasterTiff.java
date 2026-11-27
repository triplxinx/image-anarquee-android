package studio.ellis.archivedesk;

import android.graphics.Bitmap;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

final class RasterTiff {
    // Baseline TIFF: one uncompressed chunky RGB strip, embedded sRGB ICC, top-left origin.
    static void write(Bitmap bitmap,int ppi,byte[] icc,OutputStream output) throws IOException {
        int w=bitmap.getWidth(), h=bitmap.getHeight();
        final int entries=15;
        final int bits=8+2+entries*12+4;
        final int xResolution=bits+6, yResolution=xResolution+8, profile=yResolution+8;
        final int pixels=(profile+icc.length+1)&~1;
        ByteBuffer directory=ByteBuffer.allocate(pixels).order(ByteOrder.LITTLE_ENDIAN);
        directory.put((byte)'I').put((byte)'I').putShort((short)42).putInt(8).putShort((short)entries);
        field(directory,256,4,1,w);
        field(directory,257,4,1,h);
        field(directory,258,3,3,bits);
        field(directory,259,3,1,1);
        field(directory,262,3,1,2);
        field(directory,273,4,1,pixels);
        field(directory,274,3,1,1);
        field(directory,277,3,1,3);
        field(directory,278,4,1,h);
        field(directory,279,4,1,w*h*3);
        field(directory,282,5,1,xResolution);
        field(directory,283,5,1,yResolution);
        field(directory,284,3,1,1);
        field(directory,296,3,1,2);
        field(directory,34675,7,icc.length,profile);
        directory.putInt(0).putShort((short)8).putShort((short)8).putShort((short)8);
        directory.putInt(ppi).putInt(1).putInt(ppi).putInt(1).put(icc);
        output.write(directory.array());
        int[] row=new int[w];byte[] colors=new byte[w*3];
        for(int y=0;y<h;y++){
            bitmap.getPixels(row,0,w,0,y,w,1);
            for(int x=0;x<w;x++){
                int color=row[x],k=x*3;
                colors[k]=(byte)(color>>16);colors[k+1]=(byte)(color>>8);colors[k+2]=(byte)color;
            }
            output.write(colors);
        }
    }

    private static void field(ByteBuffer data,int tag,int type,int count,int value){
        data.putShort((short)tag).putShort((short)type).putInt(count).putInt(value);
    }

    private RasterTiff(){}
}
