import { ChartAreaIcon, CheckCheckIcon, CogIcon, DollarSignIcon, GroupIcon, VideoIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'شروط العمل معنا - رفعة',
  description: 'شروط العمل لمنصة رفعة التعليمية',
};

export default function TeacherOnboarding() {
  const steps = [
    {
      icon: <CogIcon className="w-8 h-8" />,
      title: "إنشاء حساب",
      description: "سجل كأستاذ واملأ ملفك الشخصي بخبراتك واختصاصك"
    },
    {
      icon: <VideoIcon className="w-8 h-8" />,
      title: "جدولة الدروس",
      description: "أنشئ جدولاً للبث المباشر أو رفع الدروس المسجلة"
    },
    {
      icon: <GroupIcon className="w-8 h-8" />,
      title: "إدارة الطلاب",
      description: "تواصل مع المشتركين عبر غرفة الدردشة الخاصة"
    },
    {
      icon: <DollarSignIcon className="w-8 h-8" />,
      title: "تحصيل الأرباح",
      description: "احصل على مدفوعات شهرية/فصلية حسب اشتراكات الطلاب"
    },
    {
      icon: <ChartAreaIcon className="w-8 h-8" />,
      title: "تتبع الأداء",
      description: "راجع إحصائيات حضور الطلاب وتقييماتهم"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b to-white" dir="rtl">
      {/* Header */}
      <header className="bg-blue-700 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center">
            <span className="font-arabic text-4xl">منصة رفعة التعليمية</span>
            <br />
            <span className="text-blue-200">Riffaa Educational Platform</span>
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            مرحباً بكم في نظام الأساتذة
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            دليل تفاعلي لمساعدتكم في تحقيق أقصى استفادة من منصتنا لتعليم الطلاب عبر الإنترنت
          </p>
        </div>

        {/* Platform Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-blue-600 mb-4">{step.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works Video */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-16">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <VideoIcon className="w-6 h-6 ml-2 text-blue-600" />
              كيف تعمل المنصة؟
            </h3>
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
              <button className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition">
                ▶ تشغيل الفيديو التوضيحي
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-blue-50 rounded-xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-6">نموذج الربح</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold text-lg mb-3 flex items-center">
                <DollarSignIcon className="w-5 h-5 ml-2 text-green-500" />
                الاشتراكات الشهرية
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                  <span>تحصل على 70% من قيمة الاشتراك</span>
                </li>
                <li className="flex items-start">
                  <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                  <span>دفعات شهرية منتظمة</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold text-lg mb-3 flex items-center">
                <DollarSignIcon className="w-5 h-5 ml-2 text-blue-500" />
                الاشتراكات الفصلية
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                  <span>تحصل على 80% من قيمة الاشتراك</span>
                </li>
                <li className="flex items-start">
                  <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                  <span>خصم 10% للطلاب عند الاشتراك الفصلي</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
            <Link href={"/loging"}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition">
              البدء كأستاذ على المنصة
          </button>
            </Link>
          <p className="text-gray-500 mt-4">سيتم توثيق حسابك خلال 24 ساعة</p>
        </div>
      </section>

      {/* Footer */}

    </div>
  );
}