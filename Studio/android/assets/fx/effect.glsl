#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uImage;
uniform sampler2D uHistory;
uniform vec2 uSize;
uniform vec3 uP;
uniform float uMix,uTime,uDt,uHasHistory,uFlip;
const float PI=3.14159265;
vec3 src(vec2 p){return texture2D(uImage,clamp(p,vec2(0.0),vec2(1.0))).rgb;}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 hue(float h){return clamp(abs(fract(h+vec3(0.,.666667,.333333))*6.-3.)-1.,0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*4375.5453);}
vec2 aspect(vec2 p){return (p-.5)*vec2(uSize.x/uSize.y,1.);}
vec2 unAspect(vec2 p){return p/vec2(uSize.x/uSize.y,1.)+.5;}
vec3 blur(vec2 p,float radius){vec2 d=radius/uSize;return (src(p)*4.+src(p+d)*2.+src(p-d)*2.+src(p+vec2(d.x,-d.y))*2.+src(p+vec2(-d.x,d.y))*2.+src(p+vec2(d.x,0.))+src(p-vec2(d.x,0.))+src(p+vec2(0.,d.y))+src(p-vec2(0.,d.y)))/16.;}
float edge(vec2 p,float radius){vec2 d=vec2(radius)/uSize;float x=lum(src(p+vec2(d.x,0.)))-lum(src(p-vec2(d.x,0.)));float y=lum(src(p+vec2(0.,d.y)))-lum(src(p-vec2(0.,d.y)));return length(vec2(x,y));}
vec3 thermal(float y){return clamp(vec3(1.5-abs(4.*y-3.),1.5-abs(4.*y-2.),1.5-abs(4.*y-1.)),0.,1.);}
void main(){
 vec2 uv=v;if(uFlip>.5)uv.y=1.-uv.y;
 vec3 c=src(uv),o=c;float a=uP.x,b=uP.y,t=uTime*uP.z*2.;float y=lum(c);vec2 q=aspect(uv);float r=length(q),ang=atan(q.y,q.x);
#if FX == 1
 o=c*pow(2.,a*4.-2.);
#elif FX == 2
 float pivot=.2+b*.6;o=(c-pivot)*(.5+a*2.)+pivot;
#elif FX == 3
 o=mix(vec3(y),c,a*3.);
#elif FX == 4
 float angle=a*6.283185+t;vec3 axis=normalize(vec3(1.));o=c*cos(angle)+cross(axis,c)*sin(angle)+axis*dot(axis,c)*(1.-cos(angle));
#elif FX == 5
 o=c+vec3((a-.5)*.5,(b-.5)*.3,-(a-.5)*.5);
#elif FX == 6
 float g=dot(c,vec3(.15+a*.6,.75-a*.5,.1-a*.1));o=vec3((g-.5)*(.6+b*1.8)+.5);
#elif FX == 7
 o=vec3(dot(c,vec3(.393,.769,.189)),dot(c,vec3(.349,.686,.168)),dot(c,vec3(.272,.534,.131)));o=mix(vec3(y),o,.3+a*.7);
#elif FX == 8
 o=1.-c;
#elif FX == 9
 o=mix(c,1.-c,step(vec3(.05+a*.9),c));
#elif FX == 10
 float levels=2.+floor(a*14.);o=floor(c*(levels-1.)+.5)/(levels-1.);
#elif FX == 11
 o=mix(hue(a)*.18,hue(b)*.8+.2,y);
#elif FX == 12
 o=vec3(smoothstep(a-.005-b*.15,a+.005+b*.15,y));
#elif FX == 13
 float mask=1.-smoothstep(.05+b*.5,.7+b*.3,r);o=c*mix(1.,mask,a);
#elif FX == 14
 float noise=hash(floor(uv*uSize/(1.+b*5.))+floor(t*30.))-.5;o=c+noise*a*.5;
#elif FX == 15
 float cell=2.+a*50.;vec2 n=uSize/cell;o=src((floor(uv*n)+.5)/n);
#elif FX == 16
 float cell=3.+a*20.;vec2 coord=uv*uSize/cell;float l=lum(src((floor(coord)+.5)*cell/uSize));float ink=1.-smoothstep(sqrt(1.-l)*.66-.03,sqrt(1.-l)*.66+.03,length(fract(coord)-.5));o=vec3(1.-ink);
#elif FX == 17
 float line=.5+.5*sin(uv.y*uSize.y/(1.+b*4.)*PI);o=c*(1.-a*.7*line);
#elif FX == 18
 vec2 d=vec2(cos(b*PI*2.+t),sin(b*PI*2.+t))*a*.04;o=vec3(src(uv+d).r,c.g,src(uv-d).b);
#elif FX == 19
 float count=2.+floor(a*14.);float wedge=2.*PI/count;float angle=abs(mod(ang+b*PI+t,wedge)-wedge*.5);o=src(unAspect(vec2(cos(angle),sin(angle))*r));
#elif FX == 20
 vec2 p=uv*(1.+floor(a*5.));p=1.-abs(mod(p,2.)-1.);o=src(p);
#elif FX == 21
 float radius=.1+b*.8;float angle=ang+(a*2.-1.)*12.*pow(max(0.,1.-r/radius),2.)+sin(t)*a*.3;o=src(unAspect(vec2(cos(angle),sin(angle))*r));
#elif FX == 22
 vec2 d=normalize(q+vec2(.0001))*sin(r*(10.+b*100.)-t*4.)*a*.04;o=src(unAspect(q+d));
#elif FX == 23
 o=src(unAspect(q/(1.+a*3.*r*r)));
#elif FX == 24
 o=src(unAspect(q*(1.+a*3.*exp(-r*5.))));
#elif FX == 25
 o=src(fract(vec2(ang/(2.*PI)+.5+t*.05,-log(max(.02,r))*(.1+a*.6)+t*.05)));
#elif FX == 26
 vec2 d=vec2(sin(uv.y*(4.+b*30.)+t*2.+sin(uv.x*7.)),cos(uv.x*(5.+b*20.)-t+sin(uv.y*8.)));o=src(uv+d*a*.12);
#elif FX == 27
 float e=clamp(edge(uv,1.+a*3.)*(2.+a*12.),0.,1.);o=hue(b+t*.1+y*.3)*e;
#elif FX == 28
 float e=edge(uv,1.+b*3.);o=vec3(clamp(1.-e*(2.+a*12.),0.,1.));
#elif FX == 29
 vec2 d=vec2(1.+b*4.)/uSize;o=vec3(.5+(lum(src(uv+d))-lum(src(uv-d)))*(1.+a*8.));
#elif FX == 30
 o=c+(c-blur(uv,1.+b*3.))*a*4.;
#elif FX == 31
 o=blur(uv,1.+a*15.);
#elif FX == 32
 vec3 sum=c;for(int i=1;i<=8;i++){sum+=src(.5+(uv-.5)*(1.-float(i)*a*.015));}o=sum/9.;
#elif FX == 33
 vec3 glow=blur(uv,2.+a*18.);o=c+glow*smoothstep(b,1.,lum(glow))*1.5;
#elif FX == 34
 float mask=smoothstep(.01+a*.25,.12+a*.25,c.g-max(c.r,c.b));float chrome=.5+.5*sin(y*(8.+b*24.));o=mix(c,vec3(chrome*.8,chrome*.9,chrome),mask);
#elif FX == 35
 float mask=smoothstep(.01+a*.2,.15+a*.2,c.g-max(c.r,c.b));o=mix(vec3(c.b*.45,c.r*.65,c.g*.7),vec3(.9,.65+b*.3,.85),mask);
#elif FX == 36
 o=thermal(clamp((y-.5)*(.5+a*3.)+.5+(b-.5)*.5,0.,1.));
#elif FX == 37
 o=mix(hue(a),hue(b),y)*(.3+.7*y);
#elif FX == 38
 float levels=3.+floor(b*7.);o=floor(c*levels)/levels;o*=1.-smoothstep(.05,.1+a*.4,edge(uv,1.));
#elif FX == 39
 float freq=40.+a*180.;float l1=step(.15,abs(sin((uv.x+uv.y)*freq)));float l2=step(.15,abs(sin((uv.x-uv.y)*freq)));o=vec3(y>.7?1.:y>.4?l1:l1*l2);
#elif FX == 40
 float cell=3.+a*24.;vec2 grid=uv*uSize/cell;vec3 sampleColor=src((floor(grid)+.5)*cell/uSize);float dotMask=1.-smoothstep(.42,.49,length(fract(grid)-.5));o=mix(vec3(b),sampleColor,dotMask);
#elif FX == 41
 float cell=6.+a*18.;vec2 grid=uv*uSize/cell;float l=lum(src((floor(grid)+.5)*cell/uSize));vec2 p=fract(grid)-.5;float glyph=0.;if(l>.15)glyph=max(glyph,1.-smoothstep(.06,.1,length(p)));if(l>.35)glyph=max(glyph,1.-smoothstep(.04,.08,abs(p.y)));if(l>.55)glyph=max(glyph,1.-smoothstep(.04,.08,abs(p.x)));if(l>.75)glyph=max(glyph,1.-smoothstep(.04,.08,abs(abs(p.x)-abs(p.y))));o=mix(vec3(0.),hue(b),glyph);
#elif FX == 42
 float band=floor(uv.y*(10.+b*70.));float h=hash(vec2(band,floor(t*10.)));float offset=(h-.5)*a*.3*step(.65,h);o=src(vec2(fract(uv.x+offset),uv.y));
#elif FX == 43
 vec2 p=(uv-.5)*2.;vec2 bend=p*(1.+a*.15*dot(p,p));o=src(bend*.5+.5);o*=step(max(abs(bend.x),abs(bend.y)),1.);o*=.8+.2*sin(uv.y*uSize.y*PI);
#elif FX == 44 || FX == 45 || FX == 46
 float cell=5.+a*24.;vec2 grid=uv*uSize/cell;vec2 p=(fract(grid)-.5)*2.;float l=lum(src((floor(grid)+.5)*cell/uSize));float mask=0.;
 #if FX == 44
 float angle=atan(p.y,p.x);float radius=.4+.17*cos(angle*5.);mask=1.-smoothstep(radius-.05,radius+.05,length(p));
 #elif FX == 45
 p.y=-p.y+.15;float equation=pow(p.x*p.x+p.y*p.y-.5,3.)-p.x*p.x*p.y*p.y*p.y;mask=1.-smoothstep(-.02,.02,equation);
 #else
 mask=mod(floor(grid.x)+floor(grid.y),2.);
 #endif
 o=mix(vec3(b),vec3(l),mask);
#elif FX == 47
 float contours=.5+.5*cos(y*(5.+a*50.)*PI);o=hue(y+b+t*.1)*contours;
#elif FX == 48
 vec2 d=vec2(1.+a*6.)/uSize;vec3 n=normalize(vec3(lum(src(uv-vec2(d.x,0.)))-lum(src(uv+vec2(d.x,0.))),lum(src(uv-vec2(0.,d.y)))-lum(src(uv+vec2(0.,d.y))),.12));float light=max(0.,dot(n,normalize(vec3(cos(b*6.28+t),sin(b*6.28+t),1.))));o=c*(.2+light*1.5);
#elif FX == 49
 o=.5+.5*cos((1.-c)*vec3(5.,7.,9.)*(1.+a*3.)+vec3(0.,b*6.28,2.)+t);
#elif FX >= 50
 vec3 previous=texture2D(uHistory,uv).rgb;float persistence=pow(.25+a*.73,max(.25,uDt*30.));
 #if FX == 50
 float difference=length(c-previous);o=vec3(smoothstep(b*.3,b*.3+.03+a*.3,difference));
 #elif FX == 51
 previous=texture2D(uHistory,clamp(.5+(uv-.5)*(1.-b*.015),.001,.999)).rgb;o=mix(c,previous,persistence);
 #elif FX == 52
 o=max(c*smoothstep(b,b+.1,y),previous*persistence);
 #else
 float motion=smoothstep(b*.2,b*.2+.08,length(c-previous));o=max(c*.35,hue(t*.1+y)*motion);o=mix(o,previous,persistence);
 #endif
 if(uHasHistory<.5)o=c;
#endif
 gl_FragColor=vec4(clamp(mix(c,o,uMix),0.,1.),1.);
}
