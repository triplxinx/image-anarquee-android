package com.acid.camera;
import android.content.*;import android.graphics.*;import android.os.*;import android.view.*;import java.util.concurrent.atomic.AtomicBoolean;
class FxView extends TextureView implements TextureView.SurfaceTextureListener {
 volatile FxState state=new FxState();volatile String error;volatile float milliseconds;volatile int outputWidth,outputHeight;int quality=480;boolean autoQuality=true;private Session session;
 class Session {final HandlerThread thread=new HandlerThread("ACID GPU");Handler handler;ShaderEngine engine;volatile boolean ready=false,closed=false;final AtomicBoolean busy=new AtomicBoolean();volatile int width,height;SurfaceTexture surface;}
 FxView(Context c){super(c);setOpaque(true);setSurfaceTextureListener(this);}
 public void onSurfaceTextureAvailable(SurfaceTexture surface,int w,int h){error=null;Session s=new Session();s.surface=surface;s.width=w;s.height=h;s.thread.start();s.handler=new Handler(s.thread.getLooper());session=s;s.handler.post(()->{try{s.engine=new ShaderEngine(getContext(),surface);s.ready=true;}catch(Exception e){error=e.getMessage();}});}
 public void onSurfaceTextureSizeChanged(SurfaceTexture surface,int w,int h){Session s=session;if(s!=null){s.width=w;s.height=h;}}
 public boolean onSurfaceTextureDestroyed(SurfaceTexture surface){Session s=session;session=null;if(s!=null){s.closed=true;s.handler.post(()->{if(s.engine!=null)s.engine.release();surface.release();s.thread.quitSafely();});}else surface.release();return false;}
 public void onSurfaceTextureUpdated(SurfaceTexture s){}
 String diagnostic(){Session s=session;return "GPU: "+(s!=null&&s.ready?s.engine.renderer:"not initialized")+"; preview="+outputWidth+"x"+outputHeight+"; renderMs="+milliseconds+"; error="+error;}
 boolean ready(){Session s=session;return s!=null&&s.ready&&!s.closed&&!s.busy.get()&&error==null;}
 void submit(Bitmap bitmap){Session s=session;if(s==null||!s.ready||s.closed||!s.busy.compareAndSet(false,true)){bitmap.recycle();return;}FxState snapshot=state.copy();s.handler.post(()->{long start=System.nanoTime();try{if(!s.closed){int tex=s.engine.render(bitmap,snapshot);s.engine.show(tex,s.width,s.height);outputWidth=bitmap.getWidth();outputHeight=bitmap.getHeight();milliseconds=(System.nanoTime()-start)/1e6f;}}catch(Exception|OutOfMemoryError e){error="GPU effects stopped: "+e.getMessage();}finally{bitmap.recycle();s.busy.set(false);}});}
 void resetHistory(){Session s=session;if(s!=null&&s.ready)s.handler.post(()->s.engine.resetHistory());}
 static Bitmap processPhoto(Context c,Bitmap bitmap,FxState state)throws Exception{ShaderEngine engine=null;try{engine=new ShaderEngine(c,null);return engine.read(engine.render(bitmap,state));}finally{if(engine!=null)engine.release();}}
}
