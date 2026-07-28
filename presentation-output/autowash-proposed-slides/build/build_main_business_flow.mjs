import fs from "node:fs/promises";
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT = "E:/SU26/SWP391/presentation-output/main-business-flow/output.pptx";
const PREVIEW = "E:/SU26/SWP391/presentation-output/main-business-flow/tmp/preview";
const INSPECT = "E:/SU26/SWP391/presentation-output/main-business-flow/tmp/inspect.ndjson";
const W = 1280, H = 720;
const C = {
  bg:"#F3F6FA", white:"#FFFFFF", ink:"#0B1220", muted:"#58677A", border:"#CCD6E2", line:"#334155",
  cyan:"#08BFD3", cyanLight:"#EAFBFD", purple:"#8613B8", purpleLight:"#F7EDFB",
  green:"#16A34A", greenLight:"#ECFDF3", orange:"#F45B13", orangeLight:"#FFF3EC",
  blue:"#2563EB", blueLight:"#EFF6FF", red:"#DC2626", redLight:"#FEF2F2", amber:"#D97706", amberLight:"#FFFBEB"
};

const deck = Presentation.create({ slideSize:{width:W,height:H} });
deck.theme.colorScheme = { name:"Aura Main Flow", themeColors:{accent1:C.orange,accent2:C.cyan,bg1:C.white,bg2:C.bg,tx1:C.ink,tx2:C.muted} };
const records=[]; let currentSlide=0;

function shape(slide, geometry, position, fill, line={width:0,fill}) { return slide.shapes.add({geometry,position,fill,line}); }
function text(slide,value,position,opts={},role="body") {
  const s=shape(slide,"rect",position,{color:C.white,transparency:100000},{width:0,fill:C.white});
  s.text=value; s.text.typeface="Poppins"; s.text.fontSize=opts.fontSize??11; s.text.bold=Boolean(opts.bold);
  s.text.color=opts.color??C.ink; s.text.alignment=opts.alignment??"center"; s.text.verticalAlignment=opts.verticalAlignment??"middle";
  s.text.insets=opts.insets??{left:3,right:3,top:2,bottom:2}; s.text.autoFit="shrinkText";
  records.push({kind:"textbox",slide:currentSlide,role,text:value,textChars:value.length,textLines:value.split("\n").length,bbox:position}); return s;
}
function card(slide,x,y,w,h,fill=C.white,stroke=C.border,radius=6000,width=1.2) {
  return slide.shapes.add({geometry:"roundRect",position:{left:x,top:y,width:w,height:h},fill,line:{style:"solid",fill:stroke,width},adjustmentList:[{name:"adj",formula:`val ${radius}`}]});
}
function frame(slide,title,subtitle,accent=C.orange) {
  currentSlide+=1; slide.background.fill=C.bg;
  shape(slide,"rect",{left:0,top:0,width:W,height:H},C.bg,{width:0,fill:C.bg});
  shape(slide,"rect",{left:42,top:28,width:1196,height:664},C.white,{style:"solid",fill:C.border,width:1});
  shape(slide,"rect",{left:42,top:28,width:8,height:664},accent,{width:0,fill:accent});
  const parts=title.split("|").map(v=>v.trim());
  text(slide,parts[0],{left:78,top:51,width:132,height:42},{fontSize:27,bold:true,color:C.ink,alignment:"left"},"section-title");
  shape(slide,"rect",{left:214,top:58,width:3,height:29},accent,{width:0,fill:accent});
  text(slide,parts[1]??"Main Flow",{left:230,top:51,width:790,height:42},{fontSize:25,bold:true,color:accent,alignment:"left"},"title");
  text(slide,subtitle,{left:80,top:96,width:1010,height:24},{fontSize:11.5,color:C.muted,alignment:"left"},"subtitle");
  card(slide,1084,56,116,28,C.ink,C.ink,25000); text(slide,"CORE BUSINESS FLOW",{left:1091,top:62,width:102,height:16},{fontSize:7.8,bold:true,color:C.white},"badge");
}
function process(slide,label,x,y,w=142,h=58,color=C.cyan,fill=C.cyanLight,meta="") {
  card(slide,x,y,w,h,fill,color,4500,1.4); text(slide,label,{left:x+8,top:y+7,width:w-16,height:meta?29:h-14},{fontSize:9.5,bold:true},"process");
  if(meta) text(slide,meta,{left:x+8,top:y+h-20,width:w-16,height:14},{fontSize:7.3,bold:true,color},"status");
  return {x,y,w,h,type:"process"};
}
function terminator(slide,label,x,y,w=118,h=44,color=C.green,fill=C.greenLight) {
  card(slide,x,y,w,h,fill,color,30000,1.5); text(slide,label,{left:x+8,top:y+7,width:w-16,height:h-14},{fontSize:10,bold:true,color},"terminator");
  return {x,y,w,h,type:"terminator"};
}
function decision(slide,label,x,y,w=116,h=78,color=C.orange,fill=C.orangeLight) {
  shape(slide,"diamond",{left:x,top:y,width:w,height:h},fill,{style:"solid",fill:color,width:1.5});
  text(slide,label,{left:x+18,top:y+17,width:w-36,height:h-34},{fontSize:8.7,bold:true},"decision"); return {x,y,w,h,type:"decision"};
}
function right(slide,a,b,y,color=C.line) { shape(slide,"rightArrow",{left:a,top:y-4,width:b-a,height:8},color,{width:0,fill:color}); }
function left(slide,a,b,y,color=C.line) { shape(slide,"leftArrow",{left:a,top:y-4,width:b-a,height:8},color,{width:0,fill:color}); }
function down(slide,x,a,b,color=C.line) { shape(slide,"downArrow",{left:x-5,top:a,width:10,height:b-a},color,{width:0,fill:color}); }
function up(slide,x,a,b,color=C.line) { shape(slide,"upArrow",{left:x-5,top:a,width:10,height:b-a},color,{width:0,fill:color}); }
function label(slide,value,x,y,w=48,color=C.muted) { card(slide,x,y,w,19,C.white,C.white,1000,0); text(slide,value,{left:x,top:y,width:w,height:19},{fontSize:7.8,bold:true,color},"branch-label"); }
function lineH(slide,x,y,w,color=C.line) { shape(slide,"rect",{left:x,top:y,width:w,height:3},color,{width:0,fill:color}); }
function lineV(slide,x,y,h,color=C.line) { shape(slide,"rect",{left:x,top:y,width:3,height:h},color,{width:0,fill:color}); }
function phase(slide,value,x,y,w,color,fill) { card(slide,x,y,w,26,fill,color,25000,1); text(slide,value,{left:x+8,top:y+4,width:w-16,height:18},{fontSize:8.5,bold:true,color},"phase"); }
function legend(slide) {
  terminator(slide,"START / END",80,653,96,25,C.green,C.greenLight);
  process(slide,"PROCESS",205,653,96,25,C.cyan,C.cyanLight);
  shape(slide,"diamond",{left:330,top:650,width:42,height:30},C.orangeLight,{style:"solid",fill:C.orange,width:1.2});
  text(slide,"DECISION",{left:379,top:653,width:78,height:25},{fontSize:8.2,bold:true,color:C.orange},"legend");
  text(slide,"Main booking, payment, car wash, loyalty and review flow.",{left:600,top:653,width:590,height:24},{fontSize:8.2,color:C.muted,alignment:"right"},"footer");
}

