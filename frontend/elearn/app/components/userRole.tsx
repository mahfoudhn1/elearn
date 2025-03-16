"use client"; 

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: any) => state.auth.user); // Get user from Redux
  const userRole = user?.role; 
  
  const router = useRouter();
  const pathname = usePathname();

  const publicPages = ["/", "/login", "/register"];

  useEffect(() => {
    if (!user && !publicPages.includes(pathname)) {
      router.push("/login"); // Redirect to login if no user
    } else if (user && userRole === null && !publicPages.includes(pathname)) {
      router.push("/continuereg/role"); // Redirect if user exists but has no role
    }
  }, [user, userRole, pathname, router]);

  return <>{children}</>;
}
