export interface Teacher {
  id: string;
  name: string;
  subject: string;
  grade: string; // e.g., "3AS" (3rd year secondary), "4AM", etc.
  wilaya: string; // Algerian provinces
  avatarUrl: string;
  rating: number;
  studentsCount: number;
  isLive: boolean;
}

export const seededTeachers: Teacher[] = [
  {
    id: '1',
    name: 'أ. أحمد المِصري',
    subject: 'العلوم الفيزيائية',
    grade: '3 ثانوي (3AS)',
    wilaya: 'الجزائر',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 4.9,
    studentsCount: 1240,
    isLive: true,
  },
  {
    id: '2',
    name: 'أ. مريم بوعبدالله',
    subject: 'العلوم الطبيعية',
    grade: '3 ثانوي (3AS)',
    wilaya: 'وهران',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    rating: 4.8,
    studentsCount: 850,
    isLive: false,
  },
  {
    id: '3',
    name: 'أ. ياسين بن علي',
    subject: 'الرياضيات',
    grade: '4 متوسط (4AM)',
    wilaya: 'قسنطينة',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    rating: 5.0,
    studentsCount: 2100,
    isLive: false,
  },
  {
    id: '4',
    name: 'أ. سارة حميدي',
    subject: 'اللغة الإنجليزية',
    grade: '3 ثانوي (3AS)',
    wilaya: 'الجزائر',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    rating: 4.7,
    studentsCount: 620,
    isLive: true,
  }
];

export const GRADES = ['الكل', '3 ثانوي (3AS)', '4 متوسط (4AM)'];
export const WILAYAS = ['الكل', 'الجزائر', 'وهران', 'قسنطينة'];