// Slide 1: compact end-to-end flow.
{
  const s=deck.slides.add(); frame(s,"6. Flows | Scenario 1: Main Car Wash Service Flow","The complete customer journey from selecting a service to completing the car wash and leaving a review.",C.orange);
  phase(s,"1  BOOKING SETUP",80,135,350,C.cyan,C.cyanLight); phase(s,"2  CONFIRMATION",465,135,350,C.purple,C.purpleLight); phase(s,"3  SERVICE & AFTERCARE",850,135,350,C.green,C.greenLight);
  const y1=190,y2=360,y3=526,w=132,h=56,x=[72,258,444,630,816,1002];
  const n1=terminator(s,"START",x[0],y1+6,110,44,C.blue,C.blueLight);
  const n2=process(s,"1. Browse car wash services",x[1],y1,w,h,C.cyan,C.cyanLight);
  const n3=process(s,"2. Select a vehicle",x[2],y1,w,h,C.cyan,C.cyanLight);
  const n4=process(s,"3. Choose date and time",x[3],y1,w,h,C.cyan,C.cyanLight);
  const n5=decision(s,"4. Is the slot available?",x[4]+8,y1-9,116,78,C.orange,C.orangeLight);
  const n6=process(s,"5. Hold the selected slot",x[5],y1,w,h,C.green,C.greenLight,"15 minutes");
  right(s,n1.x+n1.w,n2.x,y1+28); right(s,n2.x+w,n3.x,y1+28); right(s,n3.x+w,n4.x,y1+28); right(s,n4.x+w,n5.x,y1+28); right(s,n5.x+n5.w,n6.x,y1+28); label(s,"YES",945,y1+3,42,C.green);
  const retry=process(s,"Choose another time slot",804,278,140,48,C.orange,C.orangeLight);
  down(s,n5.x+n5.w/2,n5.y+n5.h,retry.y); label(s,"NO",861,260,32,C.red); left(s,758,retry.x,retry.y+24,C.orange); lineV(s,755,218,84,C.orange); up(s,756,214,220,C.orange);

  const row2=[1002,816,630,444,258,72];
  const b1=process(s,"6. Create a booking",row2[0],y2,w,h,C.purple,C.purpleLight,"Pending");
  const b2=decision(s,"7. Pay online?",row2[1]+8,y2-10,116,78,C.orange,C.orangeLight);
  const b3=process(s,"8. Make online payment",row2[2],y2,w,h,C.orange,C.orangeLight);
  const b4=decision(s,"9. Is payment successful?",row2[3]+8,y2-10,116,78,C.orange,C.orangeLight);
  const b5=process(s,"10. Confirm the booking",row2[4],y2,w,h,C.green,C.greenLight,"Confirmed");
  const b6=process(s,"11. Assign staff",row2[5],y2,w,h,C.purple,C.purpleLight);
  down(s,n6.x+n6.w/2,n6.y+n6.h,b1.y); left(s,b2.x+b2.w,b1.x,y2+28); left(s,b3.x+w,b2.x,y2+28); left(s,b4.x+b4.w,b3.x,y2+28); left(s,b5.x+w,b4.x,y2+28); left(s,b6.x+w,b5.x,y2+28);
  label(s,"YES",766,y2+2,42,C.green); label(s,"YES",394,y2+2,42,C.green);
  const counter=process(s,"Pay at the service center",806,449,142,46,C.orange,C.orangeLight);
  down(s,b2.x+b2.w/2,b2.y+b2.h,counter.y); label(s,"NO",860,432,32,C.blue); left(s,760,counter.x,counter.y+23,C.orange); lineV(s,757,388,84,C.orange); up(s,758,383,390,C.orange);
  const pending=process(s,"Try again, change payment or cancel",434,449,160,46,C.red,C.redLight);
  down(s,b4.x+b4.w/2,b4.y+b4.h,pending.y); label(s,"NO",494,432,32,C.red); right(s,pending.x+pending.w,615,pending.y+23,C.red); lineV(s,612,390,82,C.red); up(s,613,383,391,C.red);

  const c=[72,230,388,546,704,862,1020], cy=y3;
  const c1=process(s,"12. Check-in the vehicle",c[0],cy,124,h,C.blue,C.blueLight,"Checked in");
  const c2=process(s,"13. Move vehicle to queue",c[1],cy,124,h,C.purple,C.purpleLight,"Queued");
  const c3=process(s,"14. Start the car wash",c[2],cy,124,h,C.cyan,C.cyanLight,"In progress");
  const c4=process(s,"15. Complete the car wash",c[3],cy,124,h,C.green,C.greenLight,"Completed");
  const c5=process(s,"16. Get points and update tier",c[4],cy,124,h,C.green,C.greenLight);
  const c6=decision(s,"17. Leave a review?",c[5]+7,cy-9,110,76,C.orange,C.orangeLight);
  const c7=terminator(s,"END",c[6],cy+6,110,44,C.green,C.greenLight);
  down(s,b6.x+b6.w/2,b6.y+b6.h,c1.y); right(s,c1.x+c1.w,c2.x,cy+28); right(s,c2.x+c2.w,c3.x,cy+28); right(s,c3.x+c3.w,c4.x,cy+28); right(s,c4.x+c4.w,c5.x,cy+28); right(s,c5.x+c5.w,c6.x,cy+28); right(s,c6.x+c6.w,c7.x,cy+28); label(s,"NO",982,cy+3,32,C.muted);
  const review=process(s,"18. Submit review and get bonus points",862,620,150,30,C.orange,C.orangeLight);
  down(s,c6.x+c6.w/2,c6.y+c6.h,review.y); label(s,"YES",918,601,38,C.green); right(s,review.x+review.w,c7.x+55,review.y+15,C.orange); up(s,c7.x+55,cy+50,review.y+16,C.orange);
  legend(s);
}

