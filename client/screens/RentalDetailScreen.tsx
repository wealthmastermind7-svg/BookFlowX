import React, { useCallback, useRef, useState } from "react";
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "@/lib/api";
import { pickPropertyPhotos, propertyImageSource } from "@/lib/property-photos";
import { cacheRentalProperty, getCachedRentalProperty, getDocuments, getDrafts, InspectionReport, InspectionReportDraft, InspectionType, RentalProperty, rentalApi, SavedDocument, saveDraft, formatDate, isISODate } from "@/lib/rentals";
import { Action, C, Field, SectionTitle, styles as ui } from "@/components/rentals/RentalUI";
import { RentalsStackParamList } from "@/navigation/RentalsStackNavigator";

type Route=RouteProp<RentalsStackParamList,"RentalDetail">;
type Nav=NativeStackNavigationProp<RentalsStackParamList>;
const typeLabel:Record<InspectionType,string>={move_in:"Move-in",routine:"Routine",move_out:"Move-out"};

export default function RentalDetailScreen(){
 const {params}=useRoute<Route>(); const nav=useNavigation<Nav>();
 const [property,setProperty]=useState<RentalProperty|null>(null);
 const [reports,setReports]=useState<InspectionReportDraft[]>([]);
 const [documents,setDocuments]=useState<SavedDocument[]>([]);
 const [selectedEvidence,setSelectedEvidence]=useState<{uri:string;timestamp:string;title:string}|null>(null);
 const [tab,setTab]=useState<"Overview"|"Inspections"|"Documents">("Overview");
 const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const [edit,setEdit]=useState(false); const [schedule,setSchedule]=useState(false); const [compare,setCompare]=useState(false);
 const scheduleBusyRef=useRef(false);
 const [scheduleBusy,setScheduleBusy]=useState(false);
 const [form,setForm]=useState<Partial<RentalProperty>>({});
 const [scheduleDate,setScheduleDate]=useState(new Date().toISOString().slice(0,10));
 const [scheduleType,setScheduleType]=useState<InspectionType>("routine");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   let p:RentalProperty;
   const activeBusinessId=await api.loadBusinessId();
   try{p=await rentalApi.property(params.propertyId);if(activeBusinessId&&p.businessId!==activeBusinessId)throw new Error("This property is not part of the active business.");await cacheRentalProperty(p);}
   catch(error){if(!activeBusinessId)throw error;const cached=await getCachedRentalProperty(params.propertyId,activeBusinessId);if(!cached)throw error;p=cached;setError("Offline mode · showing saved property details and inspection evidence.");}
   const [docs,drafts]=await Promise.all([getDocuments(p.businessId),getDrafts(p.businessId)]);
   let r:InspectionReport[]=[];
   try{r=await rentalApi.inspections(params.propertyId);}catch{setError("Offline mode · showing saved inspection evidence.");}
   const propertyDrafts=drafts.filter(d=>d.propertyId===params.propertyId);
   const merged=r.map(remote=>{
    const local=propertyDrafts.find(d=>d.id===remote.id&&d.savedAt);
    return local||remote;
   });
   setProperty(p);setForm(p);setReports([...merged,...propertyDrafts.filter(d=>!r.some(item=>item.id===d.id))]);setDocuments(docs.filter(d=>d.propertyId===params.propertyId));
  }
  catch(e:any){setError(e.message||"Could not load property.");}
  finally{setLoading(false);}
 },[params.propertyId]);
 useFocusEffect(useCallback(()=>{load();},[load]));
 const saveProperty=async()=>{if(!property)return;if((form.moveInDate&&!isISODate(form.moveInDate))||(form.leaseEndDate&&!isISODate(form.leaseEndDate))){setError("Enter dates in YYYY-MM-DD format.");return;}try{const updated=await rentalApi.updateProperty(property.id,form);setProperty(updated);await cacheRentalProperty(updated);setEdit(false);}catch(e:any){setError(e.message||"Property update failed.");}};
 const scheduleInspection=async()=>{
  if(!property||scheduleBusyRef.current)return;
  if(!isISODate(scheduleDate)){setError("Enter the inspection date in YYYY-MM-DD format.");return;}
  scheduleBusyRef.current=true;setScheduleBusy(true);
  try{const created=await rentalApi.createInspection(property.id,{type:scheduleType,date:scheduleDate,rooms:[],status:"draft"});setSchedule(false);nav.navigate("InspectionReport",{propertyId:property.id,reportId:created.id,type:created.type,date:created.date});}
  catch(e:any){
   const id=`local-${Date.now()}`;
   try{
    await saveDraft({id,propertyId:property.id,businessId:property.businessId,type:scheduleType,date:scheduleDate,rooms:[],status:"draft",createdAt:new Date().toISOString(),scheduleAttempted:true});
    setSchedule(false);nav.navigate("InspectionReport",{propertyId:property.id,reportId:id,type:scheduleType,date:scheduleDate});
   }catch(storageError:any){setError(`Inspection could not sync (${e.message||"offline"}) and couldn't be saved on this device (${storageError.message||"storage unavailable"}).`);}
  }finally{scheduleBusyRef.current=false;setScheduleBusy(false);}
 };
 const contact=(kind:"email"|"phone")=>{
  const value=kind==="email"?property?.tenantEmail:property?.tenantPhone;
  if(!value){setError(`No tenant ${kind} has been added.`);return;}
  if(Platform.OS==="web"){
   Linking.openURL(`${kind==="email"?"mailto:":"tel:"}${value}`).catch(()=>setError("A contact app could not be opened."));
   return;
  }
  const buttons:any[]=[{text:"Cancel",style:"cancel"}];
  if(kind==="email")buttons.push({text:"Email",onPress:()=>Linking.openURL(`mailto:${value}`)});
  else {buttons.push({text:"Call",onPress:()=>Linking.openURL(`tel:${value}`)});buttons.push({text:"Message",onPress:()=>Linking.openURL(`sms:${value}`)});}
  Alert.alert("Contact tenant",kind==="email"?`Email ${value}?`:`Call or message ${value}?`,buttons);
 };
 const openDocument=async(doc:SavedDocument)=>{
  try{
   const isPdf=/^data:application\/pdf/i.test(doc.uri)||/\.pdf(?:$|[?#])/i.test(doc.uri);
   let uri=doc.uri;
   if(Platform.OS!=="web"&&/^data:text\/html/i.test(uri)){
    const content=decodeURIComponent(uri.slice(uri.indexOf(",")+1));
    uri=`${FileSystem.cacheDirectory}legacy-rental-report-${Date.now()}.html`;
    await FileSystem.writeAsStringAsync(uri,content);
   }
   if(Platform.OS==="web"){
    const link=document.createElement("a");link.href=uri;link.download=`${doc.title.replace(/[^a-z0-9]+/gi,"-")}.${isPdf?"pdf":"html"}`;link.click();
   }else if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri,{dialogTitle:doc.title,mimeType:isPdf?"application/pdf":"text/html"});
   else await Linking.openURL(uri);
  }catch{Alert.alert("Can't open document","This saved report is not available on this device.");}
 };
 const openEvidence=(item:{uri:string;timestamp:string;title:string})=>setSelectedEvidence(item);
 const downloadEvidence=async(item:{uri:string;timestamp:string;title:string})=>{
  try{
   if(Platform.OS==="web"){
    const link=document.createElement("a");link.href=item.uri;link.download=`${item.title.replace(/[^a-z0-9]+/gi,"-")}.jpg`;link.click();
    return;
   }
   const match=item.uri.match(/^data:image\/(jpeg|png);base64,([a-z0-9+/=\r\n]+)$/i);
   if(!match)throw new Error("This evidence image is not a valid local image.");
   const extension=match[1].toLowerCase()==="jpeg"?"jpg":match[1].toLowerCase();
   const destination=`${FileSystem.cacheDirectory}rental-evidence-${Date.now()}.${extension}`;
   await FileSystem.writeAsStringAsync(destination,match[2],{encoding:FileSystem.EncodingType.Base64});
   if(await Sharing.isAvailableAsync())await Sharing.shareAsync(destination,{mimeType:`image/${match[1].toLowerCase()}`,dialogTitle:item.title});
   else await Linking.openURL(destination);
  }catch(e:any){Alert.alert("Evidence unavailable",e.message||"Could not open this evidence image.");}
 };
 const addEditPhotos=async()=>{
  try{const picked:{uri:string;timestamp:string}[]=await pickPropertyPhotos(6-(form.photos?.length||0));setForm({...form,photos:[...(form.photos||[]),...picked.map((item)=>item.uri)].slice(0,6)});}
  catch(e:any){setError(e.message||"Photo selection was cancelled.");}
 };
 const openReport=(report:InspectionReportDraft)=>nav.navigate("InspectionReport",{propertyId:params.propertyId,reportId:report.id,type:report.type,date:report.date});
 const moveIns=reports.filter(r=>r.type==="move_in"&&r.status==="complete").slice().sort((a,b)=>a.date.localeCompare(b.date));
 const baseline=moveIns[0];
 const baselineFor=(date:string)=>moveIns.filter(r=>r.date<=date)[0];
 const evidenceRows=reports.flatMap(report=>report.rooms.flatMap(room=>room.photos.map((uri,index)=>({uri,timestamp:room.photoTimestamps[index]||"time not recorded",title:`${typeLabel[report.type]} · ${room.name} · photo ${index+1}`,date:report.date}))));
 if(loading)return <View style={s.center}><View style={s.skeleton}/><View style={s.skeleton}/><View style={s.skeleton}/></View>;
 if(!property)return <View style={s.center}><Feather name="alert-circle" size={30} color={C.red}/><Text style={s.error}>{error||"Property not found."}</Text><Action label="Try again" onPress={load} icon="refresh-cw"/></View>;
 return <View style={s.page}>
  <ScrollView contentContainerStyle={s.content}>
   {property.photos?.[0]?<Image source={propertyImageSource(property.photos[0])} style={s.cover}/>:<View style={[s.cover,s.coverBlank]}><Feather name="home" size={38} color={C.amber}/></View>}
   <View style={s.titleRow}><View style={{flex:1}}><Text style={s.kicker}>RENTAL PROPERTY</Text><Text style={s.title}>{property.address}</Text><Text style={s.sub}>{property.tenantName||"Vacant property"}</Text></View><Pressable style={s.editButton} onPress={()=>setEdit(true)}><Feather name="edit-2" size={17} color={C.amber}/></Pressable></View>
   <View style={s.tabs}>{(["Overview","Inspections","Documents"] as const).map(t=><Pressable key={t} onPress={()=>setTab(t)} style={[s.tab,tab===t&&s.activeTab]}><Text style={[s.tabText,tab===t&&s.activeTabText]}>{t}</Text></Pressable>)}</View>
   {!!error&&<Text style={s.error}>{error}</Text>}
   {tab==="Overview"&&<View>
    <View style={s.facts}><View style={s.fact}><Feather name="key" size={17} color={C.amber}/><Text style={s.factLabel}>MOVE-IN</Text><Text style={s.factValue}>{formatDate(property.moveInDate)}</Text></View><View style={s.fact}><Feather name="calendar" size={17} color={C.amber}/><Text style={s.factLabel}>LEASE END</Text><Text style={s.factValue}>{formatDate(property.leaseEndDate)}</Text></View></View>
    <SectionTitle right={<Pressable onPress={()=>setEdit(true)}><Text style={s.link}>Edit details</Text></Pressable>}>Tenancy</SectionTitle>
    <View style={s.panel}>
     <View style={s.infoRow}><Feather name="user" size={17} color={C.muted}/><View style={{flex:1}}><Text style={s.infoLabel}>Tenant</Text><Text style={s.infoValue}>{property.tenantName||"Not set"}</Text></View></View>
     <View style={s.infoRow}><Feather name="mail" size={17} color={C.muted}/><View style={{flex:1}}><Text style={s.infoLabel}>Email</Text><Text style={s.infoValue}>{property.tenantEmail||"Not set"}</Text></View></View>
     <View style={[s.infoRow,{borderBottomWidth:0}]}><Feather name="phone" size={17} color={C.muted}/><View style={{flex:1}}><Text style={s.infoLabel}>Phone</Text><Text style={s.infoValue}>{property.tenantPhone||"Not set"}</Text></View></View>
     <View style={s.contactActions}><Action label="Email tenant" icon="mail" onPress={()=>contact("email")} secondary/><Action label="Call tenant" icon="phone" onPress={()=>contact("phone")} secondary/></View>
    </View>
    <SectionTitle>Property notes</SectionTitle><View style={s.panel}><Text style={s.notes}>{property.notes||"No notes added."}</Text></View>
    <SectionTitle right={<Pressable onPress={()=>setSchedule(true)}><Text style={s.link}>Schedule</Text></Pressable>}>Recent inspections</SectionTitle>
    {reports.slice().sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,3).map(r=><Pressable key={r.id} onPress={()=>openReport(r)} style={s.reportRow}><View style={s.reportIcon}><Feather name="clipboard" size={17} color={C.amber}/></View><View style={{flex:1}}><Text style={s.reportTitle}>{typeLabel[r.type]||r.type} inspection</Text><Text style={s.reportMeta}>{formatDate(r.date)} · {r.id.startsWith("local-")?"Pending sync":r.status==="complete"?"Complete":"Draft"} · {r.rooms?.reduce((count,room)=>count+(room.photos?.length||0),0)||0} photos</Text></View><Feather name="chevron-right" size={17} color={C.muted}/></Pressable>)}
    <Action label="Schedule an inspection" icon="calendar" onPress={()=>setSchedule(true)}/>
    <Pressable onPress={()=>setCompare(true)} style={s.compareLink}><Feather name="columns" size={16} color={C.amber}/><Text style={s.link}>Compare move-out with move-in</Text></Pressable>
   </View>}
   {tab==="Inspections"&&<View><SectionTitle right={<Action label="Schedule" icon="plus" onPress={()=>setSchedule(true)}/>}>Inspection history</SectionTitle>
    {reports.length===0?<View style={s.empty}><Feather name="clipboard" size={27} color={C.amber}/><Text style={s.emptyTitle}>No inspections yet</Text><Text style={s.emptyText}>Build a dated, photo-backed record for this tenancy.</Text></View>:reports.slice().sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(r=><Pressable key={r.id} onPress={()=>openReport(r)} style={s.timeline}><View style={s.timelineMark}/><View style={s.timelineBody}><View style={s.rowBetween}><Text style={s.reportTitle}>{typeLabel[r.type]||r.type}</Text><Text style={[s.reportMeta,r.id.startsWith("local-")?{color:C.amber}:r.status==="complete"?{color:C.green}:{color:C.amber}]}>{r.id.startsWith("local-")?"Pending sync":r.status==="complete"?"Complete":"Draft"}</Text></View><Text style={s.reportMeta}>{formatDate(r.date)} · {r.rooms?.length||0} rooms · {r.rooms?.reduce((count,room)=>count+(room.photos?.length||0),0)||0} photos</Text><View style={s.roomPreview}>{r.rooms?.slice(0,3).map(room=><View key={room.id} style={s.roomChip}><Text style={s.roomChipText}>{room.name}</Text></View>)}</View></View><Feather name="chevron-right" size={17} color={C.muted}/></Pressable>)}
    <Action label="Create inspection report" icon="plus" onPress={()=>setSchedule(true)}/>
   </View>}
   {tab==="Documents"&&<View><SectionTitle>Saved reports & evidence</SectionTitle>{documents.length===0&&evidenceRows.length===0?<View style={s.empty}><Feather name="file-text" size={27} color={C.amber}/><Text style={s.emptyTitle}>No saved documents</Text><Text style={s.emptyText}>Generated inspection PDFs and timestamped room photos appear here.</Text></View>:<>{documents.map(doc=>{const pdf=/^data:application\/pdf/i.test(doc.uri)||/\.pdf(?:$|[?#])/i.test(doc.uri);return <Pressable key={doc.id} style={s.doc} onPress={()=>openDocument(doc)}><View style={s.docIcon}><Feather name="file-text" size={18} color={C.amber}/></View><View style={{flex:1}}><Text style={s.reportTitle}>{doc.title} · {pdf?"PDF":"Legacy HTML"}</Text><Text style={s.reportMeta}>{formatDate(doc.createdAt)} · {pdf?"Open or download":"Open saved report"}</Text></View><Feather name="download" size={17} color={C.amber}/></Pressable>;})}{evidenceRows.length>0&&<SectionTitle>Photo evidence</SectionTitle>}{evidenceRows.map((item,index)=><View key={`${item.title}-${index}`} style={s.evidenceRow}><Pressable onPress={()=>openEvidence(item)}><Image source={propertyImageSource(item.uri)} style={s.evidenceThumb}/></Pressable><Pressable style={{flex:1}} onPress={()=>openEvidence(item)}><Text style={s.reportTitle}>{item.title}</Text><Text style={s.reportMeta}>{formatDate(item.date)} · Added {item.timestamp}</Text></Pressable><Pressable accessibilityLabel={`Download ${item.title}`} onPress={()=>downloadEvidence(item)} style={s.evidenceDownload}><Feather name="download" size={17} color={C.amber}/></Pressable></View>)}</>}</View>}
  </ScrollView>
  <Modal visible={edit} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setEdit(false)}><ScrollView contentContainerStyle={s.modal}><View style={s.modalHeader}><Text style={s.modalTitle}>Edit property</Text><Pressable onPress={()=>setEdit(false)}><Feather name="x" size={22} color={C.ink}/></Pressable></View>
    <Field label="ADDRESS" value={form.address||""} onChangeText={address=>setForm({...form,address})}/>
    <Text style={ui.label}>PROPERTY PHOTOS · UP TO 6</Text><View style={s.editPhotos}>{(form.photos||[]).map((uri,index)=><View key={`${uri}-${index}`}><Image source={propertyImageSource(uri)} style={s.editPhoto}/><Pressable style={s.removeEditPhoto} onPress={()=>setForm({...form,photos:(form.photos||[]).filter((_,i)=>i!==index)})}><Feather name="x" size={11} color="#fff"/></Pressable></View>)}{(form.photos||[]).length<6&&<Pressable style={s.editPhotoAdd} onPress={addEditPhotos}><Feather name="camera" size={18} color={C.amber}/><Text style={{fontSize:10,color:C.amber,fontWeight:"700"}}>Add</Text></Pressable>}</View>
    <Field label="TENANT NAME" value={form.tenantName||""} onChangeText={tenantName=>setForm({...form,tenantName})}/>
    <Field label="TENANT EMAIL" keyboardType="email-address" value={form.tenantEmail||""} onChangeText={tenantEmail=>setForm({...form,tenantEmail})}/>
    <Field label="TENANT PHONE" keyboardType="phone-pad" value={form.tenantPhone||""} onChangeText={tenantPhone=>setForm({...form,tenantPhone})}/>
    <View style={s.dates}><View style={{flex:1}}><Field label="MOVE-IN DATE" placeholder="YYYY-MM-DD" value={form.moveInDate||""} onChangeText={moveInDate=>setForm({...form,moveInDate})}/></View><View style={{flex:1}}><Field label="LEASE END" placeholder="YYYY-MM-DD" value={form.leaseEndDate||""} onChangeText={leaseEndDate=>setForm({...form,leaseEndDate})}/></View></View>
    <Text style={ui.label}>STATUS</Text><View style={s.statuses}>{(["active","vacant","inspection_due"] as const).map(v=><Pressable key={v} onPress={()=>setForm({...form,status:v})} style={[s.choice,form.status===v&&s.choiceActive]}><Text style={{color:form.status===v?C.amber:C.muted,fontWeight:"700",fontSize:12}}>{v==="inspection_due"?"Inspection due":v[0].toUpperCase()+v.slice(1)}</Text></Pressable>)}</View>
    <Field label="NOTES" multiline value={form.notes||""} onChangeText={notes=>setForm({...form,notes})}/>
    <Action label="Save changes" icon="check" onPress={saveProperty}/>
  </ScrollView></Modal>
   <Modal visible={schedule} animationType="fade" transparent onRequestClose={()=>!scheduleBusy&&setSchedule(false)}><View style={s.shade}><View style={s.dialog}><View style={s.modalHeader}><Text style={s.modalTitle}>Schedule inspection</Text><Pressable disabled={scheduleBusy} onPress={()=>setSchedule(false)}><Feather name="x" size={21} color={C.ink}/></Pressable></View><Text style={s.infoLabel}>Inspection type</Text><View style={s.typeChoices}>{(["move_in","routine","move_out"] as InspectionType[]).map(t=><Pressable key={t} onPress={()=>setScheduleType(t)} style={[s.choice,scheduleType===t&&s.choiceActive]}><Text style={{color:scheduleType===t?C.amber:C.muted,fontWeight:"700"}}>{typeLabel[t]}</Text></Pressable>)}</View><Field label="DATE · YYYY-MM-DD" value={scheduleDate} onChangeText={setScheduleDate}/><Action label={scheduleBusy?"Creating…":"Create inspection"} icon="arrow-right" onPress={scheduleInspection} disabled={scheduleBusy}/></View></View></Modal>
  <Modal visible={compare} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setCompare(false)}><ScrollView contentContainerStyle={s.modal}><View style={s.modalHeader}><View><Text style={s.kicker}>TENANCY RECORD</Text><Text style={s.modalTitle}>Move-out comparison</Text></View><Pressable onPress={()=>setCompare(false)}><Feather name="x" size={22} color={C.ink}/></Pressable></View>
    {reports.filter(r=>r.type==="move_out").length===0?<View style={s.empty}><Feather name="columns" size={27} color={C.amber}/><Text style={s.emptyTitle}>No move-out inspection yet</Text><Text style={s.emptyText}>Record a move-out report to compare room photos and notes.</Text></View>:reports.filter(r=>r.type==="move_out").map(report=>{const currentBaseline=baselineFor(report.date);return <View key={report.id}><Text style={s.reportMeta}>{currentBaseline?`MOVE-IN ${formatDate(currentBaseline.date)}`:"NO PRECEDING MOVE-IN"}  ↔  MOVE-OUT {formatDate(report.date)}</Text>{!currentBaseline?<Text style={s.emptyText}>Complete a move-in inspection dated before this move-out to compare evidence.</Text>:currentBaseline.rooms.map(oldRoom=>{const newRoom=report.rooms.find(r=>r.name===oldRoom.name);return <View key={oldRoom.id} style={s.compareRoom}><Text style={s.reportTitle}>{oldRoom.name}</Text><View style={s.pair}><View style={s.pairSide}><Text style={s.infoLabel}>MOVE-IN · {oldRoom.condition||"No condition"}</Text><View style={s.tinyGrid}>{oldRoom.photos.slice(0,3).map((p,i)=><Image key={i} source={propertyImageSource(p)} style={s.tinyPhoto}/>)}</View><Text style={s.notes}>{oldRoom.notes||"No notes"}</Text></View><View style={s.pairSide}><Text style={s.infoLabel}>MOVE-OUT · {newRoom?.condition||"Not recorded"}</Text><View style={s.tinyGrid}>{newRoom?.photos.slice(0,3).map((p,i)=><Image key={i} source={propertyImageSource(p)} style={s.tinyPhoto}/>)}</View><Text style={s.notes}>{newRoom?.notes||"No notes"}</Text></View></View></View>})}</View>})}
   </ScrollView></Modal>
   <Modal visible={!!selectedEvidence} transparent animationType="fade" onRequestClose={()=>setSelectedEvidence(null)}><View style={s.shade}><View style={s.evidenceDialog}><View style={s.modalHeader}><View style={{flex:1,marginRight:12}}><Text style={s.modalTitle}>{selectedEvidence?.title}</Text><Text style={s.reportMeta}>Added {selectedEvidence?.timestamp||"time not recorded"}</Text></View><Pressable onPress={()=>setSelectedEvidence(null)}><Feather name="x" size={22} color={C.ink}/></Pressable></View>{selectedEvidence&&<Image source={propertyImageSource(selectedEvidence.uri)} style={s.evidenceLarge}/>}<View style={{marginTop:16}}><Action label="Download / Share evidence" icon="download" onPress={()=>selectedEvidence&&downloadEvidence(selectedEvidence)}/></View></View></View></Modal>
 </View>
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg},content:{padding:18,paddingBottom:100,maxWidth:800,width:"100%",alignSelf:"center"},cover:{width:"100%",height:210,borderRadius:18,marginBottom:17},coverBlank:{backgroundColor:"#F1E8DC",alignItems:"center",justifyContent:"center"},
 titleRow:{flexDirection:"row",alignItems:"center",gap:12},kicker:{fontSize:10,fontWeight:"800",letterSpacing:1.5,color:C.amber},title:{fontSize:25,fontWeight:"800",color:C.ink,marginTop:5},sub:{fontSize:14,color:C.muted,marginTop:4},editButton:{width:43,height:43,borderRadius:14,backgroundColor:"#F5EBDD",alignItems:"center",justifyContent:"center"},
 tabs:{flexDirection:"row",backgroundColor:"#F1EAE1",borderRadius:13,padding:4,marginTop:23,marginBottom:10},tab:{flex:1,alignItems:"center",paddingVertical:11,borderRadius:10},activeTab:{backgroundColor:"#fff",shadowColor:"#4C3927",shadowOpacity:.08,shadowRadius:5,elevation:1},tabText:{fontSize:12,color:C.muted,fontWeight:"700"},activeTabText:{color:C.ink},
 facts:{flexDirection:"row",gap:12,marginTop:12},fact:{backgroundColor:"#fff",borderColor:C.border,borderWidth:1,borderRadius:15,padding:14,flex:1},factLabel:{fontSize:9,letterSpacing:1.1,color:C.muted,fontWeight:"800",marginTop:9},factValue:{fontSize:14,color:C.ink,fontWeight:"700",marginTop:3},panel:{backgroundColor:"#fff",borderWidth:1,borderColor:C.border,borderRadius:16,padding:15},infoRow:{flexDirection:"row",gap:12,alignItems:"center",paddingVertical:12,borderBottomWidth:1,borderColor:"#F0E9E0"},infoLabel:{fontSize:11,color:C.muted,fontWeight:"600"},infoValue:{fontSize:14,color:C.ink,fontWeight:"700",marginTop:3},contactActions:{flexDirection:"row",gap:8,marginTop:13},notes:{fontSize:14,lineHeight:21,color:C.ink},link:{fontSize:13,fontWeight:"800",color:C.amber},reportRow:{backgroundColor:"#fff",borderRadius:14,borderColor:C.border,borderWidth:1,padding:13,marginBottom:9,flexDirection:"row",alignItems:"center",gap:12},reportIcon:{width:39,height:39,borderRadius:12,backgroundColor:"#F8EFE5",alignItems:"center",justifyContent:"center"},reportTitle:{fontSize:14,fontWeight:"800",color:C.ink},reportMeta:{fontSize:12,color:C.muted,marginTop:4},compareLink:{flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",paddingVertical:18},roomChip:{paddingHorizontal:8,paddingVertical:5,backgroundColor:"#F4EEE6",borderRadius:9},roomChipText:{fontSize:10,color:C.muted,fontWeight:"700"},roomPreview:{flexDirection:"row",gap:6,marginTop:9},timeline:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:15,borderBottomWidth:1,borderColor:C.border},timelineMark:{width:10,height:10,borderRadius:5,backgroundColor:C.amber},timelineBody:{flex:1},rowBetween:{flexDirection:"row",justifyContent:"space-between"},doc:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#fff",borderWidth:1,borderColor:C.border,borderRadius:14,padding:14,marginBottom:10},docIcon:{width:40,height:40,borderRadius:12,backgroundColor:"#F8EFE5",alignItems:"center",justifyContent:"center"},evidenceRow:{flexDirection:"row",alignItems:"center",gap:11,backgroundColor:"#fff",borderWidth:1,borderColor:C.border,borderRadius:14,padding:10,marginBottom:8},evidenceThumb:{width:54,height:54,borderRadius:10},evidenceDownload:{height:40,width:40,alignItems:"center",justifyContent:"center"},evidenceDialog:{backgroundColor:C.bg,width:"100%",maxWidth:520,borderRadius:18,padding:18},evidenceLarge:{width:"100%",height:450,resizeMode:"contain",backgroundColor:"#F1E9DF"},empty:{alignItems:"center",padding:25,backgroundColor:"#fff",borderRadius:16,borderWidth:1,borderColor:C.border,marginVertical:10},emptyTitle:{fontWeight:"800",fontSize:17,color:C.ink,marginTop:12},emptyText:{fontSize:13,lineHeight:20,color:C.muted,textAlign:"center",marginTop:7},center:{flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center",gap:15,padding:20},error:{color:C.red,textAlign:"center"},skeleton:{height:120,width:"90%",borderRadius:16,backgroundColor:"#EEE6DD"},
 modal:{padding:22,paddingBottom:40,backgroundColor:C.bg,flexGrow:1},modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:22},modalTitle:{fontSize:24,fontWeight:"800",color:C.ink,marginTop:4},dates:{flexDirection:"row",gap:11},statuses:{flexDirection:"row",gap:7,marginBottom:16,flexWrap:"wrap"},choice:{paddingHorizontal:10,paddingVertical:9,borderRadius:18,borderWidth:1,borderColor:C.border},choiceActive:{borderColor:C.amber,backgroundColor:"#F8EFE5"},shade:{flex:1,backgroundColor:"#34281F88",justifyContent:"center",padding:20},dialog:{backgroundColor:C.bg,borderRadius:19,padding:20},typeChoices:{flexDirection:"row",gap:7,marginVertical:13,flexWrap:"wrap"},compareRoom:{padding:14,backgroundColor:"#fff",borderColor:C.border,borderWidth:1,borderRadius:15,marginTop:11},pair:{flexDirection:"row",gap:10,marginTop:11},pairSide:{flex:1},tinyGrid:{flexDirection:"row",gap:4,marginVertical:8},tinyPhoto:{width:54,height:54,borderRadius:8},editPhotos:{flexDirection:"row",gap:8,marginBottom:17,flexWrap:"wrap"},editPhoto:{width:60,height:60,borderRadius:11},removeEditPhoto:{position:"absolute",right:-4,top:-4,width:19,height:19,borderRadius:10,backgroundColor:C.red,alignItems:"center",justifyContent:"center"},editPhotoAdd:{width:60,height:60,borderRadius:11,borderWidth:1,borderStyle:"dashed",borderColor:C.amber,alignItems:"center",justifyContent:"center",gap:3}
});