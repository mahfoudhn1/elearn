export interface Student{
    id: number;
    user: number;
    first_name:string;
    last_name:string;
    avatar:string;
    wilaya:string;
    grade: number;

    school_level: string;
    hightschool_speciality: string;
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
  export interface Grade{
    id:number;
    name: string;
    school_level: string;
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
  }
  export interface Subscription {
    id: number;
    student: number;
    is_active:boolean;
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