// Slide 2: booking and payment decisions.
{
  const s=deck.slides.add(); frame(s,"6. Flows | Scenario 2: Booking & Payment Flow","Select a service, reserve an available time slot, create the booking and complete the selected payment method.",C.purple);
  phase(s,"SERVICE AND SLOT",80,137,320,C.cyan,C.cyanLight); phase(s,"BOOKING VALIDATION",480,137,320,C.purple,C.purpleLight); phase(s,"PAYMENT CONFIRMATION",880,137,320,C.orange,C.orangeLight);
  const start=terminator(s,"START BOOKING",80,194,130,44,C.blue,C.blueLight);
  const offer=process(s,"1. Select a service or package",260,188,150,56,C.cyan,C.cyanLight);
  const vehicle=process(s,"2. Select a vehicle",460,188,140,56,C.cyan,C.cyanLight);
  const slot=process(s,"3. Choose date and time",650,188,160,56,C.cyan,C.cyanLight);
  const capacity=decision(s,"4. Is the slot available?",870,178,128,78,C.orange,C.orangeLight);
  const hold=process(s,"5. Hold the selected slot",1050,188,150,56,C.green,C.greenLight,"15 minutes");
  right(s,start.x+start.w,offer.x,216); right(s,offer.x+offer.w,vehicle.x,216); right(s,vehicle.x+vehicle.w,slot.x,216); right(s,slot.x+slot.w,capacity.x,216); right(s,capacity.x+capacity.w,hold.x,216); label(s,"YES",1002,190,40,C.green);
  const another=process(s,"Choose another time slot",860,295,150,50,C.orange,C.orangeLight); down(s,capacity.x+capacity.w/2,capacity.y+capacity.h,another.y); label(s,"NO",922,278,32,C.red); left(s,810,another.x,320,C.orange); lineV(s,807,216,105,C.orange); up(s,808,210,218,C.orange);

  const details=process(s,"6. Add voucher and staff preference",1050,380,150,58,C.purple,C.purpleLight);
  const valid=decision(s,"7. Are booking details valid?",850,370,132,78,C.orange,C.orangeLight);
  const create=process(s,"8. Create the booking",650,380,150,58,C.purple,C.purpleLight,"Pending");
  const method=decision(s,"9. Choose payment method",450,370,132,78,C.orange,C.orangeLight);
  const online=process(s,"10. Make online payment",250,380,150,58,C.orange,C.orangeLight);
  const verified=decision(s,"11. Is payment successful?",70,370,132,78,C.orange,C.orangeLight);
  down(s,hold.x+hold.w/2,hold.y+hold.h,details.y); left(s,valid.x+valid.w,details.x,409); left(s,create.x+create.w,valid.x,409); left(s,method.x+method.w,create.x,409); left(s,online.x+online.w,method.x,409); left(s,verified.x+verified.w,online.x,409);
  label(s,"YES",808,382,40,C.green); label(s,"ONLINE",405,382,50,C.orange);
  const correct=process(s,"Correct the booking information",842,495,164,50,C.red,C.redLight); down(s,valid.x+valid.w/2,valid.y+valid.h,correct.y); label(s,"NO",905,478,32,C.red); right(s,correct.x+correct.w,1030,520,C.red); lineV(s,1027,409,112,C.red); up(s,1028,402,410,C.red);
  const counter=process(s,"Pay at the service center",430,495,170,50,C.blue,C.blueLight); down(s,method.x+method.w/2,method.y+method.h,counter.y); label(s,"AT COUNTER",483,478,66,C.blue);
  const pending=process(s,"Try again, change payment or cancel",60,495,190,50,C.red,C.redLight); down(s,verified.x+verified.w/2,verified.y+verified.h,pending.y); label(s,"NO",118,478,32,C.red);
  const confirm=process(s,"12. Confirm the booking",470,585,230,56,C.green,C.greenLight,"Confirmed");
  const end=terminator(s,"BOOKING READY",780,591,150,44,C.green,C.greenLight);
  lineH(s,202,409,28,C.green); lineV(s,227,409,204,C.green); right(s,227,confirm.x,613,C.green); label(s,"YES",205,382,38,C.green);
  down(s,counter.x+counter.w/2,counter.y+counter.h,confirm.y); right(s,confirm.x+confirm.w,end.x,613,C.green); label(s,"PAYMENT VERIFIED",617,558,92,C.green);
  legend(s);
}

