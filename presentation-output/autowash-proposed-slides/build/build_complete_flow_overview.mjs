import fs from "node:fs/promises";
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const OUT="E:/SU26/SWP391/presentation-output/complete-flow-overview/output.pptx";
const TMP="E:/SU26/SWP391/presentation-output/complete-flow-overview/tmp";
const INSPECT="E:/SU26/SWP391/presentation-output/complete-flow-overview/output.pptx.inspect.ndjson";
const W=1280,H=720;
const C={bg:"#F3F6FA",white:"#FFFFFF",ink:"#101828",muted:"#667085",line:"#344054",border:"#D0D5DD",orange:"#F45B13",orangeLight:"#FFF3EC",cyan:"#08BFD3",cyanLight:"#EAFBFD",blue:"#2563EB",blueLight:"#EFF6FF",purple:"#8613B8",purpleLight:"#F7EDFB",green:"#16A34A",greenLight:"#ECFDF3",red:"#DC2626",redLight:"#FEF2F2"};
const deck=Presentation.create({slideSize:{width:W,height:H}});
deck.theme.colorScheme={name:"Aura Functional Flows",themeColors:{accent1:C.orange,accent2:C.cyan,bg1:C.white,bg2:C.bg,tx1:C.ink,tx2:C.muted}};
const records=[];let slideNo=0;

