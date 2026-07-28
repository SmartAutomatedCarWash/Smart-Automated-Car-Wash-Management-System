import fs from "node:fs/promises";
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT="E:/SU26/SWP391/presentation-output/thank-you-slide/output.pptx";
const PREVIEW="E:/SU26/SWP391/presentation-output/thank-you-slide/tmp/preview.png";
const INSPECT="E:/SU26/SWP391/presentation-output/thank-you-slide/output.pptx.inspect.ndjson";
const HERO="E:/SU26/SWP391/presentation-output/thank-you-slide/tmp/car-wash-hero.png";
const W=1280,H=720;
const C={bg:"#F2F4F7",white:"#FFFFFF",navy:"#061A49",navy2:"#0B2B63",cyan:"#5EDFF2",cyan2:"#18BFD3",ink:"#101828",muted:"#667085",line:"#D0D5DD"};
const deck=Presentation.create({slideSize:{width:W,height:H}});
deck.theme.colorScheme={name:"Aura Thank You",themeColors:{accent1:C.cyan2,accent2:C.navy,bg1:C.white,bg2:C.bg,tx1:C.ink,tx2:C.muted}};
const records=[];

function shape(slide,geometry,position,fill,line={width:0,fill}){return slide.shapes.add({geometry,position,fill,line});}
function text(slide,value,position,opts={},role="body"){
  const background=opts.background??C.white;
  const s=shape(slide,"rect",position,opts.background?background:{color:C.white,transparency:100000},{width:0,fill:background});
  s.text=value;s.text.typeface=opts.typeface??"Poppins";s.text.fontSize=opts.fontSize??12;s.text.bold=Boolean(opts.bold);s.text.italic=Boolean(opts.italic);
  s.text.color=opts.color??C.ink;s.text.alignment=opts.alignment??"left";s.text.verticalAlignment=opts.verticalAlignment??"middle";
  s.text.insets=opts.insets??{left:3,right:3,top:2,bottom:2};s.text.autoFit="shrinkText";
  records.push({kind:"textbox",role,text:value,bbox:position});return s;
}
function card(slide,x,y,w,h,fill,stroke,radius=6000,width=1){return slide.shapes.add({geometry:"roundRect",position:{left:x,top:y,width:w,height:h},fill,line:{style:"solid",fill:stroke,width},adjustmentList:[{name:"adj",formula:`val ${radius}`} ]});}
async function readImageBlob(path){const b=await fs.readFile(path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}

const s=deck.slides.add();s.background.fill=C.bg;
shape(s,"rect",{left:0,top:0,width:W,height:H},C.bg,{width:0,fill:C.bg});
shape(s,"rect",{left:72,top:62,width:1136,height:596},C.white,{style:"solid",fill:C.line,width:1});
shape(s,"rect",{left:704,top:62,width:504,height:596},C.navy,{width:0,fill:C.navy});

const hero=s.images.add({blob:await readImageBlob(HERO),fit:"cover",alt:"Dark navy car covered in wash foam"});
hero.position={left:734,top:96,width:444,height:494};hero.geometry="roundRect";
shape(s,"rect",{left:734,top:474,width:444,height:116},C.navy,{width:0,fill:C.navy});
shape(s,"rect",{left:734,top:474,width:444,height:4},C.cyan,{width:0,fill:C.cyan});

card(s,104,94,54,54,C.cyan,C.cyan,9000,0);
text(s,"AC",{left:111,top:107,width:40,height:28},{fontSize:16,bold:true,color:C.navy,alignment:"center"},"logo-mark");
text(s,"AURA CAR CARE",{left:173,top:92,width:245,height:30},{fontSize:17,bold:true,color:C.navy},"brand");
text(s,"SMART CAR WASH MANAGEMENT",{left:173,top:120,width:265,height:20},{fontSize:8.5,bold:true,color:C.muted},"brand-subtitle");

shape(s,"rect",{left:104,top:181,width:142,height:7},C.navy,{width:0,fill:C.navy});
shape(s,"parallelogram",{left:251,top:181,width:38,height:7},C.navy,{width:0,fill:C.navy});
shape(s,"rect",{left:294,top:181,width:58,height:7},C.cyan2,{width:0,fill:C.cyan2});

text(s,"THANK YOU",{left:101,top:218,width:570,height:96},{fontSize:62,bold:true,color:C.navy},"title");
shape(s,"ellipse",{left:108,top:332,width:18,height:18},C.cyan2,{width:0,fill:C.cyan2});
text(s,"FOR YOUR ATTENTION",{left:137,top:322,width:330,height:38},{fontSize:14,bold:true,color:C.ink},"subtitle");
text(s,"Questions & Discussion",{left:106,top:374,width:380,height:43},{fontSize:23,bold:true,color:C.navy2},"qa");
text(s,"AutoWash Pro connects advance booking, service operations, payment and loyalty in one unified car wash management experience.",{left:106,top:421,width:520,height:62},{fontSize:12,color:C.muted},"closing-copy");

shape(s,"rect",{left:106,top:526,width:530,height:2},C.cyan2,{width:0,fill:C.cyan2});
text(s,"PROJECT",{left:106,top:542,width:120,height:18},{fontSize:8,bold:true,color:C.cyan2},"footer-label");
text(s,"AutoWash Pro · SWP391",{left:106,top:561,width:165,height:26},{fontSize:10.5,bold:true,color:C.navy},"footer-value");
text(s,"SUPERVISOR",{left:288,top:542,width:120,height:18},{fontSize:8,bold:true,color:C.cyan2},"footer-label");
text(s,"Ms. Le Thi Quynh Chi",{left:288,top:561,width:180,height:26},{fontSize:10.5,bold:true,color:C.navy},"footer-value");
text(s,"WEBSITE",{left:492,top:542,width:100,height:18},{fontSize:8,bold:true,color:C.cyan2},"footer-label");
text(s,"auracarwash.site",{left:492,top:561,width:145,height:26},{fontSize:10.5,bold:true,color:C.navy},"footer-value");

text(s,"AUTO WASH PRO",{left:760,top:497,width:360,height:30},{fontSize:22,bold:true,color:C.white,background:C.navy},"image-title");
text(s,"Advance Booking · Smart Operations · Loyalty Program",{left:760,top:530,width:370,height:24},{fontSize:9.5,bold:true,color:C.cyan,background:C.navy},"image-subtitle");
text(s,"FPT UNIVERSITY HCMC  /  SUMMER 2026",{left:760,top:557,width:370,height:18},{fontSize:8,color:C.white,background:C.navy},"image-meta");

card(s,1090,78,86,31,C.white,C.white,24000,0);
text(s,"Q&A  →",{left:1100,top:84,width:66,height:19},{fontSize:9,bold:true,color:C.navy,alignment:"center"},"qa-badge");

const rendered=await deck.export({slide:s,format:"png",scale:1});
if(typeof rendered.save==="function")await rendered.save(PREVIEW);else if(typeof rendered.arrayBuffer==="function")await fs.writeFile(PREVIEW,Buffer.from(await rendered.arrayBuffer()));else await fs.writeFile(PREVIEW,Buffer.from(rendered));
await fs.writeFile(INSPECT,records.map(r=>JSON.stringify(r)).join("\n")+"\n","utf8");
const pptx=await PresentationFile.exportPptx(deck);await pptx.save(OUT);console.log(OUT);