// Slide 3: service execution and aftercare.
{
  const s=deck.slides.add(); frame(s,"6. Flows | Scenario 3: Car Wash & Loyalty Flow","Check in the vehicle, complete the car wash, receive loyalty points and leave an optional review.",C.green);
  phase(s,"PRE-SERVICE",80,137,340,C.blue,C.blueLight); phase(s,"WASH EXECUTION",470,137,340,C.cyan,C.cyanLight); phase(s,"COMPLETION & RETENTION",860,137,340,C.green,C.greenLight);
  const start=terminator(s,"CONFIRMED BOOKING",70,190,150,44,C.green,C.greenLight);
  const assign=process(s,"1. Assign staff",270,184,145,56,C.purple,C.purpleLight);
  const eligible=decision(s,"2. Is the booking ready?",465,174,124,78,C.orange,C.orangeLight);
  const session=process(s,"3. Prepare the car wash",640,184,150,56,C.purple,C.purpleLight,"Pending");
  const queue=process(s,"4. Move vehicle to queue",840,184,150,56,C.purple,C.purpleLight,"Queued");
  const arrived=decision(s,"5. Has the vehicle arrived?",1040,174,124,78,C.orange,C.orangeLight);
  right(s,start.x+start.w,assign.x,212); right(s,assign.x+assign.w,eligible.x,212); right(s,eligible.x+eligible.w,session.x,212); right(s,session.x+session.w,queue.x,212); right(s,queue.x+queue.w,arrived.x,212); label(s,"YES",595,185,40,C.green);
  const wait=process(s,"Wait, reschedule or cancel",450,292,160,50,C.orange,C.orangeLight); down(s,eligible.x+eligible.w/2,eligible.y+eligible.h,wait.y); label(s,"NO",510,275,32,C.red);
  const noshow=process(s,"Mark as no-show or cancel booking",1020,292,180,50,C.red,C.redLight); down(s,arrived.x+arrived.w/2,arrived.y+arrived.h,noshow.y); label(s,"NO",1090,275,32,C.red);

  const checkin=process(s,"6. Check-in the vehicle",1040,390,140,56,C.blue,C.blueLight,"Checked in");
  const startWash=process(s,"7. Start the car wash",830,390,140,56,C.cyan,C.cyanLight,"In progress");
  const update=process(s,"8. Update wash progress",620,390,160,56,C.cyan,C.cyanLight,"Live tracking");
  const complete=process(s,"9. Complete the car wash",410,390,150,56,C.green,C.greenLight,"Completed");
  const paid=process(s,"10. Complete payment",210,390,150,56,C.green,C.greenLight,"Paid");
  const notify=process(s,"11. Show completion summary",50,390,120,56,C.blue,C.blueLight);
  down(s,arrived.x+arrived.w/2,arrived.y+arrived.h,checkin.y); label(s,"YES",1090,360,36,C.green); left(s,startWash.x+startWash.w,checkin.x,418); left(s,update.x+update.w,startWash.x,418); left(s,complete.x+complete.w,update.x,418); left(s,paid.x+paid.w,complete.x,418); left(s,notify.x+notify.w,paid.x,418);

  const points=process(s,"12. Get loyalty points",60,545,150,56,C.green,C.greenLight);
  const tier=process(s,"13. Update membership tier",260,545,150,56,C.green,C.greenLight);
  const review=decision(s,"14. Leave a review?",470,535,126,78,C.orange,C.orangeLight);
  const save=process(s,"15. Submit rating and comments",650,545,160,56,C.orange,C.orangeLight);
  const bonus=process(s,"16. Get review bonus",860,545,150,56,C.green,C.greenLight,"+10 points");
  const end=terminator(s,"END",1070,551,120,44,C.green,C.greenLight);
  down(s,notify.x+notify.w/2,notify.y+notify.h,points.y); right(s,points.x+points.w,tier.x,573); right(s,tier.x+tier.w,review.x,573); right(s,review.x+review.w,save.x,573); right(s,save.x+save.w,bonus.x,573); right(s,bonus.x+bonus.w,end.x,573); label(s,"YES",605,546,38,C.green);
  lineV(s,review.x+review.w/2,500,review.y-500,C.muted); lineH(s,review.x+review.w/2,500,end.x+end.w/2-(review.x+review.w/2),C.muted); down(s,end.x+end.w/2,500,end.y,C.muted); label(s,"NO",610,480,34,C.muted);
  card(s,80,618,1120,24,C.cyanLight,C.cyan,3000,1); text(s,"The wash progress is updated after each service step so the latest status remains visible throughout the car wash.",{left:96,top:622,width:1088,height:16},{fontSize:8.3,bold:true,color:C.slate},"rule");
  legend(s);
}

