package com.triplxinx.imageanarquee
import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.Button
import android.widget.TextView
class MainActivity: Activity() {
 private var helpMode=false
 override fun onCreate(savedInstanceState:Bundle?) { super.onCreate(savedInstanceState)
 val layout=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(32,32,32,32) }
 layout.addView(TextView(this).apply { text="iMAG3 Anarqeə! — Workbench"; textSize=23f })
 val help=Button(this); help.text="Help (?)"; help.setOnClickListener { helpMode=!helpMode; help.text=if(helpMode) "Help (!)" else "Help (?)" }; layout.addView(help)
 val modules=linkedMapOf("Portfolio" to "Rights-aware asset ingestion is planned.", "Lead Research" to "Verified public buyer leads are planned.", "Pitch Workbench" to "Draft proposals for review before sending.", "Trading Card Scanner" to "Camera calibration and capture are planned.", "Affiliate Flow" to "Program obligations and disclosures are planned.")
 modules.forEach { (name,description)-> layout.addView(Button(this).apply { text=name; setOnClickListener { AlertDialog.Builder(this@MainActivity).setTitle(name).setMessage(if(helpMode) description else "$name is not yet implemented.").setPositiveButton("Close",null).show() } }) }
 setContentView(layout) }
}