function shape(slide,geometry,position,fill,line={width:0,fill}){return slide.shapes.add({geometry,position,fill,line});}
function text(slide,value,position,opts={},role="body"){
  const s=shape(slide,"rect",position,{color:C.white,transparency:100000},{width:0,fill:C.white});
  s.text=value;s.text.typeface=opts.typeface??"Poppins";s.text.fontSize=opts.fontSize??12;s.text.bold=Boolean(opts.bold);
  s.text.color=opts.color??C.ink;s.text.alignment=opts.alignment??"center";s.text.verticalAlignment=opts.verticalAlignment??"middle";
  s.text.insets=opts.insets??{left:3,right:3,top:2,bottom:2};s.text.autoFit="shrinkText";
  records.push({kind:"textbox",slide:slideNo,role,text:value,bbox:position});return s;
}
function card(slide,x,y,w,h,fill,stroke,radius=6000,width=1.2){return slide.shapes.add({geometry:"roundRect",position:{left:x,top:y,width:w,height:h},fill,line:{style:"solid",fill:stroke,width},adjustmentList:[{name:"adj",formula:`val ${radius}`} ]});}
function right(slide,x1,x2,y,color=C.line){shape(slide,"rightArrow",{left:x1,top:y-5,width:x2-x1,height:10},color,{width:0,fill:color});}
function left(slide,x1,x2,y,color=C.line){shape(slide,"leftArrow",{left:x1,top:y-5,width:x2-x1,height:10},color,{width:0,fill:color});}
function down(slide,x,y1,y2,color=C.line){shape(slide,"downArrow",{left:x-6,top:y1,width:12,height:y2-y1},color,{width:0,fill:color});}
function frame(slide,title,subtitle,accent){slideNo++;slide.background.fill=C.bg;shape(slide,"rect",{left:0,top:0,width:W,height:H},C.bg,{width:0,fill:C.bg});shape(slide,"rect",{left:44,top:28,width:1192,height:664},C.white,{style:"solid",fill:C.border,width:1});shape(slide,"rect",{left:44,top:28,width:8,height:664},accent,{width:0,fill:accent});text(slide,"6. Flows",{left:80,top:53,width:136,height:42},{fontSize:27,bold:true,color:C.ink,alignment:"left"},"section-title");shape(slide,"rect",{left:218,top:60,width:3,height:28},accent,{width:0,fill:accent});text(slide,title,{left:236,top:53,width:810,height:42},{fontSize:25.5,bold:true,color:accent,alignment:"left"},"title");text(slide,subtitle,{left:82,top:99,width:1040,height:24},{fontSize:11.2,color:C.muted,alignment:"left"},"subtitle");}
function node(slide,item,x,y){const color=item.color,fill=item.fill;shape(slide,"ellipse",{left:x,top:y,width:82,height:82},fill,{style:"solid",fill:color,width:2});text(slide,item.icon,{left:x+9,top:y+9,width:64,height:58},{fontSize:32,typeface:"Segoe UI Emoji"},"icon");shape(slide,"ellipse",{left:x-7,top:y-8,width:27,height:27},color,{width:0,fill:color});text(slide,String(item.num),{left:x-4,top:y-5,width:21,height:21},{fontSize:10,bold:true,color:C.white},"number");text(slide,item.label,{left:x-45,top:y+89,width:172,height:42},{fontSize:10.7,bold:true},"step");return{x,y,w:82,h:82};}
function caption(slide,value,x,y,w){text(slide,value,{left:x,top:y,width:w,height:28},{fontSize:8.9,bold:true,color:C.muted},"connector-label");}
function flowSlide(data){const s=deck.slides.add();frame(s,data.title,data.subtitle,data.accent);const topY=178,bottomY=405;const tx=[105,375,645,915],bx=[915,645,375,105];const nodes=[];data.steps.slice(0,4).forEach((v,i)=>nodes.push(node(s,{...v,num:i+1},tx[i],topY)));data.steps.slice(4,8).forEach((v,i)=>nodes.push(node(s,{...v,num:i+5},bx[i],bottomY)));
  for(let i=0;i<3;i++){right(s,nodes[i].x+nodes[i].w,nodes[i+1].x,topY+41);caption(s,data.links[i],nodes[i].x+nodes[i].w,topY-3,nodes[i+1].x-(nodes[i].x+nodes[i].w));}
  down(s,nodes[3].x+41,nodes[3].y+82,nodes[4].y);caption(s,data.links[3],1000,318,160);
  for(let i=4;i<7;i++){left(s,nodes[i+1].x+nodes[i+1].w,nodes[i].x,bottomY+41);caption(s,data.links[i],nodes[i+1].x+nodes[i+1].w,bottomY-3,nodes[i].x-(nodes[i+1].x+nodes[i+1].w));}
  card(s,80,585,1120,62,data.ruleFill??C.orangeLight,data.ruleColor??data.accent,5000,1.2);text(s,data.ruleTitle,{left:98,top:596,width:190,height:20},{fontSize:9,bold:true,color:data.ruleColor??data.accent,alignment:"left"},"rule-title");text(s,data.rule,{left:290,top:593,width:888,height:28},{fontSize:9.2,bold:true,color:C.ink,alignment:"left"},"rule");text(s,data.note??"",{left:290,top:618,width:888,height:18},{fontSize:8.2,color:C.muted,alignment:"left"},"note");return s;}

const palette=[
  {color:C.cyan,fill:C.cyanLight},{color:C.blue,fill:C.blueLight},{color:C.purple,fill:C.purpleLight},{color:C.orange,fill:C.orangeLight},
  {color:C.blue,fill:C.blueLight},{color:C.cyan,fill:C.cyanLight},{color:C.green,fill:C.greenLight},{color:C.purple,fill:C.purpleLight}
];
const P=(i)=>palette[i];

flowSlide({title:"Scenario 1: Overall Functional Flow",subtitle:"The complete AutoWash journey, from customer preparation to daily operation, loyalty and management.",accent:C.orange,steps:[
  {...P(0),icon:"👤",label:"Account & Vehicle"},{...P(1),icon:"⌕",label:"Services, Combos & Promotions"},{...P(2),icon:"📅",label:"Schedule & Capacity"},{...P(3),icon:"💳",label:"Booking & Payment"},
  {...P(4),icon:"✓",label:"Staff Assignment & Check-in"},{...P(5),icon:"💧",label:"Wash Progress & Completion"},{...P(6),icon:"★",label:"Points, Tier & Rewards"},{...P(7),icon:"✦",label:"Review, History & Management"}],links:["Prepare customer information","Explore available offers","Choose an open time slot","Confirm the booking","Deliver the service","Complete and reward","Retain and improve"],ruleTitle:"PROJECT HIGHLIGHTS",rule:"Capacity-aware booking, staff workload balancing, live wash progress, loyalty tiers, promotions and centralized management.",note:"All major features support one connected service journey rather than separate user experiences.",ruleColor:C.orange,ruleFill:C.orangeLight});

