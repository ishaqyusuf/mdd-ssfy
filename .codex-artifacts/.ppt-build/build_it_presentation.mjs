import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SKILL_DIR = "/Users/M1PRO/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.11814/skills/presentations";
const workspaceDir = "/Users/M1PRO/Documents/code/_turbo/gnd";
const TMP_DIR = path.join(workspaceDir, ".ppt-build");
const FINAL_PPTX = path.join(workspaceDir, ".codex-artifacts", "output", "Malik_Damilola_Mistura_Industrial_Training_Presentation_v3.pptx");
const RUNTIME_PYTHON = "/Users/M1PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const { resolvePresentationFont, applyPresentationChartFont, makeNativeBulletParagraphs, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href,
);

await fs.mkdir(TMP_DIR, { recursive: true });
const family = resolvePresentationFont({ fontFamily: "Aptos" });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = {
  paper: "#F5F1E8", ink: "#18232B", navy: "#17384E", teal: "#317576",
  gold: "#C38A3B", pale: "#E5ECEB", white: "#FFFFFF", muted: "#53616A", red: "#9D5148",
};

function box(slide, text, position, { size=28, color=C.ink, bold=false, fill="none", align="left", valign="top", name, italic=false }={}) {
  const s = slide.shapes.add({ geometry: "textbox", name, position, fill, line: { fill: "none", width: 0 } });
  s.text = text;
  s.text.style = { typeface: family, fontSize: size, color, bold, italic, alignment: align, verticalAlignment: valign, autoFit: "none" };
  return s;
}
function title(slide, text, number) {
  box(slide, text, { left: 72, top: 48, width: 1040, height: 64 }, { size: 38, bold: true, color: C.navy });
  box(slide, String(number).padStart(2,"0"), { left: 1142, top: 50, width: 70, height: 42 }, { size: 18, bold: true, color: C.gold, align: "right" });
}
function footer(slide) {
  box(slide, "MALIK DAMILOLA MISTURA   UNIVERSITY OF ABUJA", { left: 72, top: 672, width: 800, height: 22 }, { size: 10, bold: true, color: C.muted });
}
function bullets(slide, items, position, opts={}) {
  const s = slide.shapes.add({ geometry: "textbox", position, fill: "none", line: { fill: "none", width: 0 } });
  s.text = makeNativeBulletParagraphs(items, { marginLeftPoints: 20, hangingPoints: 10, spaceAfterPoints: opts.spaceAfter ?? 14 });
  s.text.style = { typeface: family, fontSize: opts.size ?? 25, color: opts.color ?? C.ink, autoFit: "none" };
  return s;
}
// 1 Cover
{
  const s = p.slides.add(); s.background.fill = C.navy;
  box(s, "INDUSTRIAL TRAINING", { left: 92, top: 92, width: 800, height: 52 }, { size: 18, bold: true, color: C.gold });
  box(s, "Property practice in a professional setting", { left: 92, top: 175, width: 1040, height: 150 }, { size: 55, bold: true, color: C.white });
  box(s, "Malik Damilola Mistura", { left: 92, top: 420, width: 700, height: 48 }, { size: 29, bold: true, color: C.white });
  box(s, "400 Level Estate Management\nUniversity of Abuja", { left: 92, top: 482, width: 700, height: 72 }, { size: 22, color: C.pale });
  box(s, "Lanre Hassan and Company   30 March to 11 September 2026", { left: 92, top: 620, width: 1040, height: 35 }, { size: 18, color: C.gold });
  s.speakerNotes.textFrame.setText("Good day. My name is Malik Damilola Mistura, a 400-level student of Estate Management at the University of Abuja. This presentation summarizes the Industrial Training I completed at Lanre Hassan and Company, Estate Surveyors and Valuers, from 30 March to 11 September 2026.");
}

// 2 Purpose
{
  const s=p.slides.add(); s.background.fill=C.paper; title(s,"Purpose and scope of SIWES",2);
  box(s,"SIWES connected classroom principles with the judgement required in real property work.",{left:72,top:150,width:1080,height:120},{size:38,bold:true,color:C.ink});
  const ys=[340,430,520]; const nums=["01","02","03"]; const heads=["Supervised experience","Professional exposure","Practical judgement"];
  const copy=["Learning within an active real estate firm","Property management, agency and valuation","Working with field conditions and incomplete information"];
  for(let i=0;i<3;i++){ box(s,nums[i],{left:80,top:ys[i],width:70,height:40},{size:22,bold:true,color:C.gold}); box(s,heads[i],{left:170,top:ys[i]-2,width:360,height:40},{size:25,bold:true,color:C.navy}); box(s,copy[i],{left:550,top:ys[i],width:640,height:42},{size:21,color:C.muted}); }
  footer(s); s.speakerNotes.textFrame.setText("SIWES gave me supervised experience in a professional real estate environment and helped me connect classroom principles with actual assignments. My training covered property and facility management, estate agency, and valuation. Practical work often involves incomplete information, field conditions, client needs, and professional judgement.");
}

