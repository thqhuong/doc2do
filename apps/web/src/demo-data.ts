import type { AnalysisResponse } from "@doc2do/contracts";

export const DEMO_CONTEXT =
  "I am Lan, a third-year computer science student in Vietnam with GPA 3.4. I have not prepared the essay.";

export const DEMO_DOCUMENT_TEXT = `THÔNG BÁO HỌC BỔNG AI FUTURE LEADERS 2026

Đơn vị tổ chức: Vietnam Digital Futures Foundation
Ngày thông báo: 20/08/2026

Đối tượng: sinh viên năm ba hoặc năm tư đang học ngành công nghệ tại một trường đại học ở Việt Nam, có GPA từ 3.2/4.0 trở lên.

Hồ sơ bắt buộc gồm: CV, bảng điểm, thẻ sinh viên và bài luận động lực không quá 500 từ. Bài luận cần trình bày mục tiêu, kinh nghiệm liên quan và tác động mong đợi của học bổng.

Hạn nộp hồ sơ: 17:00 ngày 12/09/2026. Thông báo không nêu múi giờ.
Ứng viên vượt qua vòng hồ sơ sẽ được mời phỏng vấn trong khoảng 20-22/09/2026.

Nộp hồ sơ tại: https://example.com/aifl-scholarship`;

export const demoAnalysis: AnalysisResponse = {
  id: "demo-ai-future-leaders-2026",
  status: "complete",
  mode: "demo",
  created_at: "2026-08-28T08:00:00+07:00",
  result: {
    schema_version: "1.0",
    document: {
      title: "AI Future Leaders Scholarship 2026",
      category: "scholarship",
      language: "vi",
      issuer: "Vietnam Digital Futures Foundation",
      source_date: "2026-08-20",
      summary:
        "A scholarship for third- and fourth-year technology students, covering tuition support and mentorship for the 2026 academic year.",
      audience: ["Third- and fourth-year technology students", "Students with GPA 3.2/4.0 or higher"],
    },
    applicability: {
      status: "likely_eligible",
      reasons: [
        "Your third-year computer science status matches the target group.",
        "Your reported GPA of 3.4 is above the 3.2 minimum.",
      ],
      missing_facts: ["Your current university enrollment has not been confirmed."],
      questions_for_user: ["Are you currently enrolled at a university in Vietnam?"],
    },
    deadlines: [
      {
        id: "deadline_apply",
        label: "Application deadline",
        date_time_iso: "2026-09-12T17:00:00+07:00",
        timezone: null,
        precision: "exact",
        is_inferred: false,
        needs_confirmation: true,
        source_refs: ["src_deadline"],
      },
      {
        id: "deadline_interview",
        label: "Interview window begins",
        date_time_iso: "2026-09-20T09:00:00+07:00",
        timezone: null,
        precision: "date_only",
        is_inferred: true,
        needs_confirmation: true,
        source_refs: ["src_interview"],
      },
    ],
    actions: [
      {
        id: "action_essay",
        title: "Draft the 500-word motivation essay",
        description: "Outline your goals, relevant experience, and how the scholarship would support your next step.",
        priority: "urgent",
        deadline_id: "deadline_apply",
        requirements: ["Maximum 500 words", "Explain goals and expected impact"],
        links: [],
        source_refs: ["src_documents"],
        evidence_state: "source_backed",
        confidence: "high",
      },
      {
        id: "action_documents",
        title: "Collect the required documents",
        description: "Prepare clear digital copies and check that your name is consistent across all files.",
        priority: "high",
        deadline_id: "deadline_apply",
        requirements: ["CV", "Academic transcript", "Student card"],
        links: [],
        source_refs: ["src_documents"],
        evidence_state: "source_backed",
        confidence: "high",
      },
      {
        id: "action_review",
        title: "Review eligibility and application details",
        description: "Confirm your enrollment and review the application form before submitting.",
        priority: "normal",
        deadline_id: "deadline_apply",
        requirements: ["Current university enrollment", "GPA of at least 3.2/4.0"],
        links: [
          { label: "Open application form", url: "https://example.com/aifl-scholarship" },
        ],
        source_refs: ["src_eligibility", "src_link"],
        evidence_state: "needs_confirmation",
        confidence: "medium",
      },
      {
        id: "action_submit",
        title: "Submit and save your confirmation",
        description: "Submit before the deadline and keep a screenshot or email confirmation for your records.",
        priority: "high",
        deadline_id: "deadline_apply",
        requirements: ["Completed online application", "All four attachments"],
        links: [
          { label: "Submit application", url: "https://example.com/aifl-scholarship" },
        ],
        source_refs: ["src_deadline", "src_link"],
        evidence_state: "source_backed",
        confidence: "high",
      },
    ],
    source_refs: [
      {
        id: "src_eligibility",
        location_label: "Page 1 · Eligibility",
        snippet:
          "Đối tượng: sinh viên năm 3 hoặc năm 4 thuộc các ngành công nghệ, có GPA tích lũy tối thiểu 3.2/4.0.",
      },
      {
        id: "src_documents",
        location_label: "Page 1 · Required documents",
        snippet:
          "Hồ sơ gồm: CV, bảng điểm, thẻ sinh viên và bài luận động lực không quá 500 từ.",
      },
      {
        id: "src_deadline",
        location_label: "Page 2 · Application timeline",
        snippet: "Hạn cuối nhận hồ sơ: 17:00 ngày 12/09/2026.",
      },
      {
        id: "src_interview",
        location_label: "Page 2 · Application timeline",
        snippet: "Phỏng vấn dự kiến diễn ra từ ngày 20 đến 22/09/2026.",
      },
      {
        id: "src_link",
        location_label: "Page 2 · How to apply",
        snippet: "Nộp hồ sơ tại: https://example.com/aifl-scholarship",
      },
    ],
    warnings: [
      {
        type: "ambiguity",
        message: "The notice does not specify a timezone. Review the 17:00 deadline before adding it to your calendar.",
        source_refs: ["src_deadline"],
      },
      {
        type: "missing",
        message: "Your current university enrollment was not included in the profile and still needs confirmation.",
        source_refs: ["src_eligibility"],
      },
    ],
    next_best_action_id: "action_essay",
    disclaimer: "Generated from the uploaded source. Confirm critical details with the issuer before acting.",
  },
};
