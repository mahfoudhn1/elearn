import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faLaptop, faWifi, faChalkboard, faTabletAlt } from '@fortawesome/free-solid-svg-icons';
import Head from 'next/head';
import Link from 'next/link';

export default function TeacherRequirements() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Head>
        <title>متطلبات التدريس على منصة رفعة</title>
      </Head>

      {/* Hero Section */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">كيف تبدأ التدريس على رفعة؟</h1>
          <p className="text-xl text-sky-400 max-w-3xl mx-auto">
            كل ما تحتاجه لتحقيق تجربة تدريس ممتازة لطلابك
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex border-b pb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-gray-dark h-10 w-10 ml-2" />
              المتطلبات الأساسية
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Tech Requirements */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faLaptop} className="text-gray-800 h-10 w-10 ml-2" />
                  المتطلبات التقنية
                </h3>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                    <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">-</span>
                    <span>اتصال إنترنت مستقر (10 ميجابت/ثانية للتحميل على الأقل)</span>
                  </li>
                  <li className="flex items-start">
                  <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">-</span>
                  <span>جهاز كمبيوتر حديث مع كاميرا ويب واضحة</span>
                  </li>
                  <li className="flex items-start">
                  <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">-</span>
                  <span>سماعات رأس مع ميكروفون واضح (يفضل مع عازل للضوضاء)</span>
                  </li>
                </ul>
              </div>

              {/* Teaching Setup */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faChalkboard} className="text-gray-800 h-10 w-10  ml-2" />
                  إعدادات التدريس
                </h3>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                  <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">-</span>
                  <span>مكان هادئ مع إضاءة جيدة (يفضل استخدام خلفية محايدة)</span>
                  </li>
                  <li className="flex items-start">
                  <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">-</span>
                  <span>لوحة كتابة إلكترونية لشرح الدروس بشكل تفاعلي</span>
                  </li>
                  <li className="flex items-start">
                  <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">-</span>
                  <span>إعداد العروض التقديمية أو المواد التعليمية مسبقاً</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
              نصائح للتدريس الفعال
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">التفاعل مع الطلاب</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-indigo-600 ml-2">•</span>
                    <span>استخدم الأسئلة التفاعلية كل 10 دقائق</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 ml-2">•</span>
                    <span>خصص وقتاً للإجابة على أسئلة الطلاب</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 ml-2">•</span>
                    <span>استخدم أدوات التفاعل مثل الاختبارات القصيرة</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">تحسين الجودة</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-indigo-600 ml-2">•</span>
                    <span>سجل دروسك للطلاب الذين لا يستطيعون الحضور</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 ml-2">•</span>
                    <span>قسّم المحتوى إلى أجزاء لا تتجاوز 20 دقيقة</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 ml-2">•</span>
                    <span>قدم ملخصات ومواد مرجعية بعد كل درس</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
            <Link href={"/loging"}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition shadow-lg">
            ابدأ التدريس الآن
          </button>
            </Link>
        </div>
      </div>
    </div>
  );
}