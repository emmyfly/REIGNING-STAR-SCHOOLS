"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { Question } from "@/types";

const NAVY = "#1B2B5E";

const s = StyleSheet.create({
  page:       { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header:     { borderBottomWidth: 1.5, borderBottomColor: NAVY, paddingBottom: 10, marginBottom: 14 },
  school:     { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  meta:       { fontSize: 9, color: "#555", marginTop: 3 },
  instructions:{ fontSize: 9, color: "#374151", marginBottom: 14, fontStyle: "italic" },
  qBlock:     { marginBottom: 10 },
  qText:      { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4 },
  option:     { fontSize: 9, color: "#374151", marginLeft: 16, marginBottom: 2 },
  footer:     { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
});

interface Props {
  title: string;
  subjectName: string;
  className: string;
  term: string;
  session: string;
  questions: Question[];
  schoolName?: string;
  durationMinutes?: number;
}

export function ExamPaperDocument({
  title, subjectName, className, term, session,
  questions, schoolName = "Reigning Star Schools", durationMinutes,
}: Props) {
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.school}>{schoolName}</Text>
          <Text style={s.meta}>{title}</Text>
          <Text style={s.meta}>
            {subjectName} · {className} · {term} Term · {session}
            {durationMinutes ? `  |  Duration: ${durationMinutes} mins` : ""}
            {"  |  Total Marks: "}{totalMarks}
          </Text>
        </View>

        {/* Instructions */}
        <Text style={s.instructions}>
          Answer ALL questions. Write clearly and legibly. Show all working where applicable.
        </Text>

        {/* Questions */}
        {questions.map((q, i) => (
          <View key={q.id} style={s.qBlock} wrap={false}>
            <Text style={s.qText}>
              {i + 1}. {q.text}{"  "}
              <Text style={{ fontFamily: "Helvetica", fontSize: 8, color: "#6b7280" }}>
                [{q.marks} mk{q.marks !== 1 ? "s" : ""}]
              </Text>
            </Text>
            {q.type === "mcq" && q.options?.map((opt, j) => (
              <Text key={j} style={s.option}>
                {String.fromCharCode(65 + j)}. {opt}
              </Text>
            ))}
            {q.type === "true_false" && (
              <Text style={s.option}>A. True{"    "}B. False</Text>
            )}
          </View>
        ))}

        <Text style={s.footer}>
          {schoolName} · {title} · {questions.length} questions · {totalMarks} marks
        </Text>
      </Page>
    </Document>
  );
}
