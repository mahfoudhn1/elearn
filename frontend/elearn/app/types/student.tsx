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
    day_of_week: string;
    start_time: string;
    end_time: string;
  }
  
  export interface Group {
    id: number;
    name: string;
    school_level: string;
    grade: number;
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