package com.acid.camera;
import android.hardware.camera2.*;import android.hardware.camera2.params.*;import android.graphics.*;import android.util.*;import java.util.*;
class Lens {
 final String parent,physical,key; final CameraCharacteristics c; final ArrayList<Size> sizes=new ArrayList<>();
 Lens(String id,String physical,CameraCharacteristics c){this.parent=id;this.physical=physical;this.key=id+(physical==null?"":"/"+physical);this.c=c;
 StreamConfigurationMap map=c.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
 if(map!=null){Size[] normal=map.getOutputSizes(ImageFormat.JPEG);if(normal!=null)Collections.addAll(sizes,normal);Size[] high=map.getHighResolutionOutputSizes(ImageFormat.JPEG);if(high!=null)for(Size s:high)if(!sizes.contains(s))sizes.add(s);}
 sizes.sort((a,b)->Long.compare((long)b.getWidth()*b.getHeight(),(long)a.getWidth()*a.getHeight()));}
 boolean cap(int capability){int[] a=c.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES);if(a!=null)for(int x:a)if(x==capability)return true;return false;}
 boolean flash(){return Boolean.TRUE.equals(c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE));}
 String label(){Integer facing=c.get(CameraCharacteristics.LENS_FACING);float[] f=c.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);return (facing!=null&&facing==0?"FRONT":"REAR")+" "+(f!=null&&f.length>0?String.format(Locale.US,"%.1fmm",f[0]):"")+" · "+key;}
 boolean has(CaptureRequest.Key<?> k){return c.getAvailableCaptureRequestKeys().contains(k);}
 Range<Float> zoom(){Range<Float> r=android.os.Build.VERSION.SDK_INT>=30?c.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE):null;if(r!=null&&physical==null)return r;Float z=c.get(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM);return new Range<>(1f,z==null?1f:Math.max(1f,z));}
}