// 3 Organisation
{
  const s=p.slides.add(); s.background.fill=C.white; title(s,"Lanre Hassan and Company",3);
  box(s,"Estate Surveyors and Valuers",{left:72,top:145,width:900,height:50},{size:28,bold:true,color:C.teal});
  const services=[["Estate agency","Sale, letting, acquisition and market advice"],["Property and facility management","Administration, inspection, maintenance and rent matters"],["Property valuation","Professional opinions of value for defined purposes"],["Property development","Planning and coordination of real estate projects"]];
  for(let i=0;i<4;i++){const x=72+(i%2)*580,y=235+Math.floor(i/2)*145;box(s,services[i][0],{left:x,top:y,width:500,height:42},{size:26,bold:true,color:C.navy});box(s,services[i][1],{left:x,top:y+50,width:500,height:58},{size:20,color:C.muted});}
  box(s,"21 Oga Road, Abuja   Close to the Central Bank of Nigeria area",{left:72,top:565,width:1080,height:40},{size:21,color:C.teal,bold:true});
  footer(s); s.speakerNotes.textFrame.setText("Lanre Hassan and Company provides estate agency, property and facility management, valuation, and property development services. It is located at 21 Oga Road, Abuja, close to the Central Bank of Nigeria area. The firm supports property owners, occupiers, and other clients who need professional real estate advice.");
}

// 4 Rotations
{
  const s=p.slides.add(); s.background.fill=C.paper; title(s,"Training rotations",4);
  box(s,"Twenty weeks across three professional units",{left:72,top:125,width:800,height:50},{size:26,color:C.teal,bold:true});
  const chart=s.charts.add("bar",{position:{left:82,top:205,width:760,height:365},categories:["Property and Facility Management","Estate Agency","Valuation"],series:[{name:"Weeks",values:[12,4,4],fill:C.teal}],barOptions:{direction:"bar",grouping:"clustered"},hasLegend:false,dataLabels:{showValue:true,position:"outEnd",textStyle:{fontSize:18,bold:true,color:C.navy}},xAxis:{minimumScale:0,maximumScale:14,majorUnit:2,textStyle:{fontSize:14,color:C.muted}},yAxis:{textStyle:{fontSize:17,color:C.ink}}});
  applyPresentationChartFont(chart,{fontFamily:family});
  box(s,"12",{left:930,top:245,width:160,height:70},{size:56,bold:true,color:C.gold,align:"center"});
  box(s,"weeks in the main rotation",{left:900,top:320,width:220,height:60},{size:19,color:C.muted,align:"center"});
  box(s,"The sequence moved from continuing property responsibility to market work and then valuation analysis.",{left:885,top:430,width:280,height:120},{size:22,bold:true,color:C.navy,align:"center"});
  footer(s); s.speakerNotes.textFrame.setText("I spent twelve weeks in Property and Facility Management, four weeks in Estate Agency, and four weeks in Valuation. The sequence moved from continuing property responsibility to market-facing work and then to structured valuation analysis.");
}

// 5 Property management
{
  const s=p.slides.add(); s.background.fill=C.white; title(s,"Property and Facility Management",5);
  box(s,"The property manager maintains an informed, continuing view of each asset.",{left:72,top:150,width:1060,height:100},{size:38,bold:true,color:C.navy});
  const acts=[["INSPECT","Observe condition, occupation and visible defects"],["RECORD","Document maintenance and repair needs clearly"],["COMMUNICATE","Report findings to the appropriate parties"],["FOLLOW UP","Track action and arrange work according to urgency"]];
  for(let i=0;i<4;i++){const x=72+(i%2)*580,y=315+Math.floor(i/2)*140;box(s,acts[i][0],{left:x,top:y,width:160,height:38},{size:17,bold:true,color:C.gold});box(s,acts[i][1],{left:x,top:y+42,width:500,height:65},{size:23,bold:true,color:C.ink});}
  footer(s); s.speakerNotes.textFrame.setText("I learned how professionals manage and inspect properties on behalf of clients. I observed maintenance and repair needs, recorded findings, followed up on assigned matters, and improved my time management. I can explain a simple example without revealing confidential property information.");
}

