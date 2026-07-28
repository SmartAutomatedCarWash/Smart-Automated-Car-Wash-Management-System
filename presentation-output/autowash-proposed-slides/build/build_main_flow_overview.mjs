import fs from "node:fs/promises";
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/main-flow-overview/output.pptx";
const PREVIEW = "E:/SU26/SWP391/presentation-output/main-flow-overview/tmp/preview.png";
const INSPECT = "E:/SU26/SWP391/presentation-output/main-flow-overview/output.pptx.inspect.ndjson";
const W = 1280, H = 720;
const C = {
  bg:"#F3F6FA", white:"#FFFFFF", ink:"#101828", muted:"#667085", line:"#344054", border:"#D0D5DD",
  orange:"#F45B13", orangeLight:"#FFF3EC", cyan:"#08BFD3", cyanLight:"#EAFBFD",
  blue:"#2563EB", blueLight:"#EFF6FF", purple:"#8613B8", purpleLight:"#F7EDFB",
  green:"#16A34A", greenLight:"#ECFDF3"
};

const deck = Presentation.create({slideSize:{width:W,height:H}});
deck.theme.colorScheme = {name:"Aura Overview",themeColors:{accent1:C.orange,accent2:C.cyan,bg1:C.white,bg2:C.bg,tx1:C.ink,tx2:C.muted}};
const records=[];

function shape(slide,geometry,position,fill,line={width:0,fill}) {
  return slide.shapes.add({geometry,position,fill,line});
}
function text(slide,value,position,opts={},role="body") {
  const s=shape(slide,"rect",position,{color:C.white,transparency:100000},{width:0,fill:C.white});
  s.text=value; s.text.typeface=opts.typeface??"Poppins"; s.text.fontSize=opts.fontSize??12;
  s.text.bold=Boolean(opts.bold); s.text.color=opts.color??C.ink; s.text.alignment=opts.alignment??"center";
  s.text.verticalAlignment=opts.verticalAlignment??"middle"; s.text.insets=opts.insets??{left:3,right:3,top:2,bottom:2};
  s.text.autoFit="shrinkText"; records.push({kind:"textbox",role,text:value,bbox:position}); return s;
}
function card(slide,x,y,w,h,fill,stroke,radius=6000,width=1.2) {
  return slide.shapes.add({geometry:"roundRect",position:{left:x,top:y,width:w,height:h},fill,line:{style:"solid",fill:stroke,width},adjustmentList:[{name:"adj",formula:`val ${radius}`} ]});
}
function arrowRight(slide,x1,x2,y,color=C.line) {
  shape(slide,"rightArrow",{left:x1,top:y-5,width:x2-x1,height:10},color,{width:0,fill:color});
}
function arrowLeft(slide,x1,x2,y,color=C.line) {
  shape(slide,"leftArrow",{left:x1,top:y-5,width:x2-x1,height:10},color,{width:0,fill:color});
}
function arrowDown(slide,x,y1,y2,color=C.line) {
  shape(slide,"downArrow",{left:x-6,top:y1,width:12,height:y2-y1},color,{width:0,fill:color});
}
function node(slide,{x,y,num,icon,label,color,fill}) {
  shape(slide,"ellipse",{left:x,top:y,width:86,height:86},fill,{style:"solid",fill:color,width:2});
  text(slide,icon,{left:x+9,top:y+10,width:68,height:58},{fontSize:35,typeface:"Segoe UI Emoji"},"icon");
  shape(slide,"ellipse",{left:x-7,top:y-8,width:28,height:28},color,{width:0,fill:color});
  text(slide,String(num),{left:x-4,top:y-5,width:22,height:22},{fontSize:10,bold:true,color:C.white},"step-number");
  text(slide,label,{left:x-42,top:y+93,width:170,height:42},{fontSize:11.2,bold:true},"step-label");
  return {x,y,w:86,h:86};
}
function arrowCaption(slide,value,x,y,w) {
  text(slide,value,{left:x,top:y,width:w,height:30},{fontSize:9.5,bold:true,color:C.muted},"arrow-label");
}

const s=deck.slides.add();
s.background.fill=C.bg;
shape(s,"rect",{left:0,top:0,width:W,height:H},C.bg,{width:0,fill:C.bg});
shape(s,"rect",{left:48,top:30,width:1184,height:660},C.white,{style:"solid",fill:C.border,width:1});
shape(s,"rect",{left:48,top:30,width:8,height:660},C.orange,{width:0,fill:C.orange});
text(s,"6. Flows",{left:82,top:55,width:135,height:42},{fontSize:28,bold:true,alignment:"left",color:C.ink},"section-title");
shape(s,"rect",{left:220,top:62,width:3,height:28},C.orange,{width:0,fill:C.orange});
text(s,"Main Car Wash Service Journey",{left:238,top:55,width:700,height:42},{fontSize:27,bold:true,alignment:"left",color:C.orange},"title");
text(s,"A simple overview of the complete customer experience and the operations that support it.",{left:84,top:101,width:900,height:24},{fontSize:11.5,color:C.muted,alignment:"left"},"subtitle");

