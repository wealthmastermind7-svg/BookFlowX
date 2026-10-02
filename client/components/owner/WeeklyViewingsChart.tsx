import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";

export function WeeklyViewingsChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 560;
  const height = 112;
  const max = Math.max(1, ...data.map((day) => day.value));
  const points = data.map((day, index) => ({
    x: 12 + index * (width - 24) / Math.max(1, data.length - 1),
    y: height - 8 - (day.value / max) * (height - 24),
  }));
  const path = points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${width - 12} ${height - 8} L 12 ${height - 8} Z`;
  return (
    <View accessible accessibilityLabel={`Viewings this week: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <View style={styles.scale}><Text style={styles.label}>{max} viewings</Text><Text style={styles.label}>Daily bookings</Text></View>
      <Svg width="100%" height={112} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="viewingFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C17F3E" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#C17F3E" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={12} x2={width - 12} y1={height - 8} y2={height - 8} stroke="#E8DDD0" />
        <Path d={area} fill="url(#viewingFill)" />
        <Path d={path} fill="none" stroke="#C17F3E" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => <Circle key={data[i].label} cx={p.x} cy={p.y} r={3} fill="#C17F3E" />)}
      </Svg>
      <View style={styles.labels}>{data.map((day) => <Text key={day.label} style={styles.day}>{day.label}</Text>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scale: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#8B6F47", fontSize: 12 },
  labels: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8 },
  day: { color: "#8B6F47", fontSize: 12, textAlign: "center" },
});