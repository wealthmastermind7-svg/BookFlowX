import React from "react";
import { Pressable, StyleSheet, Text, View, TextInput, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";

export const C = { bg: "#FAF7F2", card: "#fff", border: "#E8DDD0", amber: "#C17F3E", ink: "#34281F", muted: "#8C7B6B", green: "#4A7C59", red: "#A5463D" };
export const warmCardShadow = { shadowColor: "#8B6F47", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
const s = StyleSheet.create({
 action:{ minHeight:44,borderRadius:12,paddingHorizontal:15,flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center" },primary:{backgroundColor:C.amber},secondary:{backgroundColor:"#F4EADF",borderWidth:1,borderColor:C.border},actionText:{color:"#fff",fontWeight:"700",fontSize:14},
 field:{marginBottom:14},label:{color:C.muted,fontSize:12,fontWeight:"700",marginBottom:7,letterSpacing:.4},input:{minHeight:46,backgroundColor:"#fff",borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:13,color:C.ink,fontSize:15},
 sectionTitle:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:22,marginBottom:12},heading:{fontSize:17,fontWeight:"800",color:C.ink,letterSpacing:-.2}
});
export function Action({ label, onPress, icon, secondary = false, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof Feather.glyphMap; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} accessibilityRole="button" onPress={onPress} style={[s.action, secondary ? s.secondary : s.primary, disabled && { opacity: 0.55 }]}><>{icon && <Feather name={icon} size={16} color={secondary ? C.amber : "#fff"} />}<Text style={[s.actionText, secondary && { color: C.amber }]}>{label}</Text></></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput placeholderTextColor="#AA9B8D" {...props} style={[s.input, props.multiline && { height: 90, textAlignVertical: "top" }, props.style]} /></View>;
}
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <View style={s.sectionTitle}><Text style={s.heading}>{children}</Text>{right}</View>;
}
export const styles = s;