flowSlide({title:"Scenario 2: Account & Vehicle Preparation Flow",subtitle:"Prepare verified customer and vehicle information before creating a booking.",accent:C.blue,steps:[
  {...P(0),icon:"👤",label:"Create an Account"},{...P(1),icon:"✓",label:"Verify the Account"},{...P(2),icon:"→",label:"Sign In"},{...P(3),icon:"◉",label:"Complete the Profile"},
  {...P(4),icon:"🚗",label:"Add a Vehicle"},{...P(5),icon:"#",label:"Validate Vehicle Details"},{...P(6),icon:"★",label:"Set a Primary Vehicle"},{...P(7),icon:"✓",label:"Ready for Booking"}],links:["Confirm customer identity","Access the customer area","Add personal information","Prepare vehicle information","Check required details","Choose the default vehicle","Continue to booking"],ruleTitle:"VEHICLE RULE",rule:"A saved vehicle can be selected as the primary vehicle and reused for future bookings.",note:"Duplicate or invalid vehicle information must be corrected before the vehicle is saved.",ruleColor:C.blue,ruleFill:C.blueLight});

flowSlide({title:"Scenario 3: Service Discovery, Booking & Payment Flow",subtitle:"Select the right service, reserve an available slot and confirm the booking through the chosen payment method.",accent:C.purple,steps:[
  {...P(0),icon:"⌕",label:"Explore Services"},{...P(1),icon:"▣",label:"Select Service, Package or Combo"},{...P(2),icon:"🚗",label:"Choose a Vehicle"},{...P(3),icon:"📅",label:"Choose Date & Time"},
  {...P(4),icon:"◷",label:"Check Slot Availability"},{...P(5),icon:"◇",label:"Apply Voucher or Preference"},{...P(6),icon:"💳",label:"Choose a Payment Method"},{...P(7),icon:"✓",label:"Confirm the Booking"}],links:["Compare available offers","Prepare booking details","Choose an open schedule","Validate capacity","Complete booking options","Pay online or at counter","Receive confirmation"],ruleTitle:"BOOKING RULE",rule:"A full or unavailable time slot cannot be selected; the customer must choose another available time.",note:"Pending online payments may expire, while cancellation and refund follow the booking conditions.",ruleColor:C.purple,ruleFill:C.purpleLight});

flowSlide({title:"Scenario 4: Staff Assignment & Car Wash Flow",subtitle:"Coordinate staff, vehicle check-in and each wash stage while keeping the latest service progress visible.",accent:C.cyan,steps:[
  {...P(0),icon:"▤",label:"Review Confirmed Booking"},{...P(1),icon:"👥",label:"Check Staff Availability"},{...P(2),icon:"⚖",label:"Balance Staff Workload"},{...P(3),icon:"✓",label:"Assign Staff"},
  {...P(4),icon:"🚗",label:"Check-in & Queue Vehicle"},{...P(5),icon:"💧",label:"Start the Car Wash"},{...P(6),icon:"↻",label:"Update Wash Progress"},{...P(7),icon:"✓",label:"Complete the Service"}],links:["Find available employees","Distribute work fairly","Prepare the assigned team","Receive the vehicle","Perform each wash stage","Show the latest progress","Finish and notify"],ruleTitle:"OPERATION RULE",rule:"Staff are selected by availability and workload so daily assignments remain balanced.",note:"The customer and management views follow the latest booking and wash status throughout the service.",ruleColor:C.cyan,ruleFill:C.cyanLight});

