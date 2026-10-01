export type UserRole = 'student' | 'instructor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  language?: 'ar' | 'en' | 'fr';
  theme?: 'light' | 'dark';
}

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'MULTIPLE_SELECT';

export type SurveyKind = 'QUIZ' | 'SURVEY';

export type ShowResults = 'IMMEDIATELY' | 'AFTER_DEADLINE' | 'NEVER';

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

/**
 * Subscription gating state returned by the backend.
 *
 * `is_locked` is true when the course is hidden (no subscription at all, or it
 * was published after the student's subscription lapsed).
 */
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
  /** VideoAsset uuid when the lesson uses an uploaded video. */
  video_asset: string | null;
  duration_seconds: number | null;
  is_preview: boolean;
  is_published: boolean;
  order: number;
  created_at: string;
  materials_count?: number;
  materials?: LessonMaterial[];
  is_finished: boolean;
  /** Playback resume point reported by the server. */
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
  id: string;
  text: string;
  is_correct?: boolean;
  order?: number;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  question_type: QuestionType;
  points: number;
  order: number;
  explanation?: string;
  expected_answer?: string | null;
  expected_answers?: string[];
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
  // Detail-only fields.
  sections?: CourseSection[];
  lessons?: Lesson[];
  materials?: LessonMaterial[];
  surveys?: SurveySummary[];
  progress?: CourseProgress | null;
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
  updated_at: string;
  answers: SurveyAnswer[];
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

export interface QuizStartResponse {
  attempt: string;
  attempt_number: number;
  started_at: string;
  server_now: string;
  deadline: string | null;
  time_limit_minutes: number | null;
  attempts_left: number | null;
}

export interface SurveySubmissionResult {
  response: SurveyResponse;
  score: number | null;
  total: number;
  correct_count: number | null;
  percent?: number;
  passed?: boolean | null;
  results: {
    question: string;
    is_correct: boolean;
    correct_choice: string | null;
    explanation: string;
  }[] | null;
  message?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject?: string;
  avatar?: string;
}

/** Django `users.User` shape nested inside a teacher profile. */
export interface TeacherUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  avatar_file?: string;
  avatar?: string;
}

/** Django teacher profile returned by `teachers/`. */
export interface TeacherProfile {
  id: number;
  user: TeacherUser;
  price: number;
  bio: string;
  phone_number: string;
  profession: string;
  degree: string;
  university: string;
  profile_privet: boolean;
  /** Backend enum: `PRIMARY` | `MIDDLE` | `SECONDARY`. */
  teaching_level: string;
  teaching_subjects: string;
  wilaya: string;
  created_at: string;
  updated_at: string;
  /** Local UI-only fields (not sent by the API yet). */
  rating?: number;
  studentsCount?: number;
  isLive?: boolean;
}

export interface Student {
  id: string;
  name: string;
  avatar?: string;
}
export type GroupType = 'ACADEMIC' | 'LANGUAGE';
export type GroupStatus = 'open' | 'closed';

export interface Group {
  id: string;
  name: string;
  admin: Teacher;                  // Django ForeignKey("users.Teacher")
  students: Student[];             // Django ManyToManyField("users.Student")
  group_type: GroupType;           // Calculated automatically in save() methods
  status: GroupStatus;
  created_at: string;
  updated_at: string;
  
  // Academic Tracks Meta (Optional based on type)
  school_level?: string;           // Django ForeignKey("users.SchoolLevel")
  grade?: string;                  // Django ForeignKey("users.Grade")
  field_of_study?: string;         // Django ForeignKey("users.FieldOfStudy")
  
  // Language Tracks Meta (Optional based on type)
  language?: string;               // Django ForeignKey(Language)
  language_level?: string;         // Django ForeignKey(LanguageLevel)

  // Extra Mobile Application UI States
  studentsCount?: number;          // Aggregates array length
  unreadMessages?: number;
  activeLive?: boolean;            // Toggled active if live streaming is matching datetime right now
}

/* ==============================================
   🎞️ VIDEO SUBSYSTEM TYPES (Django: Video Model)
   ============================================== */
export type UploadStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface GroupVideo {
  id: string;
  teacher: string;                 // Django ForeignKey("users.Teacher")
  group: string;                   // Django ForeignKey("Group")
  title: string;
  r2_object_key: string | null;    // Cloudflare R2 identifier field
  upload_id: string | null;
  upload_status: UploadStatus;
  created_at: string;

  // Frontend playback support states
  video_url: string;               // Real signed URL path resolution fallback
  duration?: string;
}

/* ==============================================
   📅 CALENDAR TRACKING TYPES (Django: Schedule Model)
   ============================================== */
export type ScheduleType = 'weekly' | 'custom';

export interface Schedule {
  id: string;
  user: string;                    // Django ForeignKey("users.User")
  day_of_week: string;             // e.g. 'monday', 'saturday'
  scheduled_date: string | null;   // Dynamically updated via update_scheduled_date() on backend
  start_time: string | null;       // HH:MM format
  end_time: string | null;         // HH:MM format
  group: string;                   // Django ForeignKey(Group)
  schedule_type: ScheduleType;
  color: string;                   // Tailwind utility identifier class (e.g., 'bg-riffaa-orange')
  meeting?: JitsiMeeting | null;   // Django ForeignKey('jitsi.Meeting')
  
  // Frontend workflow flags
  status?: 'completed' | 'live' | 'upcoming';
}

export interface JitsiMeeting {
  meeting_id: string;
  title: string;
  join_url: string;
  viewers_count?: number;
}

/* ==============================================
   📢 NOTIFICATIONS & ANNOUNCEMENTS
   ============================================== */
export interface GroupAnnouncement {
  id: string;
  group_id: string;
  content: string;
  created_at: string;
}

/* ==============================================
   📚 COURSE SYSTEM TYPES
   ==============================================
   Course/Lesson/Material/Survey types are declared at the top of this file. */