const topY=180, bottomY=400;
const topX=[100,365,630,895], bottomX=[895,630,365,100];
const n1=node(s,{x:topX[0],y:topY,num:1,icon:"⌕",label:"Explore Services",color:C.cyan,fill:C.cyanLight});
const n2=node(s,{x:topX[1],y:topY,num:2,icon:"🚗",label:"Select a Vehicle",color:C.blue,fill:C.blueLight});
const n3=node(s,{x:topX[2],y:topY,num:3,icon:"📅",label:"Choose a Schedule",color:C.purple,fill:C.purpleLight});
const n4=node(s,{x:topX[3],y:topY,num:4,icon:"💳",label:"Confirm Booking & Payment",color:C.orange,fill:C.orangeLight});
arrowRight(s,n1.x+n1.w,n2.x,topY+43); arrowCaption(s,"Choose a wash service",190,184,170);
arrowRight(s,n2.x+n2.w,n3.x,topY+43); arrowCaption(s,"Use a saved vehicle",455,184,170);
arrowRight(s,n3.x+n3.w,n4.x,topY+43); arrowCaption(s,"Select an available slot",720,184,175);

const n5=node(s,{x:bottomX[0],y:bottomY,num:5,icon:"✓",label:"Assign Staff & Check-in",color:C.blue,fill:C.blueLight});
const n6=node(s,{x:bottomX[1],y:bottomY,num:6,icon:"💧",label:"Wash & Track Progress",color:C.cyan,fill:C.cyanLight});
const n7=node(s,{x:bottomX[2],y:bottomY,num:7,icon:"★",label:"Complete & Earn Points",color:C.green,fill:C.greenLight});
const n8=node(s,{x:bottomX[3],y:bottomY,num:8,icon:"✦",label:"Review & View History",color:C.purple,fill:C.purpleLight});
arrowDown(s,n4.x+n4.w/2,n4.y+n4.h,n5.y); arrowCaption(s,"Booking confirmed",1000,315,150);
arrowLeft(s,n6.x+n6.w,n5.x,bottomY+43); arrowCaption(s,"Vehicle enters service",720,404,170);
arrowLeft(s,n7.x+n7.w,n6.x,bottomY+43); arrowCaption(s,"Follow each wash stage",455,404,170);
arrowLeft(s,n8.x+n8.w,n7.x,bottomY+43); arrowCaption(s,"Receive loyalty benefits",190,404,170);

card(s,80,586,1120,74,C.bg,C.border,5000,1);
text(s,"MANAGEMENT SUPPORT",{left:96,top:595,width:180,height:20},{fontSize:9,bold:true,color:C.orange,alignment:"left"},"support-label");
const supports=[
  {x:290,icon:"⚙",title:"Services & Promotions"},
  {x:545,icon:"◷",title:"Bookings & Staff"},
  {x:800,icon:"▥",title:"Reports & Feedback"}
];
supports.forEach((item,i)=>{
  const colors=[[C.orange,C.orangeLight],[C.cyan,C.cyanLight],[C.green,C.greenLight]][i];
  shape(s,"ellipse",{left:item.x,top:601,width:38,height:38},colors[1],{style:"solid",fill:colors[0],width:1});
  text(s,item.icon,{left:item.x+5,top:605,width:28,height:28},{fontSize:17,bold:true,color:colors[0]},"support-icon");
  text(s,item.title,{left:item.x+48,top:599,width:180,height:24},{fontSize:10.5,bold:true,alignment:"left"},"support-title");
  text(s,i===0?"Maintain the customer offer":i===1?"Coordinate daily operations":"Monitor performance and quality",{left:item.x+48,top:622,width:205,height:22},{fontSize:8.5,color:C.muted,alignment:"left"},"support-copy");
});

await fs.mkdir("E:/SU26/SWP391/presentation-output/main-flow-overview/tmp",{recursive:true});
const rendered=await deck.export({slide:s,format:"png",scale:1});
if(typeof rendered.save==="function") await rendered.save(PREVIEW); else if(typeof rendered.arrayBuffer==="function") await fs.writeFile(PREVIEW,Buffer.from(await rendered.arrayBuffer())); else await fs.writeFile(PREVIEW,Buffer.from(rendered));
await fs.writeFile(INSPECT,records.map(r=>JSON.stringify(r)).join("\n")+"\n","utf8");
const pptx=await PresentationFile.exportPptx(deck); await pptx.save(OUT); console.log(OUT);
