package com.acid.camera;
import java.nio.*;
/** Pure decoding of Android DEPTH16 confidence and padded mono/luma planes. */
public final class SensorPixels {
 public static int millimeters(int packed){return packed&8191;}
 public static float confidence(int packed){int c=(packed>>>13)&7;return c==0?1f:(c-1)/7f;}
 public static int[] render(ByteBuffer source,int width,int height,int rowStride,int pixelStride,boolean depth,float near,float far,int palette){
  if(width<=0||height<=0||rowStride<=0||pixelStride<(depth?2:1)||far<=near)throw new IllegalArgumentException("Invalid plane geometry or range");
  ByteBuffer bytes=source.duplicate().order(ByteOrder.LITTLE_ENDIAN);int start=bytes.position();long last=(long)start+(long)(height-1)*rowStride+(long)(width-1)*pixelStride+(depth?2:1);if(last>bytes.limit())throw new IllegalArgumentException("Plane buffer shorter than stride geometry");int[] colors=new int[Math.multiplyExact(width,height)];
  for(int y=0;y<height;y++)for(int x=0;x<width;x++){int at=start+y*rowStride+x*pixelStride;float v;boolean valid=true;if(depth){int packed=bytes.getShort(at)&65535;int mm=millimeters(packed);valid=mm!=0&&confidence(packed)>=.3f;v=1-(mm/1000f-near)/(far-near);}else v=(bytes.get(at)&255)/255f;v=Math.max(0,Math.min(1,v));int c;if(!valid)c=0xff000000;else if(palette==1){int g=(int)(255*v);c=rgb(g,g,g);}else if(palette==2){int g=(int)((.5+.5*Math.cos(v*Math.PI*24))*255);c=rgb(g,(int)(g*v),255-g);}else{float hue=(1-v)*4;int sector=(int)Math.floor(hue);float part=hue-sector;int low=(int)(255*part),high=255-low;switch(sector){case 0:c=rgb(255,low,0);break;case 1:c=rgb(high,255,0);break;case 2:c=rgb(0,255,low);break;case 3:c=rgb(0,high,255);break;default:c=rgb(0,0,255);}}colors[y*width+x]=c;}
  return colors;
 }
 static int rgb(int r,int g,int b){return 0xff000000|(r<<16)|(g<<8)|b;}
}