// 6 Estate Agency
{
  const s=p.slides.add(); s.background.fill=C.paper; title(s,"Estate Agency",6);
  box(s,"Agency work begins with an accurate understanding of the property and the client's objective.",{left:72,top:145,width:700,height:135},{size:35,bold:true,color:C.navy});
  bullets(s,["Sales and letting","Rent collection","Property inspection","Market survey and comparison"],{left:72,top:330,width:1080,height:255},{size:30,spaceAfter:16});
  footer(s); s.speakerNotes.textFrame.setText("The agency rotation covered property sales, letting, rent collection, and market surveys. I learned to understand the client's instruction, obtain accurate property details, inspect the property, and compare relevant market evidence. Professional agency work requires accurate information and clear communication, not only advertising.");
}

// 7 Valuation
{
  const s=p.slides.add(); s.background.fill=C.white; title(s,"Valuation workflow",7);
  box(s,"A defined purpose guides the evidence, method and report",{left:72,top:125,width:1000,height:55},{size:27,bold:true,color:C.teal});
  const stages=["Brief collection","Property inspection","Market survey","Method selection","Analysis","Valuation report"];
  for(let i=0;i<6;i++){
    const col=i<3?0:1, row=i%3; const x=72+col*590, y=220+row*120;
    box(s,String(i+1).padStart(2,"0"),{left:x,top:y,width:62,height:40},{size:22,bold:true,color:C.gold});
    box(s,stages[i],{left:x+78,top:y-4,width:430,height:48},{size:27,bold:true,color:C.navy});
    const desc=["Understand the instruction and purpose","Observe physical and locational details","Gather relevant comparable evidence","Choose an appropriate valuation approach","Review evidence and apply judgement","Present the basis, analysis and conclusion"][i];
    box(s,desc,{left:x+78,top:y+44,width:430,height:42},{size:18,color:C.muted});
  }
  box(s,"Common purposes include sale, mortgage, acquisition and compensation.",{left:72,top:610,width:1110,height:34},{size:19,color:C.ink,italic:true});
  footer(s); s.speakerNotes.textFrame.setText("The valuation process starts with collecting and understanding the client's brief. It continues through property inspection, market survey, method selection, analysis, and preparation of the valuation report. The valuation purpose, such as sale, mortgage, acquisition, or compensation, influences the scope of work. Inspection evidence, market evidence, and professional judgement must remain distinct.");
}

// 8 Skills
{
  const s=p.slides.add(); s.background.fill=C.navy;
  box(s,"Knowledge and skills acquired",{left:72,top:48,width:1040,height:64},{size:38,bold:true,color:C.white});
  box(s,"08",{left:1142,top:50,width:70,height:42},{size:18,bold:true,color:C.gold,align:"right"});
  // override title/footer contrast
  box(s,"TECHNICAL",{left:72,top:155,width:500,height:40},{size:17,bold:true,color:C.gold});
  box(s,"Property inspection\nMarket survey\nValuation process\nProfessional reporting",{left:72,top:215,width:500,height:280},{size:34,bold:true,color:C.white});
  box(s,"PROFESSIONAL",{left:685,top:155,width:500,height:40},{size:17,bold:true,color:C.gold});
  box(s,"Communication\nProblem solving\nTime management\nResponsible judgement",{left:685,top:215,width:500,height:280},{size:34,bold:true,color:C.white});
  box(s,"Theory provided the foundation. Field experience developed the judgement to apply it.",{left:72,top:575,width:1090,height:54},{size:25,color:C.pale,align:"center"});
  box(s,"MALIK DAMILOLA MISTURA   UNIVERSITY OF ABUJA",{left:72,top:672,width:800,height:22},{size:10,bold:true,color:C.pale});
  s.speakerNotes.textFrame.setText("The training strengthened my property inspection, market survey, valuation, and professional reporting knowledge. It also improved my communication, problem-solving, and time-management skills. These abilities support my future responsibility as an Estate Surveyor and Valuer.");
}

// 9 Challenges
{
  const s=p.slides.add(); s.background.fill=C.paper; title(s,"Challenges and responses",9);
  const rows=[
    ["Theory and field practice","Asked for explanations and clarification"],
    ["Transportation costs","Planned movement and budget carefully"],
    ["Limited property information","Used authorized sources and avoided unsupported assumptions"],
  ];
  for(let i=0;i<3;i++){ const y=165+i*145; box(s,rows[i][0],{left:72,top:y,width:360,height:70},{size:27,bold:true,color:C.red}); box(s,rows[i][1],{left:465,top:y,width:700,height:85},{size:25,color:C.navy}); }
  box(s,"Accuracy and confidentiality remained essential",{left:72,top:600,width:1050,height:40},{size:25,bold:true,color:C.teal});
  footer(s); s.speakerNotes.textFrame.setText("I encountered differences between classroom procedures and field practice, transportation costs, and difficulty accessing some property information. I responded by asking for guidance, planning my movements and budget, and relying only on authorized information. These challenges reinforced accuracy and confidentiality.");
}

// 10 Recommendations
{
  const s=p.slides.add(); s.background.fill=C.white; title(s,"Recommendations",10);
  const heads=["University","Training organizations","Institutions","Future students"];
  const copy=["Give clear pre-training guidance and support meaningful placements.","Provide supervised practical exposure and regular feedback.","Consider a stipend or transport allowance for compulsory training.","Keep records, ask relevant questions and respect confidentiality."];
  for(let i=0;i<4;i++){const y=150+i*118; box(s,String(i+1).padStart(2,"0"),{left:72,top:y,width:64,height:42},{size:21,bold:true,color:C.gold}); box(s,heads[i],{left:155,top:y-5,width:320,height:50},{size:27,bold:true,color:C.navy}); box(s,copy[i],{left:500,top:y,width:680,height:65},{size:23,color:C.ink});}
  box(s,"These recommendations focus on stronger preparation, supervision and access to practical learning.",{left:72,top:620,width:1100,height:36},{size:20,color:C.teal,italic:true});
  footer(s); s.speakerNotes.textFrame.setText("The University should give clear pre-training guidance and continue supporting meaningful placements. Training firms should provide supervised practical exposure and regular feedback. Relevant institutions should consider transport support. Students should keep records, ask questions, and respect confidentiality.");
}

// 11 Conclusion
{
  const s=p.slides.add(); s.background.fill=C.paper; title(s,"Conclusion",11);
  box(s,"The training broadened my understanding of Estate Management and increased my confidence in professional practice.",{left:115,top:170,width:1050,height:150},{size:42,bold:true,color:C.navy,align:"center"});
  box(s,"I gained practical exposure to property and facility management, estate agency and valuation. I did not rotate through Property Development following the demise of ESV Lanre Hassan.",{left:190,top:370,width:900,height:115},{size:24,color:C.muted,align:"center"});
  box(s,"Thank you",{left:390,top:545,width:500,height:60},{size:35,bold:true,color:C.teal,align:"center"});
  box(s,"Questions and discussion",{left:390,top:610,width:500,height:32},{size:19,color:C.ink,align:"center"});
  footer(s); s.speakerNotes.textFrame.setText("The training gave me practical exposure to major areas of Estate Management and strengthened the link between theory and professional practice. Although I did not rotate through Property Development following the demise of ESV Lanre Hassan, the other rotations broadened my knowledge and confidence. Thank the audience and invite questions.");
}

const requirements={explicitTotalSlideCount:11,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[4],materializeLiteralChartWorkbooks:true};
const fontPolicy={basis:"design",families:[family]};
const stagingDir=path.join(workspaceDir,".codex-finalizer");
await fs.mkdir(stagingDir,{recursive:true});
await fs.mkdir(path.dirname(FINAL_PPTX),{recursive:true});
const candidatePath=path.join(stagingDir,"candidate-it-presentation.pptx");
await (await PresentationFile.exportPptx(p)).save(candidatePath);
const result=await finalizePresentation({
  ...requirements,workspaceDir,candidatePath,finalPath:FINAL_PPTX,pythonExecutable:RUNTIME_PYTHON,
  integrityValidatorPath:path.join(SKILL_DIR,"container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath:path.join(SKILL_DIR,"container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs:["--expected-slide-size-emu","12192000,6858000","--validate-bullet-geometry","--validate-heading-fit"],
  requiredNativeTableOwnerSlides:[],fontPolicy,verifyArtifactToolImport:true,
  receiptPath:path.join(stagingDir,"Malik_Damilola_Mistura_Industrial_Training_Presentation_v3.validation.json"),
});
console.log(JSON.stringify({final:FINAL_PPTX,result},null,2));
