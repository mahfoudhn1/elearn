import { ChartAreaIcon, CheckCheckIcon, CogIcon, Computer, DollarSignIcon, GiftIcon, GroupIcon, Play, School2, VideoIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "كيف تعمل المنصة؟",
  description: "كيف يتم التدريس على منصة رفعة التعليمية",
}
export default function StudentOnboarding() {
  const benefits = [
    {
      icon: <Play className="w-10 h-10 text-amber-500" />,
      title: "دروس مباشرة",
      description: "تفاعل مع أساتذتك في الوقت الحقيقي عبر البث المباشر"
    },
    {
      icon: <School2 className="w-10 h-10 text-emerald-500" />,
      title: "أدوات مساعدة في التعليم",
      description: "الوصول إلى عدة ادوات تساعد على الحفظ و أخذ ملاحظات"
    },
    {
      icon: <Computer className="w-10 h-10 text-blue-500" />,
      title: "تعلم من أي مكان",
      description: "استخدم المنصة على هاتفك أو حاسوبك"
    },
    {
      icon: <GiftIcon className="w-10 h-10 text-purple-500" />,
      title: "خصومات خاصة",
      description: "وفر حتى 30% مع الاشتراكات الفصلية"
    },
    {
      icon: <GroupIcon className="w-10 h-10 text-rose-500" />,
      title: "مجتمع تعليمي",
      description: "انضم إلى مجموعات الدراسة مع زملائك"
    },
    {
      icon: <ChartAreaIcon className="w-10 h-10 text-blue-500" />,
      title: "تتبع تقدمك",
      description: "احصل على تقارير أداء شهرية"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      {/* Animated Header */}
      <header className="bg-gradient-to-r from-sky-400 to-blue-500 text-white py-8 shadow-lg">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2 animate-pulse">
            <span className="font-arabic">رفعة</span>
            <span className="font-sans">Riffaa</span>
          </h1>
          <p className="text-xl text-amber-100">منصتك التعليمية الذكية</p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            رحلتك التعليمية تبدأ من هنا!
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            احصل على أفضل الخبرات التعليمية من كبار الأساتذة عبر الإنترنت
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {benefits.map((item, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-2xl shadow-md hover:scale-105 transition-transform duration-300 border-l-4 border-amber-400"
            >
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>

        {/* How to Join */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-16 max-w-4xl mx-auto">
          <div className="md:flex">
            <div className="p-8 md:p-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <School2 className="w-8 h-8 ml-3 text-amber-600" />
                كيف تنضم إلى رفعة؟
              </h3>
              <ol className="space-y-6 text-lg">
                <li className="flex items-start">
                  <span className="bg-sky-400 text-white rounded-full w-8 h-8 flex items-center justify-center ml-3">1</span>
                  <span>اختر الأستاذ المناسب لمستواك</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-sky-400 text-white rounded-full w-8 h-8 flex items-center justify-center ml-3">2</span>
                  <span>اختر بين الاشتراك الشهري أو الفصلي</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-sky-400 text-white rounded-full w-8 h-8 flex items-center justify-center ml-3">3</span>
                  <span>ابدأ حضور الدروس فور تفعيل الاشتراك</span>
                </li>
              </ol>
            </div>
            <div className="bg-amber-100 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-amber-600 mb-2">24</div>
                <div className="text-gray-700">ساعة</div>
                <p className="text-gray-600 mt-4">أقصى مدة لتفعيل اشتراكك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        {/* <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-amber-400 transition">
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-gray-800">الاشتراك الشهري</h4>
              <div className="text-4xl font-bold text-amber-600 my-3">199 ر.س</div>
              <p className="text-gray-500">يناسب التجربة الأولى</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                <span>جميع الدروس المباشرة</span>
              </li>
              <li className="flex items-start">
                <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                <span>الوصول للمسجلة لمدة شهر</span>
              </li>
              <li className="flex items-start">
                <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                <span>دردشة مباشرة مع الأستاذ</span>
              </li>
            </ul>
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition">
              اشترك الآن
            </button>
          </div>

          <div className="bg-white border-2 border-amber-400 rounded-xl p-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 transform rotate-12 translate-x-4 -translate-y-2">
              الأكثر توفيراً
            </div>
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-gray-800">الاشتراك الفصلي</h4>
              <div className="text-4xl font-bold text-amber-600 my-3">499 ر.س</div>
              <p className="text-gray-500">وفر 20% مقارنة بالشهري</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                <span>كل مميزات الاشتراك الشهري</span>
              </li>
              <li className="flex items-start">
                <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                <span>الوصول للمسجلة لمدة 3 أشهر</span>
              </li>
              <li className="flex items-start">
                <CheckCheckIcon className="w-5 h-5 text-green-500 mt-0.5 ml-2" />
                <span>جلسات تقييم شخصية مجانية</span>
              </li>
            </ul>
            <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition">
              اشترك الآن
            </button>
          </div>
        </div> */}

        {/* Testimonials */}
        {/* <div className="bg-gray-50 rounded-2xl p-10 mb-16">
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-10">آراء طلابنا</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "المنصة غيرت طريقة تعلمي تماماً، أصبحت أفهم المواد الصعبة بسهولة",
                name: "أحمد السعيد",
                grade: "الصف الثالث ثانوي"
              },
              {
                quote: "الأساتذة ممتازون والجودة عالية جداً، أنصح الجميع",
                name: "نورا محمد",
                grade: "الصف الأول ثانوي"
              },
              {
                quote: "وفرت علي الوقت والجهد في الذهاب للمدرسين الخصوصيين",
                name: "خالد الفهد",
                grade: "الصف الثاني متوسط"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="text-amber-400 mb-4">★★★★★</div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                <div className="font-semibold text-gray-800">{testimonial.name}</div>
                <div className="text-sm text-gray-500">{testimonial.grade}</div>
              </div>
            ))}
          </div>
        </div> */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-16">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <VideoIcon className="w-6 h-6 mr-2 text-blue-600" />
                  كيف تعمل المنصة؟
                </h3>
                <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                  <button className="bg-sky-400 text-white p-4 rounded-full hover:bg-blue-700 transition">
                    ▶ تشغيل الفيديو التوضيحي
                  </button>
                </div>
              </div>
        </div>
        {/* Final CTA */}
        <div className="text-center bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-10 shadow-lg">
          <h3 className="text-2xl font-bold text-white mb-4">جاهز لبدء رحلتك التعليمية؟</h3>
          <p className="text-amber-100 mb-6 text-lg">سجل الآن واحصل على درس تجريبي مجاني</p>
          <Link href={'/login'}>
          <button className="bg-white text-amber-300 hover:bg-gray-100 font-bold py-3 px-10 rounded-full text-lg transition shadow-md">
            انضم إلينا اليوم
          </button>
          
          </Link>
        </div>
      </section>

      {/* Footer */}
      
    </div>
  );
}