function flowNode(slide,item,x,y) {
  if(item.type==="start"||item.type==="end") return terminator(slide,item.label,x,y+7,150,44,item.color??C.green,item.fill??C.greenLight);
  if(item.type==="decision") return decision(slide,item.label,x+12,y-4,126,78,item.color??C.orange,item.fill??C.orangeLight);
  return process(slide,item.label,x,y,150,64,item.color??C.cyan,item.fill??C.cyanLight,item.meta??"");
}
function supportFlow(data) {
  const s=deck.slides.add(); frame(s,data.title,data.subtitle,data.accent);
  phase(s,data.phases[0],80,137,340,data.phaseColors[0],data.phaseFills[0]);
  phase(s,data.phases[1],470,137,340,data.phaseColors[1],data.phaseFills[1]);
  phase(s,data.phases[2],860,137,340,data.phaseColors[2],data.phaseFills[2]);
  const tx=[70,370,670,970], bx=[970,670,370,70], ty=188, by=455;
  const nodes=[];
  data.steps.slice(0,4).forEach((item,i)=>nodes.push(flowNode(s,item,tx[i],ty)));
  data.steps.slice(4,8).forEach((item,i)=>nodes.push(flowNode(s,item,bx[i],by)));
  for(let i=0;i<3;i++){
    right(s,nodes[i].x+nodes[i].w,nodes[i+1].x,ty+32);
    if(nodes[i].type==="decision") label(s,data.mainLabels?.[i]??"YES",nodes[i].x+nodes[i].w+4,ty+7,40,C.green);
  }
  down(s,nodes[3].x+nodes[3].w/2,nodes[3].y+nodes[3].h,nodes[4].y);
  if(nodes[3].type==="decision") label(s,data.mainLabels?.[3]??"YES",nodes[3].x+nodes[3].w/2+8,350,40,C.green);
  for(let i=4;i<7;i++){
    left(s,nodes[i+1].x+nodes[i+1].w,nodes[i].x,by+32);
    if(nodes[i].type==="decision") label(s,data.mainLabels?.[i]??"YES",nodes[i].x-46,by+7,40,C.green);
  }
  const notes=data.alternatives??[];
  const noteW=notes.length===1?430:notes.length===2?330:250;
  const gap=24; const total=notes.length*noteW+Math.max(0,notes.length-1)*gap; const start=(W-total)/2;
  const noteBoxes=[];
  notes.forEach((n,i)=>{
    const box={x:start+i*(noteW+gap),y:335,w:noteW,h:54}; noteBoxes.push(box);
    card(s,box.x,box.y,box.w,box.h,n.fill??C.redLight,n.color??C.red,5000,1.2);
    text(s,n.label,{left:box.x+12,top:344,width:box.w-24,height:36},{fontSize:8.6,bold:true,color:n.color??C.red},"alternative");
  });
  (data.alternativeFrom??[]).forEach((nodeIndex,noteIndex)=>{
    if(nodeIndex==null||!nodes[nodeIndex]||!noteBoxes[noteIndex]) return;
    const source=nodes[nodeIndex], target=noteBoxes[noteIndex];
    const sx=source.x+source.w/2, tx=target.x+target.w/2;
    if(source.y<target.y){
      const lane=292+noteIndex*18;
      lineV(s,sx,source.y+source.h,lane-(source.y+source.h),C.red);
      lineH(s,Math.min(sx,tx),lane,Math.abs(tx-sx),C.red);
      down(s,tx,lane,target.y,C.red);
      label(s,"NO",sx+8,source.y+source.h+7,32,C.red);
    } else {
      const lane=405+noteIndex*20;
      lineV(s,sx,lane,source.y-lane,C.red);
      lineH(s,Math.min(sx,tx),lane,Math.abs(tx-sx),C.red);
      up(s,tx,target.y+target.h,lane,C.red);
      label(s,"NO",sx+8,source.y-25,32,C.red);
    }
  });
  if(data.rule){card(s,80,618,1120,25,data.ruleFill??C.cyanLight,data.ruleColor??C.cyan,3000,1);text(s,data.rule,{left:96,top:622,width:1088,height:17},{fontSize:8.2,bold:true,color:C.slate},"rule");}
  legend(s);
}

