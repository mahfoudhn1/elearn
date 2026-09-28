'use client';

import { useState } from 'react';
import axiosClientInstance from "../lib/axiosInstance";

import Turnstile from 'react-turnstile';
import Select from 'react-select';

// قائمة المواد
const subjectsOptions = [
  { value: 'math', label: '📐 رياضيات' },
  { value: 'science', label: '🌱 علوم طبيعية' },
  { value: 'physics', label: '🔬 فيزياء' },
  { value: 'chemistry', label: '⚗️ كيمياء' },
  { value: 'arabic', label: '🖋️ لغة عربية' },
  { value: 'french', label: '🇫🇷 لغة فرنسية' },
  { value: 'english', label: '🇬🇧 لغة إنجليزية' },
  { value: 'history', label: '📜 تاريخ' },
  { value: 'geography', label: '🗺️ جغرافيا' },
  { value: 'philosophy', label: '🤔 فلسفة' },
  { value: 'economy', label: '💹 اقتصاد' },
  { value: 'islamic', label: '☪️ علوم إسلامية' },
];

// لغات للدراسة
const languagesOptions = [
  { value: 'english', label: '🇬🇧 الإنجليزية' },
  { value: 'french', label: '🇫🇷 الفرنسية' },
  { value: 'german', label: '🇩🇪 الألمانية' },
  { value: 'spanish', label: '🇪🇸 الإسبانية' },
  { value: 'italian', label: '🇮🇹 الإيطالية' },
];

