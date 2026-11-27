package studio.ellis.archivedesk;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.os.*;
import android.net.Uri;
import org.json.*;

public final class BackgroundScout extends JobService {
    static final int JOB=333, NOTICE=334;
    static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("background-scout",0);}
    static void configure(Context c, boolean enabled){
        prefs(c).edit().putBoolean("enabled",enabled).apply();
        JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(!enabled){scheduler.cancel(JOB);((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NOTICE);return;}
        scheduler.schedule(new JobInfo.Builder(JOB,new ComponentName(c,BackgroundScout.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(30*60*1000L).setPersisted(true).build());
    }
    private volatile Thread worker;
    @Override public boolean onStartJob(JobParameters p){
        worker=new Thread(()->{boolean retry=false;try{
            JSONObject result=new JSONObject(PublicLeadScout.fetch());
            if(Thread.currentThread().isInterrupted()||!prefs(this).getBoolean("enabled",false))return;
            if(result.optInt("checked")>0){prefs(this).edit().putString("result",result.toString()).apply();publish(result.optJSONArray("leads"));}else retry=true;
        }catch(Exception e){retry=true;}finally{if(!Thread.currentThread().isInterrupted())jobFinished(p,retry);}},"background-scout");worker.start();return true;
    }
    @Override public boolean onStopJob(JobParameters p){if(worker!=null)worker.interrupt();return true;}
    private PendingIntent target(String source,int code){Intent i=new Intent(this,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("scoutSource",source).setData(Uri.parse("ia-next://scout/"+code));return PendingIntent.getActivity(this,code,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private void publish(JSONArray rows){
        if(rows==null)return;
        NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel("scout","Lead scouting",NotificationManager.IMPORTANCE_LOW));
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,"scout"):new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_search).setContentTitle("I.A · "+rows.length()+" sourced listings").setContentText("Open Workdesk to review opportunities").setContentIntent(target("",0)).setOngoing(true).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE);
        Notification.InboxStyle style=new Notification.InboxStyle();
        for(int n=0;n<Math.min(3,rows.length());n++){JSONObject row=rows.optJSONObject(n);if(row==null)continue;style.addLine(row.optString("name")+" · "+row.optString("category"));b.addAction(android.R.drawable.ic_menu_view,"Open "+(n+1),target(row.optString("url"),n+1));}
        b.setStyle(style);try{nm.notify(NOTICE,b.build());}catch(SecurityException ignored){}
    }
}
