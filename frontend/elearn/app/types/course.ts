export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

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
  title: string;
  description: string;
  video: string;
  order: number;
  created_at: string;
  materials_count?: number;
  materials?: LessonMaterial[];
  is_finished: boolean;
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
  lessons?: Lesson[];
  materials?: LessonMaterial[];
  surveys?: SurveySummary[];
  progress?: CourseProgress | null;
}

export interface Survey extends SurveySummary {
  total_points: number;
  questions: SurveyQuestion[];
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
  answers: SurveyAnswer[];
}