supportFlow({
  title:"6. Flows | Scenario 4: Account & Vehicle Setup Flow",
  subtitle:"Create and verify an account, sign in, complete the profile and prepare a primary vehicle for booking.",
  accent:C.blue,
  phases:["ACCOUNT CREATION","PROFILE SETUP","VEHICLE SETUP"],phaseColors:[C.blue,C.cyan,C.green],phaseFills:[C.blueLight,C.cyanLight,C.greenLight],
  steps:[
    {type:"start",label:"START"},{label:"1. Create an account",color:C.blue,fill:C.blueLight},{label:"2. Receive verification code",color:C.orange,fill:C.orangeLight},{type:"decision",label:"3. Is the code correct?"},
    {label:"4. Sign in to the account",color:C.green,fill:C.greenLight},{label:"5. Complete customer profile",color:C.cyan,fill:C.cyanLight},{label:"6. Enter vehicle information",color:C.blue,fill:C.blueLight},{label:"7. Save vehicle and set as primary",color:C.green,fill:C.greenLight}
  ],
  alternatives:[{label:"NO → Enter the code again or request a new verification code."},{label:"INVALID VEHICLE → Correct the information. A duplicate license plate cannot be saved."}],
  alternativeFrom:[3,null],
  rule:"After a vehicle is saved, it can be selected as the primary vehicle and used as the default vehicle for future bookings.",ruleColor:C.blue,ruleFill:C.blueLight
});

