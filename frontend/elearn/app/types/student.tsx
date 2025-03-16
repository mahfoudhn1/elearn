
  export interface User{
    id: number;
    username:string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_file:string;
    avatar_url : string;
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
 
  export interface Group {
    id: number;
    name: string;
    school_level: string;
    grade: Grade;
    schedule?: Schedule[];
    students?: Student[];
  }
  export interface Grade{
    id:number;
    name:string;
    school_level : string;
  }
  export interface Subscription {
    id: number;
    student: Student;
    teacher: Teacher;
    is_active:boolean;
    start_date:string;
    end_date:string;

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