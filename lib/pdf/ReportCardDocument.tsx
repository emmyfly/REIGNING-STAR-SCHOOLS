"use client";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { ReportCardData } from "@/types";
import { DEFAULT_GRADE_SCALE } from "@/lib/utils/grading";
import { ordinal } from "@/lib/utils/formatting";

// ─── Brand colours ──────────────────────────────────────────────────────────
const NAVY  = "#1B2B5E";
const GOLD  = "#F5A623";
const LIGHT = "#F8F9FC";

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 36,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },

  // ── Header ──
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerText: { flex: 1, paddingLeft: 10 },
  schoolName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  schoolSub: { fontSize: 8, color: "#555", marginTop: 2 },
  reportTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  divider: { height: 2, backgroundColor: NAVY, marginVertical: 8 },
  goldLine: { height: 1.5, backgroundColor: GOLD, marginBottom: 10 },

  // ── Student info grid ──
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: LIGHT,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    gap: 4,
  },
  infoCell: { width: "33%", marginBottom: 4 },
  infoLabel: { fontSize: 7, color: "#777", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 1 },

  // ── Scores table ──
  table: { width: "100%", marginBottom: 10 },
  tHead: {
    flexDirection: "row",
    backgroundColor: NAVY,
    padding: "5 4",
    borderRadius: 2,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    padding: "4 4",
  },
  tRowAlt: { backgroundColor: LIGHT },
  tCell: { fontSize: 8 },
  tCellHead: { fontSize: 8, color: "#ffffff", fontFamily: "Helvetica-Bold" },

  colSubject: { width: "32%" },
  colNum:     { width: "11%", textAlign: "center" },
  colGrade:   { width: "9%",  textAlign: "center" },
  colRemark:  { width: "17%", textAlign: "left" },

  // ── Summary row ──
  summaryBox: {
    flexDirection: "row",
    backgroundColor: NAVY,
    borderRadius: 4,
    padding: "6 10",
    marginBottom: 10,
    gap: 0,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 7, color: "rgba(255,255,255,0.65)", textTransform: "uppercase" },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 2 },

  // ── Badges ──
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  badge: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },

  // ── Grading scale ──
  scaleTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  scaleRow: { flexDirection: "row", gap: 12, marginBottom: 2 },
  scaleItem: { flexDirection: "row", gap: 3 },
  scaleGrade: { fontSize: 7, fontFamily: "Helvetica-Bold", color: NAVY, width: 16 },
  scaleRange: { fontSize: 7, color: "#555" },
  scaleRemark: { fontSize: 7, color: "#555" },

  // ── Remarks ──
  remarksSection: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  remarkBox: { flex: 1 },
  remarkLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  remarkLine: { borderBottomWidth: 0.75, borderBottomColor: "#ccc", marginBottom: 10 },
  sigLine: { borderBottomWidth: 0.75, borderBottomColor: "#999", marginTop: 16 },
  sigLabel: { fontSize: 7, color: "#888", marginTop: 3, textAlign: "center" },

  // ── Footer ──
  footer: { position: "absolute", bottom: 16, left: 36, right: 36 },
  footerText: { fontSize: 7, color: "#aaa", textAlign: "center" },
});

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoGrid({ data }: { data: ReportCardData }) {
  const fields = [
    { label: "Student Name",   value: data.student.full_name },
    { label: "Admission No.",  value: data.student.admission_number },
    { label: "Class",          value: data.class_name },
    { label: "Gender",         value: data.student.gender },
    { label: "Term",           value: `${data.term} Term` },
    { label: "Session",        value: data.session },
  ];

  return (
    <View style={s.infoGrid}>
      {fields.map(({ label, value }) => (
        <View key={label} style={s.infoCell}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ScoresTable({ scores }: { scores: ReportCardData["scores"] }) {
  return (
    <View style={s.table}>
      {/* Header */}
      <View style={s.tHead}>
        <Text style={[s.tCellHead, s.colSubject]}>Subject</Text>
        <Text style={[s.tCellHead, s.colNum]}>CA /40</Text>
        <Text style={[s.tCellHead, s.colNum]}>Exam /60</Text>
        <Text style={[s.tCellHead, s.colNum]}>Total /100</Text>
        <Text style={[s.tCellHead, s.colGrade]}>Grade</Text>
        <Text style={[s.tCellHead, s.colRemark]}>Remark</Text>
        <Text style={[s.tCellHead, s.colNum]}>Position</Text>
      </View>
      {/* Rows */}
      {scores.map((row, i) => (
        <View key={i} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
          <Text style={[s.tCell, s.colSubject]}>{row.subject}</Text>
          <Text style={[s.tCell, s.colNum]}>{row.ca_score}</Text>
          <Text style={[s.tCell, s.colNum]}>{row.exam}</Text>
          <Text style={[s.tCell, s.colNum, { fontFamily: "Helvetica-Bold" }]}>{row.total}</Text>
          <Text style={[s.tCell, s.colGrade, { fontFamily: "Helvetica-Bold", color: NAVY }]}>{row.grade}</Text>
          <Text style={[s.tCell, s.colRemark]}>{row.remark}</Text>
          <Text style={[s.tCell, s.colNum]}>{row.position ? ordinal(row.position) : "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function SummaryBox({ data }: { data: ReportCardData }) {
  const items = [
    { label: "Average",   value: `${data.average.toFixed(1)}%` },
    { label: "Grade",     value: data.overall_grade },
    { label: "Position",  value: `${ordinal(data.class_position)} / ${data.total_students}` },
    { label: "Subjects",  value: String(data.scores.length) },
  ];
  return (
    <View style={s.summaryBox}>
      {items.map(({ label, value }) => (
        <View key={label} style={s.summaryItem}>
          <Text style={s.summaryLabel}>{label}</Text>
          <Text style={s.summaryValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function BadgesRow({ badges }: { badges: ReportCardData["badges"] }) {
  if (!badges.length) return null;
  const emojiMap: Record<string, string> = {
    top_performer: "⭐",
    honours: "🏆",
    most_improved: "📈",
  };
  return (
    <View style={s.badgeRow}>
      {badges.map((b) => (
        <View key={b.type} style={s.badge}>
          <Text style={s.badgeText}>{emojiMap[b.type] ?? ""} {b.label}</Text>
        </View>
      ))}
    </View>
  );
}

function GradingScale() {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.scaleTitle}>Grading Scale</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {DEFAULT_GRADE_SCALE.map((g) => (
          <View key={g.grade} style={s.scaleItem}>
            <Text style={s.scaleGrade}>{g.grade}</Text>
            <Text style={s.scaleRange}>{g.min}–{g.max}</Text>
            <Text style={s.scaleRemark}> ({g.remark})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RemarksSection() {
  return (
    <View style={s.remarksSection}>
      <View style={s.remarkBox}>
        <Text style={s.remarkLabel}>Class Teacher&apos;s Remarks</Text>
        <View style={s.remarkLine} />
        <View style={s.remarkLine} />
        <View style={s.sigLine} />
        <Text style={s.sigLabel}>Class Teacher&apos;s Signature &amp; Date</Text>
      </View>
      <View style={s.remarkBox}>
        <Text style={s.remarkLabel}>Principal&apos;s Remarks</Text>
        <View style={s.remarkLine} />
        <View style={s.remarkLine} />
        <View style={s.sigLine} />
        <Text style={s.sigLabel}>Principal&apos;s Signature, Stamp &amp; Date</Text>
      </View>
    </View>
  );
}

// ─── Main document ───────────────────────────────────────────────────────────

export function ReportCardDocument({ data }: { data: ReportCardData }) {
  return (
    <Document
      title={`${data.student.full_name} — ${data.term} Term Report`}
      author={data.school_name}
    >
      <Page size="A4" style={s.page}>
        {/* School header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.schoolName}>{data.school_name}</Text>
            <Text style={s.schoolSub}>{data.school_address}</Text>
            <Text style={s.schoolSub}>
              Tel: {data.school_phone} • Email: {data.school_email}
            </Text>
            <Text style={s.reportTitle}>Student Academic Report Card</Text>
          </View>
        </View>

        <View style={s.divider} />
        <View style={s.goldLine} />

        {/* Student info */}
        <InfoGrid data={data} />

        {/* Scores table */}
        <ScoresTable scores={data.scores} />

        {/* Summary */}
        <SummaryBox data={data} />

        {/* Performance badges */}
        <BadgesRow badges={data.badges} />

        {/* Grading scale reference */}
        <GradingScale />

        {/* Remarks & signatures */}
        <RemarksSection />

        {/* Footer */}
        <View style={s.footer}>
          <View style={{ borderTopWidth: 0.5, borderTopColor: "#ccc", marginBottom: 4 }} />
          {data.result_footer ? (
            <Text style={s.footerText}>{data.result_footer}</Text>
          ) : (
            <Text style={s.footerText}>
              {data.school_name} • {data.session} Academic Session • {data.term} Term
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