flowSlide({title:"Scenario 5: Combo, Promotion & Loyalty Flow",subtitle:"Connect promotional offers, combo benefits and membership rewards to completed car wash services.",accent:C.orange,steps:[
  {...P(0),icon:"🎁",label:"Browse Offers"},{...P(1),icon:"★",label:"Check Tier Eligibility"},{...P(2),icon:"▣",label:"Buy Combo or Apply Voucher"},{...P(3),icon:"💳",label:"Confirm Payment"},
  {...P(4),icon:"✓",label:"Activate the Benefit"},{...P(5),icon:"💧",label:"Complete an Eligible Service"},{...P(6),icon:"★",label:"Earn Points & Update Tier"},{...P(7),icon:"🎁",label:"Redeem Rewards"}],links:["Match the customer tier","Choose an eligible benefit","Complete the purchase","Make the offer available","Use the benefit","Add loyalty value","Continue the reward cycle"],ruleTitle:"LOYALTY RULE",rule:"Offers may require a membership tier, enough points or a successful purchase before they can be used.",note:"Completed services can add points, update the customer's tier and unlock future rewards.",ruleColor:C.orange,ruleFill:C.orangeLight});

flowSlide({title:"Scenario 6: Review, History & Customer Retention Flow",subtitle:"Capture feedback after service, reward participation and keep the customer's service journey accessible.",accent:C.green,steps:[
  {...P(0),icon:"✓",label:"Open a Completed Booking"},{...P(1),icon:"★",label:"Rate the Booking & Staff"},{...P(2),icon:"✎",label:"Add Comments"},{...P(3),icon:"▧",label:"Add Service Images"},
  {...P(4),icon:"✓",label:"Submit the Review"},{...P(5),icon:"+",label:"Receive Review Bonus"},{...P(6),icon:"◷",label:"View Booking History"},{...P(7),icon:"↻",label:"Return for the Next Service"}],links:["Share the service experience","Provide useful feedback","Add optional evidence","Validate the review","Reward participation","Keep service records","Support customer retention"],ruleTitle:"REVIEW RULE",rule:"Only a completed booking can be reviewed, and each booking receives no more than one customer review.",note:"Review details help identify the assigned staff and improve service quality over time.",ruleColor:C.green,ruleFill:C.greenLight});

flowSlide({title:"Scenario 7: Management & Reporting Flow",subtitle:"Give administrators one place to monitor operations, maintain business data and evaluate performance.",accent:C.purple,steps:[
  {...P(0),icon:"▥",label:"Open the Dashboard"},{...P(1),icon:"▤",label:"Manage Bookings"},{...P(2),icon:"👥",label:"Manage Accounts"},{...P(3),icon:"▣",label:"Manage Services & Packages"},
  {...P(4),icon:"🎁",label:"Manage Promotions & Tiers"},{...P(5),icon:"⚙",label:"Monitor Staff & Operations"},{...P(6),icon:"✦",label:"Review Feedback & Content"},{...P(7),icon:"▥",label:"View Reports & Performance"}],links:["Track the latest activity","Maintain customer records","Update the service catalog","Control customer offers","Coordinate daily work","Monitor service quality","Support business decisions"],ruleTitle:"MANAGEMENT VIEW",rule:"Reports summarize bookings, revenue, service progress, staff performance, customer tiers, promotions and reviews.",note:"Search and filters help administrators find records before reviewing or updating them.",ruleColor:C.purple,ruleFill:C.purpleLight});

await fs.mkdir(TMP,{recursive:true});
for(let i=0;i<deck.slides.count;i++){const rendered=await deck.export({slide:deck.slides.getItem(i),format:"png",scale:1});const path=`${TMP}/slide-${String(i+1).padStart(2,"0")}.png`;if(typeof rendered.save==="function")await rendered.save(path);else if(typeof rendered.arrayBuffer==="function")await fs.writeFile(path,Buffer.from(await rendered.arrayBuffer()));else await fs.writeFile(path,Buffer.from(rendered));}
await fs.writeFile(INSPECT,records.map(r=>JSON.stringify(r)).join("\n")+"\n","utf8");
const pptx=await PresentationFile.exportPptx(deck);await pptx.save(OUT);console.log(OUT);
