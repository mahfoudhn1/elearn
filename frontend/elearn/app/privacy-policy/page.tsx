import React from "react";
import { FiMail, FiShield, FiUser, FiLock } from "react-icons/fi";

const PrivacyPolicyAr = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden p-8">
        <div className="text-right" dir="rtl">
          {/* Header with logo */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-600">سياسة الخصوصية</h1>
            <div className="bg-indigo-100 p-3 rounded-full">
              <FiShield className="text-indigo-600 text-2xl" />
            </div>
          </div>
          
          {/* Introduction */}
          <section className="mb-10 bg-indigo-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-indigo-700 mb-3 flex items-center">
              <FiUser className="ml-2" /> مقدمة
            </h2>
            <p className="text-gray-700 leading-relaxed">
              مرحبًا بكم في منصة <span className="font-bold text-indigo-600">رفعة</span>. نحن ندرك أهمية خصوصيتكم ونلتزم بحماية بياناتكم الشخصية. 
              توضح هذه السياسة كيفية جمعنا واستخدامنا وحماية معلوماتكم لتحسين تجربة التعليم والتعلم.
            </p>
          </section>
          
          {/* Data Collection */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2 border-indigo-100">
              المعلومات التي نجمعها
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="bg-indigo-100 text-indigo-600 p-1 rounded-full mr-2 mt-1">
                  •
                </span>
                <span>الاسم الكامل للمستخدم</span>
              </li>
              <li className="flex items-start">
                <span className="bg-indigo-100 text-indigo-600 p-1 rounded-full mr-2 mt-1">
                  •
                </span>
                <span>رقم الهاتف</span>
              </li>
              <li className="flex items-start">
                <span className="bg-indigo-100 text-indigo-600 p-1 rounded-full mr-2 mt-1">
                  •
                </span>
                <span>البريد الإلكتروني</span>
              </li>
              <li className="flex items-start">
                <span className="bg-indigo-100 text-indigo-600 p-1 rounded-full mr-2 mt-1">
                  •
                </span>
                <span>المستوى الدراسي (للطلاب)</span>
              </li>
              <li className="flex items-start">
                <span className="bg-indigo-100 text-indigo-600 p-1 rounded-full mr-2 mt-1">
                  •
                </span>
                <span>المستوى التعليمي للمعلمين وما يدرسون</span>
              </li>
            </ul>
          </section>
          
          {/* Usage */}
          <section className="mb-10 bg-blue-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-blue-700 mb-3">
              كيفية استخدام المعلومات
            </h2>
            <p className="text-gray-700 leading-relaxed">
              نستخدم البيانات التي تقدمها لتسهيل عملية العثور على المعلمين المناسبين للطلاب، 
              وتحسين تجربة التعليم والتعلم بشكل عام. البيانات تستخدم حصرًا لهذه الأغراض ولن 
              يتم مشاركتها مع أي أطراف خارجية.
            </p>
          </section>
          
          {/* Security */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <FiLock className="ml-2" /> حماية البيانات
            </h2>
            <div className="bg-green-50 p-5 rounded-lg border border-green-100">
              <p className="text-gray-700 mb-3">
                نحرص على حماية بياناتكم من خلال:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 p-1 rounded-full mr-2 mt-1">
                    •
                  </span>
                  <span>خوادم آمنة</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 p-1 rounded-full mr-2 mt-1">
                    •
                  </span>
                  <span>تشفير كلمات المرور</span>
                </li>
              </ul>
            </div>
          </section>
          
          {/* User Rights */}
          <section className="mb-10 bg-purple-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-purple-700 mb-3">
              حقوق المستخدم
            </h2>
            <p className="text-gray-700 leading-relaxed">
              لديكم الحق في طلب حذف بياناتكم الشخصية في أي وقت عن طريق التواصل معنا عبر 
              البريد الإلكتروني المذكور أدناه. سنقوم بالرد على طلبكم خلال فترة زمنية معقولة.
            </p>
          </section>
          
          {/* Contact */}
          <section className="bg-gray-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <FiMail className="ml-2" /> التواصل معنا
            </h2>
            <div className="flex items-center justify-end">
              <a 
                href="mailto:contact@riffaa.com" 
                className="bg-purple  text-white px-5 py-2 rounded-lg transition duration-200 flex items-center"
              >
                contact@riffaa.com
                <FiMail className="mr-2" />
              </a>
            </div>
          </section>
          
          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8 text-center">
            <p className="text-sm text-gray-500">
              آخر تحديث: {new Date().toLocaleDateString('ar-EG')}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              © {new Date().getFullYear()} رفعة. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyAr;