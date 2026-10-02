import React, { useEffect, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { RouteProp, useNavigation, useRoute, usePreventRemove } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { jsPDF } from "jspdf";
import { pickPropertyPhotos, propertyImageSource } from "@/lib/property-photos";
import { cacheRentalProperty, Condition, emptyRoom, getCachedRentalProperty, getDrafts, InspectionReport, InspectionReportDraft, InspectionRoomDraft, InspectionType, RentalProperty, rentalApi, replaceDraft, ROOM_DEFAULTS, saveDocument, saveDraft, formatDate, isISODate } from "@/lib/rentals";
import { api } from "@/lib/api";
import { Action, C, Field, warmCardShadow } from "@/components/rentals/RentalUI";
import { RentalsStackParamList } from "@/navigation/RentalsStackNavigator";

type Route=RouteProp<RentalsStackParamList,"InspectionReport">;
type Nav=NativeStackNavigationProp<RentalsStackParamList>;
const labels:Record<InspectionType,string>={move_in:"Move-in",routine:"Routine",move_out:"Move-out"};
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
const safeImage=(uri:string)=>/^data:image\/(?:jpeg|png);base64,[a-z0-9+/=\r\n]+$/i.test(uri)?uri:"";

export default function InspectionReportScreen(){
 const {params}=useRoute<Route>();const nav=useNavigation<Nav>();
 const [property,setProperty]=useState<RentalProperty|null>(null);
 const [report,setReport]=useState<InspectionReportDraft|null>(null);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const busyRef=useRef(false);const dirtyRef=useRef(false);const revisionRef=useRef(0);const autoSaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [roomModal,setRoomModal]=useState(false);const [roomName,setRoomName]=useState("");
 const [compareReport,setCompareReport]=useState<InspectionReport|null>(null);const [compare,setCompare]=useState(false);
 const [completeModal,setCompleteModal]=useState(false);
 const reportRef=useRef<InspectionReportDraft|null>(null);
 reportRef.current=report;
 useEffect(()=>{(async()=>{
  setLoading(true);
  try{
   const activeBusinessId=await api.loadBusinessId();
   let p:RentalProperty;
   try { p=await rentalApi.property(params.propertyId);if(activeBusinessId&&p.businessId!==activeBusinessId)throw new Error("This property is not in the active business.");await cacheRentalProperty(p); }
   catch(error) { if(!activeBusinessId)throw error;const cached=await getCachedRentalProperty(params.propertyId,activeBusinessId); if(!cached)throw error; p=cached; }
   setProperty(p);
    const drafts=await getDrafts(p.businessId);let found:InspectionReportDraft|InspectionReport|undefined;
   if(params.reportId) found=drafts.find(d=>d.id===params.reportId);
   let reports:InspectionReport[]=[];
   let reportsLoaded=true;
   try { reports=await rentalApi.inspections(params.propertyId); } catch { reportsLoaded=false; }
    if(params.reportId&&!found) found=reports.find(r=>r.id===params.reportId);
   if(params.reportId&&!found)throw new Error(reportsLoaded?"This inspection was not found in this property's saved reports.":"This report is not cached and the server could not be reached. Nothing was replaced.");
   if(!found){
    found={id:`local-${Date.now()}`,propertyId:p.id,businessId:p.businessId,type:params.type||"routine",date:params.date||new Date().toISOString().slice(0,10),rooms:[],status:"draft",createdAt:new Date().toISOString()};
   }
   const editorReport:InspectionReportDraft={...found,rooms:found.rooms?.length?found.rooms.map(room=>({...room,photos:room.photos||[],photoTimestamps:room.photos?.map((_,i)=>room.photoTimestamps?.[i]||"")||[],condition:room.condition||undefined})):ROOM_DEFAULTS.map(emptyRoom)};
   setReport(editorReport);
   if(editorReport.type==="move_out"){
    const comparisonReports=[...reports,...drafts.filter(d=>d.propertyId===p.id&&!reports.some(item=>item.id===d.id))];
    const baseline=comparisonReports.filter(r=>r.type==="move_in"&&r.status==="complete"&&r.date<=editorReport.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
    setCompareReport(baseline as InspectionReport||null);
   }
  }catch(e:any){setMessage(e.message||"Inspection could not be loaded.");}
  finally{setLoading(false);}
 })();},[params.propertyId,params.reportId,params.type,params.date]);
 const updateReport=(update:(current:InspectionReportDraft)=>InspectionReportDraft)=>{
  dirtyRef.current=true;revisionRef.current+=1;
  setReport(current=>current?update(current):current);
 };
 const createPayload=(draft:InspectionReportDraft):Partial<InspectionReport>=>{
  const {id:_id,businessId:_businessId,propertyId:_propertyId,createdAt:_createdAt,syncAttempted:_syncAttempted,scheduleAttempted:_scheduleAttempted,savedAt:_savedAt,...payload}=draft;
  return payload as Partial<InspectionReport>;
 };
 const changeRoom=(roomId:string,patch:Partial<InspectionRoomDraft>)=>updateReport(current=>({...current,rooms:current.rooms.map(r=>r.id===roomId?{...r,...patch}:r)}));
 useEffect(()=>{
  if(!report||!property||!dirtyRef.current)return;
  const revision=revisionRef.current;
  autoSaveTimer.current=setTimeout(async()=>{
   try{await saveDraft({...report,savedAt:new Date().toISOString()});if(revisionRef.current===revision){dirtyRef.current=false;setMessage("Edits saved on this device. Complete room conditions before syncing.");}}
   catch(e:any){if(revisionRef.current===revision)setMessage(`Local draft save failed. Your edits are still open: ${e.message||"device storage unavailable"}`);}
  },500);
  return()=>{if(autoSaveTimer.current)clearTimeout(autoSaveTimer.current);};
 },[report,property]);
 usePreventRemove(Boolean(report)&&dirtyRef.current,({data})=>{
   const latestReport=reportRef.current;
   if(!dirtyRef.current||!latestReport)return;
   saveDraft({...latestReport,savedAt:new Date().toISOString()}).then(()=>{
    dirtyRef.current=false;
    setMessage("Draft saved on this device.");
    nav.dispatch(data.action);
   }).catch((e:any)=>setMessage(`Couldn't save this draft before leaving. Stay here and retry: ${e.message||"device storage unavailable"}`));
 });
 const saveLocalAndSync=async(markComplete=false)=>{
  if(!report||!property||busyRef.current)return;
  if(!isISODate(report.date)){setMessage("Inspection date must use YYYY-MM-DD.");return;}
  busyRef.current=true;setBusy(true);setMessage("");
  if(autoSaveTimer.current)clearTimeout(autoSaveTimer.current);
  const incomplete=report.rooms.length===0||report.rooms.some(room=>!room.name.trim()||!room.condition);
  const timestamped:InspectionReportDraft={...report,status:incomplete?"draft":markComplete?"complete":report.status,savedAt:new Date().toISOString()};
  try{await saveDraft(timestamped);dirtyRef.current=false;setReport(timestamped);setMessage("Saved on this device. Checking report completeness…");}
  catch(e:any){setMessage(`Device save failed. The report was not sent: ${e.message||"storage unavailable"}`);busyRef.current=false;setBusy(false);return;}
  if(incomplete){
   dirtyRef.current=false;
    setMessage(markComplete?"Saved locally as an incomplete draft. Add at least one named room and choose a condition for each before marking it complete.":"Saved on this device as an incomplete draft. Keep every room named and choose good, fair or poor before syncing.");
   busyRef.current=false;setBusy(false);return;
  }
  try{
   let synced:InspectionReport;
   const syncable=timestamped as InspectionReport;
   if(syncable.id.startsWith("local-")){
    if(timestamped.syncAttempted||timestamped.scheduleAttempted){
     const remoteReports=await rentalApi.inspections(property.id);
     const roomFingerprint=(rooms:InspectionRoomDraft[])=>JSON.stringify(rooms.map(({name,photos,photoTimestamps,notes,condition})=>({name,photos,photoTimestamps,notes,condition})));
     const duplicate=remoteReports.find(remote=>remote.type===syncable.type&&remote.date===syncable.date&&roomFingerprint(remote.rooms)===roomFingerprint(syncable.rooms));
     const pendingSchedule=timestamped.scheduleAttempted?remoteReports.filter(remote=>remote.type===syncable.type&&remote.date===syncable.date&&remote.status==="draft"&&remote.rooms.length===0).sort((a,b)=>Math.abs(new Date(a.createdAt).getTime()-new Date(timestamped.createdAt).getTime())-Math.abs(new Date(b.createdAt).getTime()-new Date(timestamped.createdAt).getTime()))[0]:undefined;
     if(duplicate&&duplicate.status===syncable.status)synced=duplicate;
     else if(duplicate){
      const {syncAttempted:_attempted,scheduleAttempted:_scheduled,savedAt:_savedAt,...payload}=timestamped;
      synced=await rentalApi.updateInspection(duplicate.id,{...payload,id:duplicate.id} as InspectionReport);
     }
     else if(pendingSchedule){
      const {syncAttempted:_attempted,scheduleAttempted:_scheduled,savedAt:_savedAt,...payload}=timestamped;
      synced=await rentalApi.updateInspection(pendingSchedule.id,{...payload,id:pendingSchedule.id} as InspectionReport);
     }
     else{
      const attempted={...timestamped,syncAttempted:true};
      await saveDraft(attempted);
      synced=await rentalApi.createInspection(property.id,createPayload(attempted));
     }
    }else{
     const attempted={...timestamped,syncAttempted:true};
     await saveDraft(attempted);
     synced=await rentalApi.createInspection(property.id,createPayload(attempted));
    }
   }else{
    const {syncAttempted:_omitted,scheduleAttempted:_scheduled,savedAt:_savedAt,...payload}=timestamped;
    synced=await rentalApi.updateInspection(syncable.id,payload as InspectionReport);
   }
   setReport(synced);nav.setParams({reportId:synced.id});
   try{await replaceDraft(timestamped.id,synced);}catch(e:any){setMessage(`Report synced successfully, but the local copy could not be updated safely: ${e.message||"storage unavailable"}`);return;}
   setMessage("Report saved on this device and synced to your workspace.");
  }catch(e:any){setMessage(`Saved on this device, but not synced. It will stay here for retry. ${e.message||"Connection unavailable."}`);}
  finally{busyRef.current=false;setBusy(false);}
 };
 const addPhotos=async(room:InspectionRoomDraft,camera=false)=>{
  if(busyRef.current)return;
  const remaining=20-room.photos.length;if(remaining<=0){setMessage("A room can hold up to 20 photos.");return;}
  try{const result:{uri:string;timestamp:string}[]=await pickPropertyPhotos(remaining,camera);if(result.length)changeRoom(room.id,{photos:[...room.photos,...result.map((p)=>p.uri)].slice(0,20),photoTimestamps:[...room.photoTimestamps,...result.map((p)=>p.timestamp)].slice(0,20)});setMessage("");}
  catch(e:any){setMessage(e.message||"Photo selection was cancelled.");}
 };
 const removePhoto=(room:InspectionRoomDraft,index:number)=>changeRoom(room.id,{photos:room.photos.filter((_,i)=>i!==index),photoTimestamps:room.photoTimestamps.filter((_,i)=>i!==index)});
 const markComplete=()=>{if(!busyRef.current)setCompleteModal(true);};
 const reportHtml=()=>{
  const rooms=report?.rooms.map(room=>`<section><h2>${escapeHtml(room.name)} <small>${room.condition||"Condition not rated"}</small></h2><p>${escapeHtml(room.notes||"No notes")}</p><div class="grid">${room.photos.map((photo,i)=>{const src=safeImage(photo);return `<figure>${src?`<img src="${src}">`:"<div class='missing'>Evidence image unavailable</div>"}<figcaption>Added ${escapeHtml(room.photoTimestamps[i]||"time not recorded")}</figcaption></figure>`;}).join("")}</div></section>`).join("")||"";
  const propertyPhotos=property?.photos?.map((photo,i)=>{const src=safeImage(photo);return `<figure>${src?`<img src="${src}">`:"<div class='missing'>Evidence image unavailable</div>"}<figcaption>Property photo ${i+1}</figcaption></figure>`;}).join("")||"";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{font:15px -apple-system,BlinkMacSystemFont,sans-serif;color:#34281f;padding:28px;max-width:850px;margin:auto}h1{font-size:28px;margin:0 0 5px}h2{font-size:18px;margin:0}small{font-size:12px;color:#8c7b6b;font-weight:500}p{white-space:pre-wrap;line-height:1.5}.meta{color:#756557;border-bottom:1px solid #e8ddd0;padding:10px 0 18px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}figure{margin:0;break-inside:avoid;page-break-inside:avoid}.missing{height:140px;display:flex;align-items:center;justify-content:center;background:#f4eee6;color:#8c7b6b;font-size:11px}img{width:100%;height:170px;object-fit:cover;border-radius:8px}figcaption{font-size:10px;color:#6f6258;margin-top:4px}section{padding:20px 0;border-bottom:1px solid #e8ddd0} @media print{body{padding:0}}</style></head><body><h1>${escapeHtml(property?.address||"Rental property")}</h1><div class="meta">${escapeHtml(labels[report?.type||"routine"])} inspection · ${formatDate(report?.date)} · ${report?.status==="complete"?"Complete":"Draft"}<br>Tenant: ${escapeHtml(property?.tenantName||"Not listed")} · ${escapeHtml(property?.tenantEmail||"")} · ${escapeHtml(property?.tenantPhone||"")}<br>Move-in: ${formatDate(property?.moveInDate)} · Lease end: ${formatDate(property?.leaseEndDate)}<br>Created: ${formatDate(report?.createdAt)}<br>Property notes: ${escapeHtml(property?.notes||"None")}</div>${propertyPhotos?`<section><h2>Property photos</h2><div class="grid">${propertyPhotos}</div></section>`:""}${rooms}</body></html>`;
 };
 const generatePdf=async()=>{
  if(!report||!property||busyRef.current)return;busyRef.current=true;setBusy(true);setMessage("");
  let pdfCreated=false;
  try{
   let uri:string;
   if(Platform.OS==="web"){
    const doc=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
    const pageWidth=doc.internal.pageSize.getWidth();const pageHeight=doc.internal.pageSize.getHeight();const margin=42;const bottom=pageHeight-margin;const contentWidth=pageWidth-margin*2;let y=margin;
    const ensure=(height:number)=>{if(y+height>bottom){doc.addPage();y=margin;}};
    const text=(value:string,size:number=11,bold=false,color:string="#34281F")=>{
     doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);doc.setTextColor(color);
     const lines=doc.splitTextToSize(value||" ",contentWidth);const lineHeight=size*1.35;ensure(lines.length*lineHeight+4);doc.text(lines,margin,y);y+=lines.length*lineHeight+3;
    };
    const images=(photos:string[],timestamps:string[],prefix:string)=>{
     const cellGap=10;const cellWidth=(contentWidth-cellGap*2)/3;const imageHeight=110;const rowHeight=145;
     for(let index=0;index<photos.length;index+=3){
      ensure(rowHeight);
      for(let column=0;column<3&&index+column<photos.length;column++){
       const photoIndex=index+column;const source=safeImage(photos[photoIndex]);const x=margin+column*(cellWidth+cellGap);
        if(source){try{doc.addImage(source,source.startsWith("data:image/png")?"PNG":"JPEG",x,y,cellWidth,imageHeight,undefined,"FAST");}catch{doc.setFillColor(244,238,230);doc.rect(x,y,cellWidth,imageHeight,"F");doc.setFontSize(9);doc.text("Evidence image unavailable",x+6,y+imageHeight/2);}}
       else{doc.setFillColor(244,238,230);doc.rect(x,y,cellWidth,imageHeight,"F");doc.setFontSize(9);doc.text("Evidence image unavailable",x+6,y+imageHeight/2);}
        doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor("#65594F");doc.text(prefix==="Added "?`Added ${timestamps[photoIndex]||"time not recorded"}`:`${prefix}${timestamps[photoIndex]||`photo ${photoIndex+1}`}`,x,y+imageHeight+13,{maxWidth:cellWidth});
      }
      y+=rowHeight;
     }
    };
    text(property.address,22,true);
    text(`${labels[report.type]} inspection · ${formatDate(report.date)} · ${report.status==="complete"?"Complete":"Draft"}`,11,true,"#C17F3E");
    text(`Tenant: ${property.tenantName||"Not listed"} · ${property.tenantEmail||"—"} · ${property.tenantPhone||"—"}`);
    text(`Move-in: ${formatDate(property.moveInDate)} · Lease end: ${formatDate(property.leaseEndDate)} · Created: ${formatDate(report.createdAt)}`);
    text(`Property notes: ${property.notes||"None"}`);
    if(property.photos?.length){ensure(30);text("Property photos",15,true);images(property.photos,[],"Property photo ");}
    report.rooms.forEach(room=>{
     ensure(65);text(room.name,16,true);text(`Condition: ${room.condition||"Not rated"}`,10,true,"#8C7B6B");text(`Notes: ${room.notes||"None"}`);
     if(room.photos.length)images(room.photos,room.photoTimestamps,"Added ");
    });
    uri=doc.output("datauristring");
    const filename=`${labels[report.type].toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${report.date}.pdf`;
    doc.save(filename);
    pdfCreated=true;
   }else{
    const file=await Print.printToFileAsync({html:reportHtml()});
    const savedUri=FileSystem.documentDirectory?`${FileSystem.documentDirectory}rental-report-${report.id.replace(/[^a-z0-9-]/gi,"")}.pdf`:file.uri;
    if(savedUri!==file.uri)await FileSystem.copyAsync({from:file.uri,to:savedUri});
    uri=savedUri;
    pdfCreated=true;
    if(await Sharing.isAvailableAsync())await Sharing.shareAsync(savedUri,{mimeType:"application/pdf",dialogTitle:"Save inspection report"});
   }
   const metadata={id:`doc-${report.id}`,businessId:property.businessId,propertyId:property.id,reportId:report.id,uri,title:`${labels[report.type]} report · ${formatDate(report.date)}`,createdAt:new Date().toISOString()};
   try{await saveDocument(metadata);setMessage("PDF generated, downloaded and saved in this property's Documents.");}
   catch(e:any){setMessage(`PDF was generated, but its local Documents entry was not saved: ${e.message||"local storage unavailable"}`);}
  }catch(e:any){setMessage(pdfCreated?`PDF was generated, but could not finish saving its record: ${e.message||"Please try again."}`:`PDF could not be generated. ${e.message||"Please try again."}`);}
  finally{busyRef.current=false;setBusy(false);}
 };
 const retrySync=()=>saveLocalAndSync(report?.status==="complete");
 if(loading)return <View style={s.center}><View style={s.skeleton}/><View style={s.skeleton}/></View>;
 if(!report||!property)return <View style={s.center}><Text style={s.error}>{message||"Inspection is unavailable."}</Text><Action label="Back to property" icon="arrow-left" onPress={()=>nav.goBack()}/></View>;
 const baseline=compareReport;
  return <View style={s.page}><ScrollView pointerEvents={busy?"none":"auto"} contentContainerStyle={s.content}>
  <View style={s.headingRow}><View style={{flex:1}}><Text style={s.eyebrow}>{labels[report.type].toUpperCase()} INSPECTION</Text><Text style={s.title}>{property.address}</Text><Text style={s.subtitle}>{formatDate(report.date)} · {property.tenantName||"No tenant listed"}</Text></View><View style={[s.statusPill,report.status==="complete"?s.done:s.draft]}><Text style={{color:report.status==="complete"?C.green:C.amber,fontWeight:"800",fontSize:11}}>{report.status==="complete"?"COMPLETE":"DRAFT"}</Text></View></View>
  {report.type==="move_out"&&<Pressable onPress={()=>setCompare(true)} style={s.compareBanner}><Feather name="columns" size={18} color={C.amber}/><View style={{flex:1}}><Text style={s.cardTitle}>Compare with move-in</Text><Text style={s.muted}>{baseline?`Baseline from ${formatDate(baseline.date)}`:"No completed move-in baseline"}</Text></View><Feather name="chevron-right" size={18} color={C.amber}/></Pressable>}
  {!!message&&<View style={s.message}><Feather name={message.includes("not synced")||message.includes("failed")?"alert-circle":"check-circle"} size={16} color={message.includes("not synced")||message.includes("failed")?C.amber:C.green}/><Text style={s.messageText}>{message}</Text>{message.includes("not synced")&&<Pressable onPress={retrySync}><Text style={s.retry}>Retry</Text></Pressable>}</View>}
  <View style={s.roomsHeader}><View><Text style={s.sectionTitle}>Rooms & evidence</Text><Text style={s.muted}>Add photos · up to 20 for each room</Text></View><Pressable style={s.addRoom} onPress={()=>{setRoomName("");setRoomModal(true);}}><Feather name="plus" size={15} color={C.amber}/><Text style={s.addRoomText}>Add room</Text></Pressable></View>
  {report.rooms.map((room,roomIndex)=><View style={[s.roomCard,warmCardShadow]} key={room.id}><View style={s.roomTitleRow}><View style={s.roomNumber}><Text style={s.roomNumberText}>{String(roomIndex+1).padStart(2,"0")}</Text></View><TextInput value={room.name} onChangeText={name=>changeRoom(room.id,{name})} style={s.roomNameInput} accessibilityLabel="Edit room name"/><Pressable accessibilityLabel={`Remove ${room.name}`} onPress={()=>updateReport(current=>({...current,rooms:current.rooms.filter(r=>r.id!==room.id)}))}><Feather name="trash-2" size={16} color={C.red}/></Pressable></View>
   <View style={s.conditions}>{(["good","fair","poor"] as Condition[]).map(value=>{const color=value==="good"?C.green:value==="fair"?C.amber:C.red;const selected=room.condition===value;return <Pressable key={value} onPress={()=>changeRoom(room.id,{condition:value})} style={[s.condition,selected&&{backgroundColor:color,borderColor:color}]}><Text style={{color:selected?"#fff":C.muted,fontSize:12,fontWeight:"700"}}>{value[0].toUpperCase()+value.slice(1)}</Text></Pressable>})}</View>
   <TextInput multiline value={room.notes} onChangeText={notes=>changeRoom(room.id,{notes})} placeholder="Describe condition, wear, or follow-up…" placeholderTextColor="#AA9B8D" style={s.notesInput}/>
   <View style={s.photoTools}><Text style={s.photoCount}>{room.photos.length} / 20 photos</Text><View style={s.photoBtns}><Pressable style={s.photoBtn} onPress={()=>addPhotos(room)}><Feather name="image" size={14} color={C.amber}/><Text style={s.photoBtnText}>Add photos</Text></Pressable><Pressable style={s.photoBtn} onPress={()=>addPhotos(room,true)}><Feather name="camera" size={14} color={C.amber}/><Text style={s.photoBtnText}>Take photo</Text></Pressable></View></View>
   <View style={s.grid}>{room.photos.map((photo,i)=><View key={`${room.id}-${i}`} style={s.photoCell}><Image source={propertyImageSource(photo)} style={s.photo}/><Pressable style={s.remove} onPress={()=>removePhoto(room,i)}><Feather name="x" size={13} color="#fff"/></Pressable><Text style={s.timestamp} numberOfLines={1}>Added {room.photoTimestamps[i]||"time not recorded"}</Text></View>)}{room.photos.length===0&&<View style={s.photoEmpty}><Feather name="camera" size={20} color="#B7A797"/><Text style={s.photoEmptyText}>Add visual evidence for this room</Text></View>}</View>
  </View>)}
  <View style={s.footer}>
   <Action label={busy?"Saving…":"Save Report"} icon="save" onPress={()=>saveLocalAndSync(false)} disabled={busy}/>
   <Action label="Generate PDF Report" icon="file-text" onPress={generatePdf} secondary disabled={busy}/>
   {report.type==="move_out"&&<Action label="Compare with Move-In" icon="columns" onPress={()=>setCompare(true)} secondary/>}
   <Action label={report.status==="complete"?"Inspection complete":"Mark complete"} icon="check-circle" onPress={markComplete} disabled={busy||report.status==="complete"}/>
   <Text style={s.footerNote}>Your evidence is auto-saved locally while you work.</Text>
  </View>
 </ScrollView>
 <Modal visible={roomModal} transparent animationType="fade" onRequestClose={()=>setRoomModal(false)}><View style={s.shade}><View style={s.dialog}><Text style={s.dialogTitle}>Add a room</Text><Field label="ROOM NAME" autoFocus placeholder="e.g. Laundry" value={roomName} onChangeText={setRoomName}/><View style={s.actions}><Action label="Cancel" secondary onPress={()=>setRoomModal(false)}/><Action label="Add room" icon="plus" onPress={()=>{if(roomName.trim()){updateReport(current=>({...current,rooms:[...current.rooms,emptyRoom(roomName.trim())]}));setRoomModal(false);}}}/></View></View></View></Modal>
  <Modal visible={completeModal} transparent animationType="fade" onRequestClose={()=>setCompleteModal(false)}><View style={s.shade}><View style={s.dialog}><Text style={s.dialogTitle}>Complete this inspection?</Text><Text style={s.muted}>Your local draft is saved first. A named room and good, fair or poor rating are required for every room before it can sync as complete.</Text><View style={[s.actions,{marginTop:18}]}><Action label="Keep as draft" secondary onPress={()=>setCompleteModal(false)}/><Action label={busy?"Saving…":"Mark complete"} icon="check" disabled={busy} onPress={()=>{setCompleteModal(false);saveLocalAndSync(true);}}/></View></View></View></Modal>
 <Modal visible={compare} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setCompare(false)}><ScrollView contentContainerStyle={s.compareModal}><View style={s.modalHead}><View><Text style={s.eyebrow}>MOVE-IN BASELINE</Text><Text style={s.sectionTitle}>Condition comparison</Text></View><Pressable onPress={()=>setCompare(false)}><Feather name="x" size={22} color={C.ink}/></Pressable></View>
  {!baseline?<View style={s.photoEmpty}><Feather name="columns" size={25} color={C.amber}/><Text style={s.roomTitle}>No move-in baseline</Text><Text style={s.muted}>A completed move-in report for this property is needed to compare condition.</Text></View>:report.rooms.map(room=>{const previous=baseline.rooms.find(item=>item.name===room.name);return <View key={room.id} style={s.roomCard}><Text style={s.roomTitle}>{room.name}</Text><View style={s.compareColumns}>{[{title:`MOVE-IN · ${previous?.condition||"—"}`,data:previous},{title:`MOVE-OUT · ${room.condition||"—"}`,data:room}].map((column,index)=><View key={index} style={{flex:1}}><Text style={s.photoCount}>{column.title}</Text><View style={s.grid}>{(column.data?.photos||[]).slice(0,4).map((photo,i)=><Image key={i} source={propertyImageSource(photo)} style={s.comparePhoto}/>)}</View><Text style={s.muted}>{column.data?.notes||"No notes recorded"}</Text></View>)}</View></View>})}
 </ScrollView></Modal>
 </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg},content:{padding:17,paddingBottom:100,maxWidth:900,width:"100%",alignSelf:"center"},headingRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:18},eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.4,color:C.amber},title:{fontSize:22,fontWeight:"800",color:C.ink,marginTop:5},subtitle:{fontSize:13,color:C.muted,marginTop:4},statusPill:{paddingHorizontal:10,paddingVertical:7,borderRadius:15},done:{backgroundColor:"#E9F1E9"},draft:{backgroundColor:"#F8EFE3"},actions:{flexDirection:"row",gap:9},compareBanner:{flexDirection:"row",alignItems:"center",gap:12,padding:14,borderRadius:15,borderColor:C.border,borderWidth:1,backgroundColor:"#fff",marginBottom:14},cardTitle:{fontSize:14,fontWeight:"800",color:C.ink},muted:{color:C.muted,fontSize:12,marginTop:4},message:{flexDirection:"row",alignItems:"flex-start",gap:8,padding:12,borderRadius:12,backgroundColor:"#F5EFE7",marginTop:12},messageText:{flex:1,color:C.ink,fontSize:12,lineHeight:18},retry:{color:C.amber,fontWeight:"800",fontSize:12},roomsHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:25,marginBottom:13},sectionTitle:{fontSize:18,fontWeight:"800",color:C.ink},addRoom:{flexDirection:"row",gap:5,alignItems:"center",paddingVertical:9,paddingHorizontal:11,borderRadius:11,backgroundColor:"#F5EBDD"},addRoomText:{fontSize:12,fontWeight:"800",color:C.amber},roomCard:{backgroundColor:"#fff",borderWidth:1,borderColor:C.border,borderRadius:17,padding:14,marginBottom:13},roomTitleRow:{flexDirection:"row",alignItems:"center",gap:10},roomNumber:{width:32,height:32,borderRadius:10,backgroundColor:"#F7EFE5",alignItems:"center",justifyContent:"center"},roomNumberText:{fontSize:10,color:C.amber,fontWeight:"800"},roomTitle:{fontSize:16,fontWeight:"800",color:C.ink,flex:1},roomNameInput:{flex:1,fontSize:16,fontWeight:"800",color:C.ink,paddingVertical:5},conditions:{flexDirection:"row",gap:8,marginVertical:12},condition:{borderWidth:1,borderColor:C.border,borderRadius:18,paddingVertical:7,paddingHorizontal:13},notesInput:{minHeight:72,borderWidth:1,borderColor:C.border,borderRadius:12,padding:11,color:C.ink,fontSize:13,textAlignVertical:"top",backgroundColor:"#FFFEFC"},photoTools:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:13,marginBottom:9},photoCount:{fontSize:11,color:C.muted,fontWeight:"700"},photoBtns:{flexDirection:"row",gap:7},photoBtn:{flexDirection:"row",gap:5,alignItems:"center",paddingVertical:7,paddingHorizontal:10,borderRadius:9,backgroundColor:"#F8EFE4"},photoBtnText:{fontSize:11,color:C.amber,fontWeight:"800"},grid:{flexDirection:"row",flexWrap:"wrap",gap:8},photoCell:{width:"31.7%",aspectRatio:1,borderRadius:12,overflow:"hidden",backgroundColor:"#F3EEE8"},photo:{width:"100%",height:"100%"},remove:{position:"absolute",right:6,top:6,width:23,height:23,borderRadius:12,backgroundColor:"#35281FCC",alignItems:"center",justifyContent:"center"},timestamp:{position:"absolute",bottom:0,left:0,right:0,paddingHorizontal:5,paddingVertical:4,backgroundColor:"#0009",color:"#fff",fontSize:8},photoEmpty:{height:105,borderWidth:1,borderColor:C.border,borderStyle:"dashed",borderRadius:12,backgroundColor:"#FAF8F5",alignItems:"center",justifyContent:"center",gap:6},photoEmptyText:{color:C.muted,fontSize:11},footer:{marginTop:9},footerNote:{fontSize:11,color:C.muted,textAlign:"center",marginTop:10},center:{flex:1,backgroundColor:C.bg,justifyContent:"center",alignItems:"center",gap:14,padding:20},skeleton:{height:140,width:"90%",borderRadius:16,backgroundColor:"#EEE6DD"},error:{color:C.red},shade:{flex:1,backgroundColor:"#34281F88",alignItems:"center",justifyContent:"center",padding:20},dialog:{width:"100%",maxWidth:440,padding:20,borderRadius:18,backgroundColor:C.bg},dialogTitle:{fontSize:20,fontWeight:"800",color:C.ink,marginBottom:18},compareModal:{padding:19,paddingBottom:50,backgroundColor:C.bg},modalHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:17},compareColumns:{flexDirection:"row",gap:12,marginTop:12},comparePhoto:{width:64,height:64,borderRadius:8}
});