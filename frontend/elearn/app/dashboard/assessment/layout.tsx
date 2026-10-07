"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import { RootState } from "../../../store/store";

const TABS = [
  { href: "/dashboard/assessment", label: "Review queue" },
  { href: "/dashboard/assessment/questions/new", label: "New question" },
  { href: "/dashboard/assessment/import", label: "Import" },
  { href: "/dashboard/assessment/flashcards", label: "Flashcards" },
  { href: "/dashboard/assessment/analytics", label: "Class analytics" },
];

/** Teacher-only shell for the assessment authoring tools. */
export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && user.role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="w-full bg-gray-300 flex flex-col" dir="ltr">
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold text-gray-800">Assessment tools</h1>
        <p className="text-sm text-gray-600">
          Author questions and flashcards, review submissions, and track your classes.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  active
                    ? "bg-gray-800 text-white"
                    : "bg-white/70 text-gray-700 hover:bg-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
