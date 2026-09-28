import { faCheckCircle, faVideo, faChalkboardTeacher, faMobileAlt, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const LanguageLearningSection = () => {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-gray-50 py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center bg-white w-20 h-20 rounded-full shadow-md mb-6">
            <FontAwesomeIcon icon={faGlobe} className="text-blue-600 text-3xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            تعلّم لغات العالم بسهولة واحترافية
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            انطلق في رحلة تعلم اللغة مع أفضل المعلمين وأحدث الطرق التعليمية
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left: Image with flags */}
          <div className="relative">
            <img
              src="/languages.jpg"
              alt="Learning languages"
              className="rounded-2xl w-full h-auto object-cover shadow-xl border-4 border-white"
              style={{ maxHeight: "380px" }}
            />
            
            {/* Floating flags decoration */}
            <div className="absolute -top-5 -left-5 bg-white p-2 rounded-full shadow-md">
              <span className="text-2xl">🇬🇧</span>
            </div>
            <div className="absolute -bottom-5 -right-5 bg-white p-2 rounded-full shadow-md">
              <span className="text-2xl">🇫🇷</span>
            </div>
            <div className="absolute top-1/3 -left-6 bg-white p-2 rounded-full shadow-md">
              <span className="text-2xl">🇪🇸</span>
            </div>
          </div>

          {/* Right: Content */}
          <div className="text-right">
            {/* Description */}
            {/* Features with FA icons */}
            <div className="space-y-5 mb-10">
              <div className="flex items-center justify-start gap-4 bg-blue-50 p-4 rounded-lg border-r-4 border-blue-500">
                <FontAwesomeIcon icon={faChalkboardTeacher} className="text-blue-600 text-2xl" />
                <div>
                  <h4 className="font-semibold text-gray-800">معلمون خبراء</h4>
                  <p className="text-gray-600 text-sm">متخصصون في تعليم اللغات</p>
                </div>
              </div>
              
              <div className="flex items-center justify-start gap-4 bg-orange-50 p-4 rounded-lg border-r-4 border-yellow-500">
                <FontAwesomeIcon icon={faVideo} className="text-yellow text-2xl" />
                <div>
                  <h4 className="font-semibold text-gray-800">دروس تفاعلية</h4>
                  <p className="text-gray-600 text-sm">مباشرة عبر الإنترنت</p>
                </div>
              </div>
              
              <div className="flex items-center justify-start gap-4 bg-orange-600-50 p-4 rounded-lg border-r-4 border-orange-600-500">
                <FontAwesomeIcon icon={faMobileAlt} className="text-orange-600-500 text-2xl" />
                <div>
                  <h4 className="font-semibold text-gray-800">تعلم في أي مكان</h4>
                  <p className="text-gray-600 text-sm">عبر جميع الأجهزة</p>
                </div>
              </div>
              

            </div>

            {/* CTA */}
            <div className="text-center">
              <a
                href="/languages"
                className="inline-block bg-gradient-to-r from-gray-600 to-gray-500 text-white px-8 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                ابدأ رحلتك التعليمية الآن
              </a>
              <p className="text-blue-500 text-sm mt-3">تجربة مجانية  </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LanguageLearningSection;