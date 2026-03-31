"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { LeaderboardRow } from "@/hooks/useLeaderboard";

const NAVY = "#1B2B5E";
const GOLD = "#F5A623";

const s = StyleSheet.create({
  page:       { fontFamily: "Helvetica", fontSize: 9, padding: 36, color: "#1a1a1a" },
  header:     { marginBottom: 14 },
  title:      { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  subtitle:   { fontSize: 9, color: "#555", marginTop: 3 },
  table:      { marginTop: 10 },
  thead:      { flexDirection: "row", backgroundColor: NAVY, padding: "5 8", borderRadius: 3 },
  th:         { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 8 },
  row:        { flexDirection: "row", padding: "4 8", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  rowAlt:     { backgroundColor: "#f8f9fc" },
  rowGold:    { backgroundColor: "#fffbeb" },
  td:         { fontSize: 8, color: "#374151" },
  rank:       { width: 36 },
  name:       { flex: 1 },
  cls:        { width: 70 },
  avg:        { width: 52, textAlign: "right" },
  grade:      { width: 40, textAlign: "center" },
  pos:        { width: 52, textAlign: "center" },
});

interface Props {
  rows: LeaderboardRow[];
  term: string;
  session: string;
  schoolName?: string;
}

export function LeaderboardDocument({ rows, term, session, schoolName = "Reigning Star Schools" }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{schoolName}</Text>
          <Text style={s.subtitle}>Academic Leaderboard — {term} Term · {session}</Text>
        </View>

        <View style={s.table}>
          {/* Header */}
          <View style={s.thead}>
            <Text style={[s.th, s.rank]}>Rank</Text>
            <Text style={[s.th, s.name]}>Student</Text>
            <Text style={[s.th, s.cls]}>Class</Text>
            <Text style={[s.th, s.avg]}>Average</Text>
            <Text style={[s.th, s.grade]}>Grade</Text>
            <Text style={[s.th, s.pos]}>Class Pos.</Text>
          </View>

          {rows.map((r, i) => (
            <View key={r.student_id} style={[s.row, i % 2 !== 0 ? s.rowAlt : {}, r.rank <= 3 ? s.rowGold : {}]}>
              <Text style={[s.td, s.rank]}>
                {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
              </Text>
              <Text style={[s.td, s.name]}>{r.student_name}</Text>
              <Text style={[s.td, s.cls]}>{r.class_name}</Text>
              <Text style={[s.td, s.avg]}>{r.average.toFixed(1)}%</Text>
              <Text style={[s.td, s.grade]}>{r.grade}</Text>
              <Text style={[s.td, s.pos]}>{r.class_position ? `#${r.class_position}` : "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 7, color: "#9ca3af", marginTop: 20, textAlign: "center" }}>
          Generated {new Date().toLocaleDateString()} · {rows.length} students
        </Text>
      </Page>
    </Document>
  );
}
