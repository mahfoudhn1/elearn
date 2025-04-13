import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faUserGraduate, faBookOpen, faClock } from '@fortawesome/free-solid-svg-icons';
import Head from 'next/head';

export default function StudentRequirements() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Head>
        <title>متطلبات الدراسة على منصة رفعة</title>
      </Head>

      {/* Hero Section */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">كيف تدرس بشكل فعال على رفعة؟</h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto">
            استعد لتحقيق أقصى استفادة من تجربة التعلم الخاصة بك
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex border-b pb-4">
            <FontAwesomeIcon icon={faCheckCircle} className="text-gray-dark h-10 w-10 ml-2" />
            متطلبات الدراسة الأساسية
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Tech Requirements */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faUserGraduate} className="text-gray-dark h-10 w-10  ml-2" />
                  المتطلبات التقنية
                </h3>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">1</span>
                    <span>اتصال إنترنت مستقر (5 ميجابت/ثانية على الأقل)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">2</span>
                    <span>جهاز كمبيوتر أو جهاز لوحي مع مكبرات صوت</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">3</span>
                    <span>تطبيق منصة رفعة أو متصفح حديث (كرووم، فايرفوكس)</span>
                  </li>
                </ul>
              </div>

              {/* Study Environment */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faBookOpen} className="text-gray-dark h-10 w-10  ml-2" />
                  بيئة الدراسة
                </h3>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">1</span>
                    <span>مكان هادئ خالٍ من المشتتات</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">2</span>
                    <span>إضاءة جيدة وكرسي مريح</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center ml-3 flex-shrink-0">3</span>
                    <span>دفتر ملاحظات وأدوات كتابة</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Study Tips */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
              نصائح للدراسة الفعالة
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">أثناء الدرس</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-600 ml-2">•</span>
                    <span>كن مستعداً بطرح الأسئلة عند الحاجة</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 ml-2">•</span>
                    <span>شارك في الأنشطة التفاعلية</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 ml-2">•</span>
                    <span>استخدم خاصية التكبير لرؤية الشرح بوضوح</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">بعد الدرس</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-600 ml-2">•</span>
                    <span>راجع الملاحظات فور انتهاء الدرس</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 ml-2">•</span>
                    <span>استمع للتسجيل إذا كنت متعباً أثناء الحصة</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 ml-2">•</span>
                    <span>حل الواجبات في نفس اليوم</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Time Management */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <FontAwesomeIcon icon={faClock} className="text-gray-dark h-10 w-10  ml-2" />
              إدارة الوقت
            </h2>
            
            <div className="space-y-4 text-gray-600">
              <p>
                لتحقيق أفضل نتائج من دراستك على منصة رفعة، ننصحك باتباع الجدول التالي:
              </p>
              
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">الجدول المقترح:</h4>
                <ul className="space-y-2 mx-auto md:w-1/3 w-full">
                  <li className="flex justify-between">
                    <span>10 دقائق</span>
                    <span>الاستعداد المسبق ومراجعة الدرس السابق</span>
                  </li>
                  <li className="flex justify-between">
                    <span>40-50 دقيقة</span>
                    <span>التركيز الكامل أثناء الدرس</span>
                  </li>
                  <li className="flex justify-between">
                    <span>10 دقائق</span>
                    <span>تلخيص النقاط الرئيسية</span>
                  </li>
                  <li className="flex justify-between">
                    <span>20 دقيقة</span>
                    <span>حل التمارين بعد ساعة من الدرس</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition shadow-lg">
            ابدأ التعلم الآن
          </button>
        </div>
      </div>
    </div>
  );
}