supportFlow({
  title:"6. Flows | Scenario 5: Booking Changes & Exception Flow",
  subtitle:"Handle pending payment, payment changes, booking cancellation, payment timeout and no-show conditions.",
  accent:C.red,
  phases:["PENDING BOOKING","BOOKING CHANGE","CANCELLATION"],phaseColors:[C.orange,C.purple,C.red],phaseFills:[C.orangeLight,C.purpleLight,C.redLight],
  steps:[
    {type:"start",label:"OPEN BOOKING",color:C.blue,fill:C.blueLight},{type:"decision",label:"1. Is payment pending?"},{label:"2. Pay or change payment method",color:C.orange,fill:C.orangeLight},{type:"decision",label:"3. Paid within 15 minutes?"},
    {label:"4. Confirm the booking",color:C.green,fill:C.greenLight,meta:"Confirmed"},{type:"decision",label:"5. Cancel the booking?"},{type:"decision",label:"6. Is cancellation allowed?"},{label:"7. Cancel booking and apply payment rules",color:C.red,fill:C.redLight,meta:"Cancelled"}
  ],
  alternatives:[{label:"NO PAYMENT → Cancel the expired pending booking and release the reserved capacity."},{label:"NO CANCELLATION → Keep the booking or contact the service center when cancellation is restricted."}],
  alternativeFrom:[3,6],
  rule:"A confirmed booking that is not checked in may be handled as a no-show according to the configured service rules.",ruleColor:C.red,ruleFill:C.redLight
});

supportFlow({
  title:"6. Flows | Scenario 6: Combo, Promotion & Loyalty Flow",
  subtitle:"Check offer eligibility, purchase or apply the offer, complete services, earn points and redeem loyalty rewards.",
  accent:C.orange,
  phases:["OFFER SELECTION","SERVICE BENEFIT","LOYALTY REWARD"],phaseColors:[C.orange,C.purple,C.green],phaseFills:[C.orangeLight,C.purpleLight,C.greenLight],
  steps:[
    {type:"start",label:"VIEW OFFERS",color:C.orange,fill:C.orangeLight},{label:"1. Select a combo or promotion",color:C.orange,fill:C.orangeLight},{type:"decision",label:"2. Is the membership tier eligible?"},{label:"3. Purchase combo or apply voucher",color:C.purple,fill:C.purpleLight},
    {type:"decision",label:"4. Is payment successful?"},{label:"5. Activate combo or discount",color:C.green,fill:C.greenLight},{label:"6. Complete an eligible service",color:C.cyan,fill:C.cyanLight},{label:"7. Earn points, update tier and redeem rewards",color:C.green,fill:C.greenLight}
  ],
  alternatives:[{label:"NO TIER ELIGIBILITY → Select another available offer."},{label:"PAYMENT FAILED → Try again, change payment method or cancel the purchase."}],
  alternativeFrom:[2,4],
  rule:"Available points can be redeemed for eligible voucher offers when the customer has enough points and meets the required membership tier.",ruleColor:C.green,ruleFill:C.greenLight
});

