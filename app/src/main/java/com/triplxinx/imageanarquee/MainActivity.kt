package com.triplxinx.imageanarquee
import android.app.*
import android.content.*
import android.os.Bundle
import android.widget.*
import android.net.Uri
import androidx.work.WorkManager

class MainActivity:Activity(){
 private lateinit var layout:LinearLayout
 private var help=false
 override fun onCreate(b:Bundle?){super.onCreate(b);route(intent)}
 override fun onNewIntent(i:Intent){super.onNewIntent(i);setIntent(i);route(i)}
 override fun onResume(){super.onResume();if(intent.getStringExtra("lead")==null)home()}
 private fun route(i:Intent){val id=i.getStringExtra("lead");if(id==null)home() else if(id.isEmpty())list() else desk(id)}
 private fun page(title:String){layout=LinearLayout(this).apply{orientation=1;setPadding(24,24,24,24)};setContentView(ScrollView(this).apply{addView(layout)});label(title);button(if(help)"Help (!)" else "Help (?)","Toggle contextual help"){help=!help;route(intent)}}
 private fun label(s:String){layout.addView(TextView(this).apply{text=s;textSize=19f;setPadding(0,12,0,12)})}
 private fun button(s:String,desc:String,action:()->Unit){layout.addView(Button(this).apply{text=s;setOnClickListener{if(help && !s.startsWith("Help"))AlertDialog.Builder(this@MainActivity).setMessage(desc).setPositiveButton("Close",null).show() else action()}})}
 private fun home(){page("iMAG3 Anarqeə! — Workbench");val a=Scout.leads(this);button("${a.length()} discovered leads","Open all discovered opportunities"){list()};button("0 independently verified leads","Open verified opportunities"){list(true)};button("Start / refresh Lead Scout","Schedule network scans every 30 minutes, subject to Android scheduling"){if(android.os.Build.VERSION.SDK_INT>=33)requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),1);Scout.prefs(this).edit().putBoolean("enabled",true).apply();Scout.schedule(this);Scout.notify(this,"Scheduled")};button("Pause scout","Cancel scheduled scouting"){Scout.prefs(this).edit().putBoolean("enabled",false).apply();WorkManager.getInstance(this).cancelUniqueWork("scout");WorkManager.getInstance(this).cancelUniqueWork("scout-now");getSystemService(NotificationManager::class.java).cancel(333)};for(n in listOf("Portfolio","Trading Card Scanner","Affiliate Flow","Ghost Host"))button(n,"Not yet integrated"){label("$n is not yet implemented in this repository.")}}
 private fun list(verified:Boolean=false){page("Lead Workdesk");button("Dashboard","Return to overview"){home()};val a=Scout.leads(this);for(i in a.length()-1 downTo 0){val l=a.getJSONObject(i);if(!verified||l.optBoolean("verified"))button(l.optString("name")+" — "+l.optString("description"),"Open lead and prepare draft"){desk(l.getString("id"))}}}
 private fun desk(id:String){val a=Scout.leads(this);val l=(0 until a.length()).map{a.getJSONObject(it)}.firstOrNull{it.optString("id")==id}?:return list();page(l.optString("name"));label(l.optString("description"));label("Source: "+l.optString("source")+" • independent verification pending");button("Open original listing","Review source in browser"){val u=Uri.parse(l.optString("url"));if(u.scheme=="https")startActivity(Intent(Intent.ACTION_VIEW,u))};val p=Scout.prefs(this);val k="pitch-"+id;val draft=p.getString(k,null)?:("Hello "+l.optString("name")+",\nI saw your listing for "+l.optString("description")+". I would like to discuss whether my design and visual asset services could support your project. May I share relevant samples and discuss your requirements?\n\nSource: "+l.optString("url")+"\n[Review fit, eligibility, samples and pricing before sending.]").also{p.edit().putString(k,it).apply()};val edit=EditText(this).apply{setText(draft);minLines=8};layout.addView(edit);button("Save pitch draft","Save edits locally; nothing is sent"){p.edit().putString(k,edit.text.toString()).apply();Toast.makeText(this,"Saved",Toast.LENGTH_SHORT).show()};button("All leads","Return to lead list"){list()}}
 override fun onRequestPermissionsResult(r:Int,p:Array<out String>,g:IntArray){super.onRequestPermissionsResult(r,p,g);if(r==1&&Scout.prefs(this).getBoolean("enabled",false))Scout.notify(this,"Scheduled")}
}
