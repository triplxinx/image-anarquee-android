package com.acid.camera;
public final class Maths {
 public static double logValue(double low,double high,int progress){return low*Math.pow(high/low,progress/1000.0);}
 public static int logProgress(double low,double high,double value){return high<=low?0:(int)Math.round(1000*Math.log(Math.max(low,Math.min(high,value))/low)/Math.log(high/low));}
 public static int clamp(int x,int low,int high){return Math.max(low,Math.min(high,x));}
 public static String family(String manufacturer,String model){String m=manufacturer.toLowerCase(),v=model.toLowerCase();
 if(m.contains("samsung"))return v.startsWith("sm-s")?"Samsung Galaxy S":v.startsWith("sm-a")?"Samsung Galaxy A":v.startsWith("sm-f")?"Samsung Galaxy Z":"Samsung generic";
 if(m.contains("oneplus"))return "OnePlus / OxygenOS";
 if(m.contains("motorola"))return "Motorola / Moto + Edge";
 if(m.contains("huawei"))return "Huawei / EMUI";
 if(m.contains("google"))return "Google Pixel";
 return "Universal Camera2";}
}
