"use client";
import React, { useEffect, useState } from "react";
import axiosClientInstance from "../../../lib/axiosInstance";

interface Plan {
  id: string;
  name: string;
  price: string | number;
  duration_days: number;
  description?: string | null;
}

interface PlansProps {
  onSelectPlan: (planId: string) => void;
}

const FEATURES = [
  "30 تلميذ في الحصة",
  "دروس مباشرة مع الاستاذ",
  "مواضيع وموارد",
];

export const PlanComponent: React.FC<PlansProps> = ({ onSelectPlan }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axiosClientInstance.get("/subscriptions/plans/");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.results ?? [];
        setPlans(data);
      } catch (err) {
        console.error("Failed to load subscription plans:", err);
        setError("تعذر تحميل خطط الاشتراك. يرجى المحاولة لاحقاً.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelect = (planId: string) => {
    if (planId) onSelectPlan(planId);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-grey-900 sm:text-5xl">
            الاشتراكات
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            اختر الخطة المناسبة لك واستفد من أفضل الخدمات التعليمية مع تجربة تعليمية مميزة
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          </div>
        )}

        {!loading && error && (
          <p className="text-center text-red-500 text-lg">{error}</p>
        )}

        {!loading && !error && plans.length === 0 && (
          <p className="text-center text-gray-600 text-lg">
            لا توجد خطط اشتراك متاحة حالياً.
          </p>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const isFirst = index === 0;
              const isLast = index === plans.length - 1 && plans.length > 1;
              return (
                <div
                  key={plan.id}
                  className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {isFirst && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      الأكثر طلباً
                    </div>
                  )}
                  {isLast && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      أفضل قيمة
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-grey-900 text-center mb-4">
                    {plan.name}
                  </h3>
                  <p className="text-center text-gray-500 mb-6">
                    <span className="text-4xl font-extrabold text-grey-900">
                      {plan.price}
                    </span>{" "}
                    دج / {plan.duration_days} يوم
                  </p>
                  {plan.description && (
                    <p className="text-center text-gray-500 mb-6">
                      {plan.description}
                    </p>
                  )}
                  <ul className="space-y-4 mb-8">
                    {FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center text-gray-600">
                        <svg
                          className="w-6 h-6 text-green-500 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => handleSelect(plan.id)}
                    disabled={!plan.id}
                  >
                    سجل الآن
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
