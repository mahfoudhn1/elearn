export * from "./ai";
export {
    extractErrorMessage,
    loginWithUsernameAndPassword,
    refreshAccessToken,
    signInWithGoogle,
} from "./auth";
export * from "./chat";
export { apiClient, describeApiError, getApiBaseUrl, getAuthHeaders, isNetworkError } from "./client";
export {
    getCourseById,
    getCourseLessons,
    getCourseMaterials,
    getCourseSurveys,
    getCourses,
    getSurveyAttempts,
    getSurveyById,
    getVideoPlaybackUrl,
    isCourseLocked,
    markLessonComplete,
    markLessonUnfinished,
    saveLessonPosition,
    startSurvey,
    submitSurvey
} from "./courses";
export type { SurveyAnswerInput } from "./courses";
export * from "./activity";
export * from "./goals";
// Exported by name rather than `export *`: groups.ts also carries a deprecated
// getSchedules() aimed at a route the backend does not serve, and the personal
// study schedule below owns that name now.
export {
    getGroupById,
    getGroupClassSchedules,
    getGroupQuizzes,
    getGroupSchedules,
    getGroupVideos,
    getProfileGroups,
    getStudentGroups
} from "./groups";
export * from "./languageTeaching";
export * from "./livestream";
export * from "./notifications";
export * from "./privateSessions";
export * from "./schedule";
export * from "./studentForm";
export * from "./tracking";
