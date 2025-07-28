
  export interface User{
    id: number;
    username:string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_file:string;
    avatar_url : string;
    avatar:string;
  }
  export interface Grade{
    id:number;
    name: string;
    school_level: string;
  }
  export interface field_of_study  {
    id: number;
    name: string;
  }
  export interface Student{
    id: number;
    user: User;
    first_name:string;
    last_name:string;
    avatar:string;
    wilaya:string;
    phone_number:string;
    grade: Grade;
    field_of_study: field_of_study;
    school_level: string;
    hightschool_speciality: string;
  }
  export interface Teacher {
    id: number;
    user: User;
    bio: string;
    teaching_level:string;
    phone_number:string;
    profession:string;
    degree: string;
    university: string;
    price: number;
    wilaya:string;
    teaching_subjects: string;

}

  export interface Schedule {
    id: number;
    day_of_week: string;
    scheduled_date?: string;  // Optional field if it might not always be present
    start_time: string;
    end_time: string;
    group: number;
    schedule_type?: string;    // Optional field, if applicable
    user: number;              // Assuming this is the ID of the user
    [key: string]: any;
    color:string;
    zoom_meeting_id: string;
    zoom_join_url: string;
}
export interface Language {
  id: number;
  name: string;
}

export interface LanguageLevel {
  id: number;
  name: string;
  description?: string;
}

export interface StudentLanguageProficiency {
  id: number;
  student: number; // Student ID
  language: Language;
  level: LanguageLevel;
}

export interface Question {
  id: number;
  language: number; // Language ID
  level: number; // Level ID
  text: string;
  question_type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false';
  options?: string[]; // For multiple choice
  correct_answer: string;
  explanation?: string;
}

export interface TestSubmission {
  language_id: number;
  answers: {
    question_id: number;
    answer: string;
  }[];
}

export interface TestResult {
  message: string;
  new_level: string;
  language: string;
}

  export interface Group {
    id: number;
    name: string;
    school_level: string;
    group_type : string;
    language: string;
    language_level:string;
    grade: Grade;
    schedule?: Schedule[];
    students?: Student[];
    field_of_study_nest: string;
  }
  export interface Grade{
    id:number;
    name:string;
    school_level : string;
  }
  export interface SubPlan{
    id:number
    price: string;
    duration_days : string;
    name:string;
  }
  export interface Subscription {
    id: number;
    student: Student;
    teacher: Teacher;
    is_active:boolean;
    start_date:string;
    end_date:string;
    plan : SubPlan;

  }

  export interface Meeting{
    teacher: number;       
    group?: number | null; 
    topic: string;         
    start_time: string;    
    duration: number;      
    zoom_meeting_id: string;
    join_url: string;    
    agenda?: string | null
  }
  export interface Flashcard {
    id: number;
    deck: string;
    front: string;
    back: string;
    created_at: string;
  }
  
  export interface Progress {
    id: number;
    deck: string;
    user: string;
    correct_answers: number;
    wrong_answers: number;
    total_flashcards: number;
    completed: boolean;
  }
  
  export interface Deck {
    id: string;
    title: string;
    description: string;
    subject: string;
    user: string;
    totalCards: number;
    created_at: string;
    flashcards: Flashcard[];
    progress: Progress[];
    deckprogress : number;
  }
  export interface payement{
    current_balance : string;
    teacher : number;
    total_earned : string;
  }

  export interface PrivateSession {
    id: number;
    student:Student;
    teacher: Teacher;
    proposed_date: string;
    status: string;
    student_notes?: string;
    teacher_notes?: string;
    is_paied: boolean;
  }
  export interface RoomData {
    room: string;
    token: string;
    domain: string;
    displayName?: string;
  }
  
  export interface ChatMessage {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
    isLocal: boolean;
  }
  export interface Answer {
    id: number;
    text: string;
    is_correct: boolean;
  }
  
  // export interface Question {
  //   id: number;
  //   correct_answer: string;
  //   options:string[];
  //   order:string ;
  //   points:string ;
  //   question_type: string ;
  //   quiz:string ;
  //   text: string;
  // }
  
  // export interface StudentAnswer {
  //   id: number;
  //   question: Question;
  //   selected_answer: Answer;
  //   is_correct: boolean;
  //   answered_at: string;
  // }
  
  // export interface QuizProp {
  //   id: number;
  //   title:string;
  //   description:string;
  //   created_at:string;
  //   time_limit_minutes:string;
  //   is_published: boolean;
  //   questions: Question[];
  // }
  
  // export interface GroupCourse {
  //   id: number;
  //   title: string;
  //   description: string | null;
  //   group_video: string | null;
  //   created_at: string;
  //   quiz: QuizProp | null;
  //   student_answers: StudentAnswer[] | null | undefined;
  // }