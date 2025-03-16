import React from "react";

interface PlansProps {
  onSelectPlan: (planId: number) => void;
}

export const PlanComponent: React.FC<PlansProps> = ({ onSelectPlan }) => {
  interface Plan {
    id: number;
    name: string;
  }

  const plans: Plan[] = [
    { id: 1, name: "Monthly Plan" },
    { id: 2, name: "Quarterly Plan" },
    { id: 3, name: "Yearly Plan" },
  ];

  const handleSelect = (planId: number) => {
    onSelectPlan(planId);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white">الاشتراكات</h2>
          <p className="mt-4 text-lg text-gray-300">
            اختر الخطة المناسبة لك واستفد من أفضل الخدمات التعليمية
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Monthly Plan */}
          <div className="bg-gray-800 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-white text-center mb-4">اشتراك شهري</h3>
            <p className="text-center text-gray-300 mb-6">
              <span className="text-4xl font-bold text-white">1500 دج</span> / الشهر
            </p>
            <ul className="space-y-3 mb-8">
              <li className="text-gray-300">30 تلميذ في الحصة</li>
              <li className="text-gray-300">دروس مباشرة مع الاستاذ</li>
              <li className="text-gray-300">مواضيع وموارد</li>
              <li className="text-gray-300">10 أسئلة مجانية لمساعد الذكاء الاصطناعي</li>
            </ul>
            <button
              className="w-full bg-white text-gray-900 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              onClick={() => handleSelect(plans[0].id)}
            >
              سجل الآن
            </button>
          </div>

          {/* Quarterly Plan */}
          <div className="bg-gray-800 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-white text-center mb-4">اشتراك فصلي</h3>
            <p className="text-center text-gray-300 mb-6">
              <span className="text-4xl font-bold text-white">4500 دج</span> / 3 أشهر
            </p>
            <ul className="space-y-3 mb-8">
              <li className="text-gray-300">30 تلميذ في الحصة</li>
              <li className="text-gray-300">دروس مباشرة مع الاستاذ</li>
              <li className="text-gray-300">مواضيع وموارد</li>
              <li className="text-gray-300">أسئلة غير محدودة لمساعد الذكاء الاصطناعي</li>
            </ul>
            <button
              className="w-full bg-white text-gray-900 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              onClick={() => handleSelect(plans[1].id)}
            >
              سجل الآن
            </button>
          </div>

          {/* Yearly Plan */}
          <div className="bg-gray-800 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-white text-center mb-4">اشتراك سنوي</h3>
            <p className="text-center text-gray-300 mb-6">
              <span className="text-4xl font-bold text-white">12000 دج</span> / السنة
            </p>
            <ul className="space-y-3 mb-8">
              <li className="text-gray-300">30 تلميذ في الحصة</li>
              <li className="text-gray-300">دروس مباشرة مع الاستاذ</li>
              <li className="text-gray-300">مواضيع وموارد</li>
              <li className="text-gray-300">كورسات مجانية</li>
              <li className="text-gray-300">أسئلة غير محدودة لمساعد الذكاء الاصطناعي</li>
            </ul>
            <button
              className="w-full bg-white text-gray-900 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              onClick={() => handleSelect(plans[2].id)}
            >
              سجل الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};