supportFlow({
  title:"6. Flows | Scenario 7: Staff Assignment & Live Tracking Flow",
  subtitle:"Select available staff, balance work assignments, start the service and keep the latest wash progress visible.",
  accent:C.purple,
  phases:["STAFF ASSIGNMENT","SERVICE PROGRESS","LIVE TRACKING"],phaseColors:[C.purple,C.cyan,C.blue],phaseFills:[C.purpleLight,C.cyanLight,C.blueLight],
  steps:[
    {type:"start",label:"CONFIRMED BOOKING",color:C.green,fill:C.greenLight},{label:"1. Check available staff",color:C.purple,fill:C.purpleLight},{type:"decision",label:"2. Is a staff member available?"},{label:"3. Assign staff by availability and workload",color:C.purple,fill:C.purpleLight},
    {label:"4. Queue and check-in the vehicle",color:C.blue,fill:C.blueLight},{label:"5. Start the car wash",color:C.cyan,fill:C.cyanLight},{label:"6. Update wash progress",color:C.cyan,fill:C.cyanLight},{label:"7. Display the latest progress",color:C.blue,fill:C.blueLight}
  ],
  alternatives:[{label:"NO STAFF AVAILABLE → Select the next available employee, adjust the assignment or wait for availability."}],
  alternativeFrom:[2],
  rule:"Each service update refreshes the visible booking status; automatic refresh remains available when the live connection is interrupted.",ruleColor:C.purple,ruleFill:C.purpleLight
});

supportFlow({
  title:"6. Flows | Scenario 8: Review & Feedback Flow",
  subtitle:"Allow one review for each completed booking, save optional images and award the review bonus.",
  accent:C.orange,
  phases:["REVIEW ELIGIBILITY","REVIEW SUBMISSION","FEEDBACK RESULT"],phaseColors:[C.green,C.orange,C.purple],phaseFills:[C.greenLight,C.orangeLight,C.purpleLight],
  steps:[
    {type:"start",label:"COMPLETED BOOKING",color:C.green,fill:C.greenLight},{type:"decision",label:"1. Can a new review be submitted?"},{label:"2. Enter rating and comments",color:C.orange,fill:C.orangeLight},{label:"3. Add before and after images",color:C.blue,fill:C.blueLight},
    {label:"4. Submit the review",color:C.orange,fill:C.orangeLight},{type:"decision",label:"5. Is the review valid?"},{label:"6. Save feedback and award bonus",color:C.green,fill:C.greenLight,meta:"+10 points"},{type:"end",label:"VIEW REVIEW",color:C.purple,fill:C.purpleLight}
  ],
  alternatives:[{label:"NO, REVIEW EXISTS → Open the existing review instead of creating another one."},{label:"INVALID REVIEW → Correct the rating, comments or image information and submit again."}],
  alternativeFrom:[1,5],
  rule:"Only completed bookings can be reviewed, and each booking can receive no more than one customer review.",ruleColor:C.orange,ruleFill:C.orangeLight
});

supportFlow({
  title:"6. Flows | Scenario 9: Management & Reporting Flow",
  subtitle:"Find operational records, review details, apply valid changes and monitor updated business performance.",
  accent:C.purple,
  phases:["SEARCH AND REVIEW","MANAGEMENT ACTION","REPORTING"],phaseColors:[C.cyan,C.purple,C.green],phaseFills:[C.cyanLight,C.purpleLight,C.greenLight],
  steps:[
    {type:"start",label:"OPEN MANAGEMENT",color:C.blue,fill:C.blueLight},{label:"1. Select a management area",color:C.cyan,fill:C.cyanLight},{label:"2. Search and filter records",color:C.cyan,fill:C.cyanLight},{label:"3. Review record details",color:C.blue,fill:C.blueLight},
    {type:"decision",label:"4. Is a change required?"},{label:"5. Update booking, service, account, promotion or content",color:C.purple,fill:C.purpleLight},{type:"decision",label:"6. Are the changes valid?"},{label:"7. Save changes and refresh reports",color:C.green,fill:C.greenLight}
  ],
  alternatives:[{label:"NO CHANGE → Continue to dashboard and reporting."},{label:"INVALID CHANGE → Correct the information before saving."}],
  alternativeFrom:[4,6],
  rule:"Management reports combine booking volume, revenue, service progress, staff performance, customer tiers, promotions and reviews.",ruleColor:C.green,ruleFill:C.greenLight
});

await fs.mkdir(PREVIEW,{recursive:true});
for(let i=0;i<deck.slides.count;i++){
  const rendered=await deck.export({slide:deck.slides.getItem(i),format:"png",scale:1});
  const path=`${PREVIEW}/slide-${String(i+1).padStart(2,"0")}.png`;
  if(typeof rendered.save==="function") await rendered.save(path); else if(typeof rendered.arrayBuffer==="function") await fs.writeFile(path,Buffer.from(await rendered.arrayBuffer())); else await fs.writeFile(path,Buffer.from(rendered));
}
await fs.writeFile(INSPECT,records.map(r=>JSON.stringify(r)).join("\n")+"\n","utf8");
const pptx=await PresentationFile.exportPptx(deck); await pptx.save(OUT); console.log(OUT);
