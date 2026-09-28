import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
    {
      question: 'ما هي الخدمة التي تقدمونها؟',
      answer: 'نقدم مجموعة واسعة من الدورات و دروس الدعم لمختلف المستويات الدراسية. يمكنك التسجيل حسب مستواك الدراسي .',
    },
    {
      question: 'كيف يمكنني التسجيل ؟',
      answer: 'للتسجيل ، ما عليك سوى النقر على انشاء حساب و ادخال معلوماتك. سيتم إرشادك خلال عملية التسجيل.',
    },
    {
      question: 'هل الدروس مباشرة أم مسجلة؟',
      answer: 'نقدم كلا من دروس الدعم المباشرة والمسجلة. يمكنك اختيار الصيغة التي تناسبك في التعلم.',
    },

    {
      question: 'كيف يمكنني الاتصال بالدعم؟',
      answer: 'يمكنك الاتصال بفريق الدعم الخاص بنا من خلال صفحة الاتصال بنا أو عبر البريد الإلكتروني contact@riffaa.com.',
    },
  ];

const FAQ: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6 text-center">الاسئلة المطروحة غالبا</h2>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b border-gray">
            <button
              onClick={() => handleClick(index)}
              className="w-full text-right py-4 px-6 bg-white hover:bg-gray-light focus:outline-none"
            >
              <h3 className="text-xl font-semibold">{faq.question}</h3>
            </button>
            {activeIndex === index && (
              <div className="px-6 py-4 bg-white">
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
