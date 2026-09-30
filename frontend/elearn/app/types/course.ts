export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "MULTIPLE_SELECT";

export type SurveyKind = "QUIZ" | "SURVEY";

export type ShowResults = "IMMEDIATELY" | "AFTER_DEADLINE" | "NEVER";

export interface CourseTeacher {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  teaching_subjects?: string | null;
  teaching_level?: string | null;
  wilaya?: string | null;
  bio?: string | null;
}

export interface CourseAccess {
  is_locked: boolean;
  is_owner: boolean;
  has_subscription?: boolean | null;
  subscription_active?: boolean | null;
}

export interface LessonMaterial {
  id: string;
  course: string;
  lesson: string | null;
  title: string;
  file?: string | null;
  url?: string | null;
  created_at: string;
}

export interface Lesson {
  id: string;
  course: string;
  section: string | null;
  title: string;
  description: string;
  video: string;
  video_asset: string | null;
  duration_seconds: number | null;
  is_preview: boolean;
  is_published: boolean;
  order: number;
  created_at: string;
  materials?: LessonMaterial[];
  materials_count?: number;
  is_finished: boolean;
  last_position_seconds: number;
}

export interface CourseSection {
  id: string;
  course: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface SurveyChoice {
  id?: string;
  text: string;
  is_correct?: boolean;
  order?: number;
}

export interface SurveyQuestion {
  id?: string;
  text: string;
  question_type: QuestionType;
  expected_answer?: string;
  expected_answers?: string[];
  explanation?: string;
  points: number;
  order?: number;
  choices: SurveyChoice[];
}

export interface SurveySummary {
  id: string;
  course: string;
  lesson: string | null;
  title: string;
  description: string;
  kind: SurveyKind;
  is_published: boolean;
  created_at: string;
  questions_count: number;
}

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  teacher: CourseTeacher;
  teacher_name: string;
  lessons_count: number;
  materials_count: number;
  surveys_count: number;
  access: CourseAccess;
  sections?: CourseSection[];
  lessons?: Lesson[];
  materials?: LessonMaterial[];
  surveys?: SurveySummary[];
  progress?: CourseProgress | null;
}

export interface Survey extends SurveySummary {
  time_limit_minutes: number | null;
  passing_score_percent: number;
  max_attempts: number | null;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  show_results: ShowResults;
  available_from: string | null;
  available_until: string | null;
  total_points: number;
  questions: SurveyQuestion[];
  my_response?: SurveyResponse | null;
  my_attempts?: SurveyAttempt[];
  attempts_left?: number | null;
}

export interface SurveyAttempt {
  id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  score: number;
  passed?: boolean;
  time_spent_seconds?: number;
}

export interface SurveyAnswer {
  id: string;
  question: string;
  question_text?: string;
  choice: string | null;
  text_answer: string;
  is_correct: boolean;
}

export interface SurveyResponse {
  id: string;
  survey: string;
  student: string;
  student_name?: string;
  score: number;
  submitted_at: string;
  updated_at?: string;
  answers: SurveyAnswer[];
}

export interface QuizResultItem {
  question: string;
  is_correct: boolean;
  correct_choice: string | null;
  explanation: string;
}

export interface QuizStartResponse {
  attempt: string;
  attempt_number: number;
  started_at: string;
  server_now: string;
  deadline: string | null;
  time_limit_minutes: number | null;
  attempts_left: number | null;
}

export interface QuizSubmitResponse {
  response: SurveyResponse;
  score: number | null;
  total: number;
  correct_count: number | null;
  percent?: number;
  passed?: boolean | null;
  results: QuizResultItem[] | null;
  message?: string;
}

export interface QuizAnalyticsQuestion {
  question: string;
  text: string;
  question_type: QuestionType;
  points: number;
  total_answers: number;
  correct_answers: number;
  correct_rate: number | null;
  choice_counts: Array<{ choice: string; text: string; count: number }>;
}

export interface QuizAnalytics {
  survey: string;
  title: string;
  kind: SurveyKind;
  total_points: number;
  passing_score_percent: number;
  attempts_started: number;
  attempts_submitted: number;
  distinct_students: number;
  average_percent: number | null;
  pass_rate: number | null;
  questions: QuizAnalyticsQuestion[];
}

export interface VideoUploadInit {
  id: string;
  key: string;
  upload_id?: string;
  part_size?: number;
  status: string;
  part_urls?: Array<{ part_number: number; url: string }>;
  upload_url?: string;
}

export interface VideoUploadComplete {
  id: string;
  status: string;
  url: string;
}

export interface TrackingOverview {
  total_events: number;
  video_watch_minutes: number;
  lessons_completed: number;
  quizzes_submitted: number;
  streak_days: number;
}

export interface DailyActivityRow {
  date: string;
  event_count: number;
  lesson_count: number;
  quiz_count: number;
  watch_minutes: number;
}

export interface StudentCourseProgress {
  course: string;
  title: string;
  lessons_completed: number;
  lessons_total: number;
  percent: number;
  last_activity_at: string | null;
}

export interface TeacherStudentCourseProgress {
  course: string;
  title: string;
  lessons_completed: number;
  lessons_total: number;
  percent: number;
}

export interface TeacherStudentProgress {
  student: string;
  student_name: string;
  courses: TeacherStudentCourseProgress[];
  overall_percent: number;
  quiz_attempts: Array<{
    survey: string;
    title: string;
    score: number;
    submitted_at: string | null;
  }>;
}