const StudentFormPage = () => {
  const [formData, setFormData] = useState({
    role: '',
    name: '',
    family_name: '',
    phone_number: '',
    education_level: '',
    year: '',
    branch: '',
    language_choice: '',
    subjects: [] as string[],
  });
  const [token, setToken] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ التحقق من المدخلات
  const validateForm = () => {
    if (!formData.role) return 'من فضلك اختر إذا كنت طالباً أو ولي أمر';
    if (!formData.name.trim()) return 'الاسم مطلوب';
    if (!formData.family_name.trim()) return 'اللقب مطلوب';
    if (!/^[0-9]{8,15}$/.test(formData.phone_number)) return 'رقم الهاتف غير صحيح (بين 8 و 15 رقم)';
    if (!formData.education_level) return 'من فضلك اختر المستوى الدراسي';
    if (formData.education_level === 'middle' && !formData.year) return 'من فضلك اختر السنة الدراسية';
    if (formData.education_level === 'high' && !formData.year) return 'من فضلك اختر السنة الدراسية';
    if (formData.education_level === 'high' && formData.year && !formData.branch)
      return 'من فضلك اختر الشعبة';
    if (formData.education_level === 'languages' && !formData.language_choice)
      return 'من فضلك اختر اللغة المراد دراستها';
    if (formData.subjects.length === 0) return 'اختر مادة واحدة على الأقل';
    if (!token) return 'الرجاء التحقق من الكابتشا';
    return '';
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ✅ تحديث المواد المختارة
  const handleSubjectChange = (selected: any) => {
    setFormData({
      ...formData,
      subjects: selected ? selected.map((s: any) => s.value) : []
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

  e.preventDefault();
  setMessage('');
  setIsLoading(true);

  const error = validateForm();
  if (error) {
    setMessage(error);
    return;
  }

  try {
    // 🔹 Create FormData
    const formDataToSend = new FormData();
    formDataToSend.append('role', formData.role);
    formDataToSend.append('name', formData.name);
    formDataToSend.append('family_name', formData.family_name);
    formDataToSend.append('phone_number', formData.phone_number);
    formDataToSend.append('education_level', formData.education_level);
    formDataToSend.append('year', formData.year);
    formDataToSend.append('branch', formData.branch);
    formDataToSend.append('language_choice', formData.language_choice);
    formDataToSend.append('captcha', token);
    // 🔹 Append subjects as a JSON string
    formDataToSend.append("subjects", JSON.stringify(formData.subjects));

    const response = await axiosClientInstance.post('/studentform/', formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log(response)
    if (response.status === 201) {
      setMessage('تم إرسال الاستمارة بنجاح سنتصل بك فور اكتمال المجموعة الدراسية ✅');
      setFormData({
        role: '',
        name: '',
        family_name: '',
        phone_number: '',
        education_level: '',
        year: '',
        branch: '',
        language_choice: '',
        subjects: []
      });
    } else {
      setMessage('حدث خطأ، حاول مرة أخرى.');
    }
  } catch (error) {
    console.error(error);
    setMessage('حدث خطأ، حاول مرة أخرى.');
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg">
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-orange-700">عدد المقاعد المتبقي</span>
            <span className="text-sm font-medium text-orange-700">92%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: '92%' }}></div>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center text-grey-900">
          املأ الاستمارة و احجز مكان في أفضل منصة تعليمية 
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* الدور */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">هل انت ولي ام طالب</label>
            <div className="flex items-center justify-around p-2 bg-gray-200 rounded-lg">
              <label className={`flex-1 text-center p-2 rounded-lg cursor-pointer ${formData.role === 'student' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={handleChange}
                  className="hidden"
                />
                طالب
              </label>
              <label className={`flex-1 text-center p-2 rounded-lg cursor-pointer ${formData.role === 'parent' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>
                <input
                  type="radio"
                  name="role"
                  value="parent"
                  checked={formData.role === 'parent'}
                  onChange={handleChange}
                  className="hidden"
                />
                ولي أمر
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            {/* الاسم */}
            <div className="flex-1">
              <label className="block text-gray-700 font-bold mb-2">الاسم</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            {/* اللقب */}
            <div className="flex-1">
              <label className="block text-gray-700 font-bold mb-2">اللقب</label>
              <input
                type="text"
                name="family_name"
                value={formData.family_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>

          {/* الهاتف */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">رقم الهاتف</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              pattern="[0-9]{8,15}"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <p className="text-xs text-gray-500">(8 إلى 15 رقم بدون مسافات أو رموز)</p>
          </div>

          {/* المستوى الدراسي */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">المستوى الدراسي</label>
            <select
              name="education_level"
              value={formData.education_level}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">-- اختر --</option>
              <option value="middle">متوسط</option>
              <option value="high">ثانوي</option>
              <option value="languages">دراسات لغات</option>
            </select>
          </div>

          {/* سنوات المتوسط */}
          {formData.education_level === 'middle' && (
            <div>
              <label className="block text-gray-700 font-bold mb-2">السنة</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">-- اختر --</option>
                <option value="1">الأولى متوسط</option>
                <option value="2">الثانية متوسط</option>
                <option value="3">الثالثة متوسط</option>
                <option value="4">الرابعة متوسط</option>
              </select>
            </div>
          )}

          {/* ثانوي */}
          {formData.education_level === 'high' && (
            <>
              <div>
                <label className="block text-gray-700 font-bold mb-2">السنة</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">-- اختر --</option>
                  <option value="1">الأولى ثانوي</option>
                  <option value="2">الثانية ثانوي</option>
                  <option value="3">الثالثة ثانوي</option>
                </select>
              </div>

              {/* الشعب للسنة الأولى */}
              {formData.year === '1' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-2">الشعبة</label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">-- اختر --</option>
                    <option value="literature">آداب</option>
                    <option value="science">علوم</option>
                  </select>
                </div>
              )}

              {/* الشعب للسنة الثانية أو الثالثة */}
              {(formData.year === '2' || formData.year === '3') && (
                <div>
                  <label className="block text-gray-700 font-bold mb-2">الشعبة</label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">-- اختر --</option>
                    <option value="math">رياضيات</option>
                    <option value="technical_math">رياضيات تقنية</option>
                    <option value="science">علوم</option>
                    <option value="literature">آداب وفلسفة</option>
                    <option value="economy">اقتصاد</option>
                    <option value="foreign_languages">لغات أجنبية</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* لغات */}
          {formData.education_level === 'languages' && (
            <div>
              <label className="block text-gray-700 font-bold mb-2">اختر اللغة المراد دراستها</label>
              <select
                name="language_choice"
                value={formData.language_choice}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">-- اختر --</option>
                {languagesOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* ✅ المواد (باستخدام react-select) */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">المواد</label>
            <Select
              options={subjectsOptions}
              isMulti
              value={subjectsOptions.filter((s) =>
                formData.subjects.includes(s.value)
              )}
              onChange={handleSubjectChange}
              placeholder="اختر مادة أو أكثر..."
              className="text-right"
              menuPosition="fixed"
              styles={{
                menu: (provided) => ({ ...provided, zIndex: 9999 }),
                control: (base) => ({
                  ...base,
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.75rem',
                  padding: '4px',
                  borderColor: '#d1d5db',
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#fde68a',
                  borderRadius: '0.5rem',
                }),
              }}
            />
          </div>

          {/* الكابتشا */}
          <Turnstile
            sitekey="0x4AAAAAABCXUolhlT329THY"
            onVerify={(token) => setToken(token)}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out disabled:bg-orange-400"
          >
            {isLoading ? 'جاري التسجيل...' : (
              <>
                <span>تسجيل</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </>
            )}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-red-600 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export default StudentFormPage;
