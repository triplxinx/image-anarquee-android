package com.triplxinx.imageanarquee
import android.app.*
import android.content.*
import android.net.Uri
import android.widget.RemoteViews
import androidx.work.*
import org.json.*
import java.net.URL
import java.util.concurrent.TimeUnit

object Scout {
 fun prefs(c:Context)=c.getSharedPreferences("scout",0)
 fun leads(c:Context)=JSONArray(prefs(c).getString("leads","[]"))
 fun schedule(c:Context) {
 val constraints=Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).setRequiresBatteryNotLow(true).build()
 val periodic=PeriodicWorkRequestBuilder<ScoutWorker>(30,TimeUnit.MINUTES).setConstraints(constraints).build()
 WorkManager.getInstance(c).enqueueUniquePeriodicWork("scout",ExistingPeriodicWorkPolicy.KEEP,periodic)
 WorkManager.getInstance(c).enqueueUniqueWork("scout-now",ExistingWorkPolicy.KEEP,OneTimeWorkRequestBuilder<ScoutWorker>().setConstraints(constraints).build())
 }
 fun intent(c:Context,id:String=""):PendingIntent {
 val i=Intent(c,MainActivity::class.java).setData(Uri.parse("ia://leads/"+Uri.encode(id))).putExtra("lead",id).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
 return PendingIntent.getActivity(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
 }
 fun notify(c:Context,status:String) {
 val nm=c.getSystemService(NotificationManager::class.java)
 nm.createNotificationChannel(NotificationChannel("scout","Lead Scout",NotificationManager.IMPORTANCE_LOW))
 val a=leads(c)
 val views=RemoteViews(c.packageName,R.layout.scout_expanded)
 views.setTextViewText(R.id.summary,"${a.length()} opportunities • "+status)
 views.setOnClickPendingIntent(R.id.summary,intent(c))
 val ids=intArrayOf(R.id.lead1,R.id.lead2,R.id.lead3)
 for(j in ids.indices) {
 val k=a.length()-1-j
 views.setViewVisibility(ids[j],if(k>=0) android.view.View.VISIBLE else android.view.View.GONE)
 if(k>=0){val l=a.getJSONObject(k);views.setTextViewText(ids[j],l.optString("name")+" — "+l.optString("description").take(85));views.setOnClickPendingIntent(ids[j],intent(c,l.getString("id")))}
 }
 val n=Notification.Builder(c,"scout").setSmallIcon(android.R.drawable.ic_menu_search).setContentTitle("I.A Lead Scout").setContentText("${a.length()} opportunities • "+status).setContentIntent(intent(c)).setCustomBigContentView(views).setStyle(Notification.DecoratedCustomViewStyle()).setOngoing(true).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE).build()
 if(android.os.Build.VERSION.SDK_INT<33 || c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)==android.content.pm.PackageManager.PERMISSION_GRANTED) nm.notify(333,n)
 }
}
class ScoutWorker(c:Context,p:WorkerParameters):Worker(c,p) {
 override fun doWork():Result {
 val c=applicationContext
 if(!Scout.prefs(c).getBoolean("enabled",false))return Result.success()
 return try {
 // Public paid remote job listings; source listing is not proof of buyer intent for other services.
 val conn=URL("https://remotive.com/api/remote-jobs?category=design&limit=30").openConnection()
 conn.connectTimeout=15000;conn.readTimeout=15000
 val data=conn.getInputStream().bufferedReader().use{JSONObject(it.readText())}.getJSONArray("jobs")
 val saved=Scout.leads(c);val seen=(0 until saved.length()).map{saved.getJSONObject(it).getString("id")}.toMutableSet()
 for(i in 0 until data.length()){
 val j=data.getJSONObject(i);val id="remotive-"+j.getLong("id")
 if(seen.add(id))saved.put(JSONObject().put("id",id).put("name",j.optString("company_name")).put("description",j.optString("title")).put("url",j.optString("url")).put("source","Remotive public listing").put("verified",false))
 }
 if(!Scout.prefs(c).getBoolean("enabled",false))return Result.success()
 Scout.prefs(c).edit().putString("leads",saved.toString()).apply()
 Scout.notify(c,"Scan complete");Result.success()
 }catch(e:Exception){Scout.notify(c,"Source unavailable; retry scheduled");Result.retry()}
 }
}
