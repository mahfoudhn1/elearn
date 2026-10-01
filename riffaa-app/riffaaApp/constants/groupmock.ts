/* ==========================================================================
   📌 TYPE DEFINITIONS (Matching Django Model Architecture)
   ========================================================================== */
export interface GroupVideo {
  id: string;
  title: string;
  r2_object_key: string;
  upload_status: 'PENDING' | 'COMPLETED' | 'FAILED';
  video_url: string;
  duration: string;
  created_at: string;
}

export interface GroupAnnouncement {
  id: string;
  content: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  group_type: 'ACADEMIC' | 'LANGUAGE';
  status: 'open' | 'closed';
  teacher_name: string;
  avatar: string;
  students_count: number;
  unread_messages: number;
  active_live: boolean;
  
  // Django Academic Meta
  school_level?: string;
  grade?: string;
  field_of_study?: string;
  
  // Django Language Meta
  language?: string;
  language_level?: string;
  
  // Nested Screen Data Relatives
  videos: GroupVideo[];
  announcements: GroupAnnouncement[];
}

/* ==========================================================================
   👥 SEPARATE GROUPS MOCK DATA
   ========================================================================== */
export const mockGroups: Group[] = [
  {
    id: "1",
    name: "مجموعة الفيزياء - النخبة",
    group_type: "ACADEMIC",
    school_level: "ثانوي",
    grade: "الصف الثالث الثانوي",
    field_of_study: "علوم تجريبية",
    status: "open",
    teacher_name: "د. كريم أحمد",
    avatar: "https://i.pravatar.cc/150?img=12",
    students_count: 42,
    unread_messages: 5,
    active_live: true,
    announcements: [
      {
        id: "ann-101",
        content: "تذكير: اختبار تجريبي قصير سيتم رفعه غداً الأحد في تمام الساعة 6 مساءً عبر المنصة. يرجى المراجعة جيداً.",
        created_at: "قبل ٤ ساعات"
      },
      {
        id: "ann-102",
        content: "تم رفع ملف PDF الشامل لشرح قوانين نيوتن وتطبيقات الحركة الدائرية في المرفقات المساعدة.",
        created_at: "أمس"
      }
    ],
    videos: [
      {
        id: "v-101",
        title: "المحاضرة 1: مقدمة في الميكانيكا الكلاسيكية وعلم الحركة",
        r2_object_key: "users/teachers/1/videos/mech_intro.mp4",
        upload_status: "COMPLETED",
        video_url: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4",
        duration: "45:12",
        created_at: "قبل يومين"
      },
      {
        id: "v-102",
        title: "المحاضرة 2: تطبيقات عملية وحسابية على قانون نيوتن الثاني",
        r2_object_key: "users/teachers/1/videos/newton_laws.mp4",
        upload_status: "COMPLETED",
        video_url: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4",
        duration: "58:40",
        created_at: "أمس"
      }
    ]
  },
  {
    id: "2",
    name: "مجموعة الرياضيات - الجبر المتقدم",
    group_type: "ACADEMIC",
    school_level: "ثانوي",
    grade: "الصف الثالث الثانوي",
    field_of_study: "رياضيات",
    status: "open",
    teacher_name: "أ. علي منصور",
    avatar: "https://i.pravatar.cc/150?img=3",
    students_count: 28,
    unread_messages: 0,
    active_live: false,
    announcements: [
      {
        id: "ann-201",
        content: "يرجى حل تمارين الصفحة 45 من كتاب الجبر قبل موعد البث المباشر القادم.",
        created_at: "قبل يومين"
      }
    ],
    videos: [
      {
        id: "v-201",
        title: "المحاضرة 1: المصفوفات وأنواعها وطرق حل نظم المعادلات",
        r2_object_key: "users/teachers/2/videos/matrices.mp4",
        upload_status: "COMPLETED",
        video_url: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4",
        duration: "51:04",
        created_at: "قبل ٥ أيام"
      }
    ]
  },
  {
    id: "3",
    name: "محادثة إنجليزية - المستوى فوق المتوسط",
    group_type: "LANGUAGE",
    language: "الإنجليزية",
    language_level: "B2 Upper Intermediate",
    status: "open",
    teacher_name: "أ. سارة النجار",
    avatar: "https://i.pravatar.cc/150?img=5",
    students_count: 19,
    unread_messages: 2,
    active_live: false,
    announcements: [],
    videos: [
      {
        id: "v-301",
        title: "المحاضرة 1: كسر حاجز الخوف بالنطق واللكنة البريطانية والأمريكية",
        r2_object_key: "users/teachers/3/videos/english_b2_1.mp4",
        upload_status: "COMPLETED",
        video_url: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4",
        duration: "32:15",
        created_at: "قبل ٤ أيام"
      }
    ]
  }
];

/* ==========================================================================
   ⚡ ASYNC GROUP DATA FETCHERS
   ========================================================================== */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const GroupsAPI = {
  // Fetch all subscribed group cards
  getAllGroups: async (): Promise<Group[]> => {
    await sleep(400);
    return mockGroups;
  },

  // Fetch full detailed group object by dynamic route ID
  getGroupById: async (id: string): Promise<Group | null> => {
    await sleep(300);
    return mockGroups.find(group => group.id === id) || null;
  },

  // Isolates Cloudflare R2 completed video lists inside a group page 
  getVideosByGroupId: async (groupId: string): Promise<GroupVideo[]> => {
    await sleep(300);
    const group = mockGroups.find(g => g.id === groupId);
    if (!group) return [];
    return group.videos.filter(v => v.upload_status === "COMPLETED");
  },

  // Isolates classroom updates feed 
  getAnnouncementsByGroupId: async (groupId: string): Promise<GroupAnnouncement[]> => {
    await sleep(200);
    const group = mockGroups.find(g => g.id === groupId);
    return group ? group.announcements : [];
  }
};