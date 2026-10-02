import React, { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { pickPropertyPhotos, propertyImageSource } from "@/lib/property-photos";
import { cacheRentalProperty, getCachedRentalProperties, isISODate, RentalProperty, RentalStatus, rentalApi, formatDate } from "@/lib/rentals";
import { Action, C, Field, warmCardShadow, styles as ui } from "@/components/rentals/RentalUI";
import { RentalsStackParamList } from "@/navigation/RentalsStackNavigator";

type Nav = NativeStackNavigationProp<RentalsStackParamList>;
const statusText: Record<RentalStatus,string> = { active:"Active Tenancy", vacant:"Vacant", inspection_due:"Inspection Due" };
const statusColor: Record<RentalStatus,string> = { active:C.green, vacant:C.amber, inspection_due:C.red };

export default function RentalsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const [items,setItems] = useState<RentalProperty[]>([]);
  const [businessId,setBusinessId] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [modal,setModal] = useState(false);
  const [saving,setSaving] = useState(false);
  const blank = { address:"", photos:[] as string[], tenantName:"", tenantEmail:"", tenantPhone:"", moveInDate:"", leaseEndDate:"", status:"active" as RentalStatus, notes:"" };
  const [form,setForm] = useState(blank);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    let activeBusinessId=await api.loadBusinessId()||"";
    try { const business = await api.getOrCreateBusiness(); activeBusinessId=business.id;setBusinessId(business.id); const rentals=await rentalApi.list(business.id);setItems(rentals);await Promise.all(rentals.map(cacheRentalProperty)); }
    catch(e:any) { try { const cached=activeBusinessId?await getCachedRentalProperties(activeBusinessId):[];setBusinessId(activeBusinessId);setItems(cached);setError(cached.length?`Offline mode · showing ${cached.length} saved properties.`:(e.message || "Could not load rentals.")); } catch(cacheError:any) { setError(cacheError.message||"Saved rentals could not be read safely."); } }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);
  useFocusEffect(useCallback(()=>{ if(businessId) load(); },[businessId,load]));
  const save = async () => {
    if(saving)return;
    if (!form.address.trim()) { setError("Add a property address to continue."); return; }
    if((form.moveInDate&&!isISODate(form.moveInDate))||(form.leaseEndDate&&!isISODate(form.leaseEndDate))){setError("Enter dates in YYYY-MM-DD format.");return;}
    setSaving(true); setError("");
    try { const made = await rentalApi.create(businessId,form); await cacheRentalProperty(made);setItems((prev)=>[made,...prev]); setModal(false); setForm(blank); }
    catch(e:any) { setError(e.message || "Property could not be saved."); }
    finally { setSaving(false); }
  };
  const addPhotos = async () => {
    try { const picked: {uri:string;timestamp:string}[] = await pickPropertyPhotos(6-form.photos.length); setForm(f=>({...f,photos:[...f.photos,...picked.map(p=>p.uri)].slice(0,6)})); }
    catch(e:any) { setError(e.message || "Photo selection was cancelled."); }
  };
  const statusLabel = (value:RentalStatus) => statusText[value] || statusText.active;
  return <View style={s.page}>
    <ScrollView contentContainerStyle={[s.content,{paddingTop:insets.top+22}]}>
      <View style={s.header}><View><Text style={s.eyebrow}>PROPERTY WORKSPACE</Text><Text style={s.title}>My Rentals</Text><Text style={s.subhead}>Every home, lease and inspection in one place.</Text></View>
        <Pressable onPress={()=>{setError("");setModal(true);}} style={s.add}><Feather name="plus" size={17} color="#fff"/><Text style={s.addText}>Add Property</Text></Pressable>
      </View>
      {loading ? <View style={s.loading}>{[0,1,2].map(i=><View key={i} style={s.skeleton}/>)}</View> : error && !items.length ? <View style={s.empty}><Feather name="wifi-off" size={28} color={C.amber}/><Text style={s.emptyTitle}>Rentals are unavailable</Text><Text style={s.emptyText}>{error}</Text><Action label="Try again" icon="refresh-cw" onPress={load}/></View> : !items.length ? <View style={s.empty}><View style={s.house}><Feather name="home" size={30} color={C.amber}/></View><Text style={s.emptyTitle}>Start with a home</Text><Text style={s.emptyText}>Add your first rental to keep tenancy details and inspection evidence together.</Text><Action label="Add your first property" icon="plus" onPress={()=>setModal(true)}/></View> :
      <View style={s.list}>{items.map((property)=> <Pressable key={property.id} onPress={()=>nav.navigate("RentalDetail",{propertyId:property.id})} style={[s.card,warmCardShadow]}>
        {property.photos?.[0] ? <Image source={propertyImageSource(property.photos[0])} style={s.cover}/> : <View style={[s.cover,s.coverBlank]}><Feather name="home" size={32} color={C.amber}/><Text style={s.coverLabel}>YOUR PROPERTY</Text></View>}
        <View style={s.cardBody}><View style={s.cardTop}><Text style={s.address} numberOfLines={2}>{property.address}</Text><View style={[s.status,{backgroundColor:`${statusColor[property.status]||C.green}18`}]}><View style={[s.dot,{backgroundColor:statusColor[property.status]||C.green}]}/><Text style={[s.statusText,{color:statusColor[property.status]||C.green}]}>{statusLabel(property.status)}</Text></View></View>
          <Text style={s.tenant}>{property.tenantName || "No tenant listed"}</Text><View style={s.meta}><Feather name="key" size={13} color={C.muted}/><Text style={s.metaText}>Moved in {formatDate(property.moveInDate)}</Text><Feather name="chevron-right" size={18} color={C.amber}/></View>
        </View>
      </Pressable>)}</View>}
      {!!error && !!items.length && <Text style={s.inlineError}>{error}</Text>}
    </ScrollView>
    <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setModal(false)}>
      <ScrollView style={s.modal} contentContainerStyle={s.modalContent}>
        <View style={s.modalHead}><View><Text style={s.eyebrow}>NEW PROPERTY</Text><Text style={s.modalTitle}>Add a rental</Text></View><Pressable onPress={()=>setModal(false)}><Feather name="x" size={23} color={C.ink}/></Pressable></View>
        <Field label="PROPERTY ADDRESS" placeholder="Street, suburb, city" value={form.address} onChangeText={address=>setForm({...form,address})}/>
        <Text style={ui.label}>PROPERTY PHOTOS · UP TO 6</Text>
        <View style={s.photoRow}>{form.photos.map((uri,i)=><View key={`${uri}-${i}`}><Image source={propertyImageSource(uri)} style={s.thumb}/><Pressable style={s.removePhoto} onPress={()=>setForm({...form,photos:form.photos.filter((_,idx)=>idx!==i)})}><Feather name="x" size={12} color="#fff"/></Pressable></View>)}{form.photos.length<6&&<Pressable onPress={addPhotos} style={s.addPhoto}><Feather name="camera" size={20} color={C.amber}/><Text style={s.addPhotoText}>Add</Text></Pressable>}</View>
        <Field label="TENANT NAME" placeholder="Full name" value={form.tenantName} onChangeText={tenantName=>setForm({...form,tenantName})}/>
        <Field label="TENANT EMAIL" placeholder="name@email.com" keyboardType="email-address" autoCapitalize="none" value={form.tenantEmail} onChangeText={tenantEmail=>setForm({...form,tenantEmail})}/>
        <Field label="TENANT PHONE" placeholder="+1 555 000 0000" keyboardType="phone-pad" value={form.tenantPhone} onChangeText={tenantPhone=>setForm({...form,tenantPhone})}/>
        <View style={s.dates}><View style={{flex:1}}><Field label="MOVE-IN DATE" placeholder="YYYY-MM-DD" value={form.moveInDate} onChangeText={moveInDate=>setForm({...form,moveInDate})}/></View><View style={{flex:1}}><Field label="LEASE END" placeholder="YYYY-MM-DD" value={form.leaseEndDate} onChangeText={leaseEndDate=>setForm({...form,leaseEndDate})}/></View></View>
        <Text style={ui.label}>STATUS</Text><View style={s.statusOptions}>{(["active","vacant","inspection_due"] as RentalStatus[]).map(value=><Pressable key={value} onPress={()=>setForm({...form,status:value})} style={[s.statusChoice,form.status===value&&s.statusSelected]}><Text style={[s.choiceText,form.status===value&&{color:C.amber}]}>{statusLabel(value)}</Text></Pressable>)}</View>
        <Field label="PROPERTY NOTES" placeholder="Anything useful about this home…" multiline value={form.notes} onChangeText={notes=>setForm({...form,notes})}/>
        {!!error&&<Text style={s.inlineError}>{error}</Text>}<Action label={saving?"Saving property…":"Save Property"} icon="check" onPress={save}/>
      </ScrollView>
    </Modal>
  </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingTop:22,paddingBottom:110,maxWidth:800,width:"100%",alignSelf:"center"},
 header:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-end",gap:12,marginBottom:22},eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.5,color:C.amber},title:{fontSize:32,fontWeight:"800",color:C.ink,letterSpacing:-1,marginTop:5},subhead:{color:C.muted,fontSize:14,marginTop:4},
 add:{backgroundColor:C.amber,borderRadius:12,paddingHorizontal:13,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:6},addText:{color:"#fff",fontWeight:"700",fontSize:13},
 list:{gap:14},card:{backgroundColor:"#fff",borderRadius:18,borderWidth:1,borderColor:C.border,overflow:"hidden"},cover:{height:170,width:"100%"},coverBlank:{alignItems:"center",justifyContent:"center",backgroundColor:"#F1E8DC"},coverLabel:{fontSize:9,letterSpacing:2,fontWeight:"800",color:C.muted,marginTop:9},cardBody:{padding:15},cardTop:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:8},address:{fontSize:18,fontWeight:"800",color:C.ink,flex:1},status:{borderRadius:20,paddingVertical:6,paddingHorizontal:9,flexDirection:"row",alignItems:"center",gap:5},dot:{width:6,height:6,borderRadius:3},statusText:{fontSize:11,fontWeight:"700"},tenant:{fontSize:14,color:C.muted,marginTop:6},meta:{flexDirection:"row",alignItems:"center",gap:7,marginTop:13},metaText:{fontSize:12,color:C.muted,flex:1},
 empty:{backgroundColor:"#fff",borderColor:C.border,borderWidth:1,borderRadius:20,padding:26,alignItems:"center",marginTop:32},house:{height:66,width:66,borderRadius:20,backgroundColor:"#F7EFE5",alignItems:"center",justifyContent:"center",marginBottom:15},emptyTitle:{fontSize:19,fontWeight:"800",color:C.ink},emptyText:{fontSize:14,lineHeight:21,color:C.muted,textAlign:"center",marginVertical:10,maxWidth:350},loading:{gap:12},skeleton:{height:235,borderRadius:18,backgroundColor:"#EFE7DD"},inlineError:{color:C.red,fontSize:13,marginVertical:10},
 modal:{flex:1,backgroundColor:C.bg},modalContent:{padding:22,paddingBottom:40,maxWidth:680,width:"100%",alignSelf:"center"},modalHead:{flexDirection:"row",justifyContent:"space-between",marginBottom:23},modalTitle:{fontSize:27,fontWeight:"800",color:C.ink,marginTop:5},photoRow:{flexDirection:"row",gap:9,marginBottom:17,flexWrap:"wrap"},thumb:{width:64,height:64,borderRadius:12},removePhoto:{position:"absolute",right:-4,top:-4,backgroundColor:C.red,width:20,height:20,borderRadius:10,alignItems:"center",justifyContent:"center"},addPhoto:{width:64,height:64,borderRadius:12,borderWidth:1,borderStyle:"dashed",borderColor:C.amber,alignItems:"center",justifyContent:"center"},addPhotoText:{fontSize:10,color:C.amber,fontWeight:"700"},dates:{flexDirection:"row",gap:12},statusOptions:{flexDirection:"row",gap:7,marginBottom:17,flexWrap:"wrap"},statusChoice:{borderWidth:1,borderColor:C.border,borderRadius:20,paddingVertical:9,paddingHorizontal:12},statusSelected:{borderColor:C.amber,backgroundColor:"#F8EFE4"},choiceText:{fontSize:12,color:C.muted,fontWeight:"700"}
});