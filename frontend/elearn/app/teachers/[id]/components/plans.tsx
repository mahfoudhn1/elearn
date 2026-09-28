"use client";
import React, { useEffect, useState } from "react";
import axiosClientInstance from "../../../lib/axiosInstance";

interface PlansProps {
  onSelectPlan: (planId: string) => void;
}

export const PlanComponent: React.FC<PlansProps> = ({ onSelectPlan }) => {
  const [planIds, setPlanIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axiosClientInstance.get("/subscriptions/plans/");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.results ?? [];
        setPlanIds(data.map((plan: { id: string }) => plan.id));
      } catch (error) {
        console.error("Failed to load subscription plans:", error);
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

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Monthly Plan */}
          <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
              الأكثر طلباً
            </div>
            <h3 className="text-2xl font-bold text-grey-900 text-center mb-4">
              اشتراك شهري
            </h3>
            <p className="text-center text-gray-500 mb-6">
              <span className="text-4xl font-extrabold text-grey-900">1500 دج</span>{" "}
              / الشهر
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-600">
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
                30 تلميذ في الحصة
              </li>
              <li className="flex items-center text-gray-600">
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
                دروس مباشرة مع الاستاذ
              </li>
              <li className="flex items-center text-gray-600">
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
                مواضيع وموارد
              </li>
              {/* <li className="flex items-center text-gray-600">
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
                10 أسئلة مجانية لمساعد الذكاء الاصطناعي
              </li> */}
            </ul>
            <button
              className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={() => handleSelect(planIds[0])}
            >
              سجل الآن
            </button>
          </div>

          {/* Quarterly Plan */}
          <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <h3 className="text-2xl font-bold text-grey-900 text-center mb-4">
              اشتراك فصلي
            </h3>
            <p className="text-center text-gray-500 mb-6">
              <span className="text-4xl font-extrabold text-grey-900">4500 دج</span>{" "}
              / 3 أشهر
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-600">
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
                30 تلميذ في الحصة
              </li>
              <li className="flex items-center text-gray-600">
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
                دروس مباشرة مع الاستاذ
              </li>
              <li className="flex items-center text-gray-600">
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
                مواضيع وموارد
              </li>
              <li className="flex items-center text-gray-600">
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
                أسئلة غير محدودة لمساعد الذكاء الاصطناعي
              </li>
            </ul>
            <button
              className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={() => handleSelect(planIds[1])}
            >
              سجل الآن
            </button>
          </div>

          {/* Yearly Plan */}
          <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
              أفضل قيمة
            </div>
            <h3 className="text-2xl font-bold text-grey-900 text-center mb-4">
              اشتراك سنوي
            </h3>
            <p className="text-center text-gray-500 mb-6">
              <span className="text-4xl font-extrabold text-grey-900">12000 دج</span>{" "}
              / السنة
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-600">
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
                30 تلميذ في الحصة
              </li>
              <li className="flex items-center text-gray-600">
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
                دروس مباشرة مع الاستاذ
              </li>
              <li className="flex items-center text-gray-600">
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
                مواضيع وموارد
              </li>
              <li className="flex items-center text-gray-600">
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
                كورسات مجانية
              </li>
              <li className="flex items-center text-gray-600">
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
                أسئلة غير محدودة لمساعد الذكاء الاصطناعي
              </li>
            </ul>
            <button
              className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={() => handleSelect(planIds[2])}
            >
              سجل الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
