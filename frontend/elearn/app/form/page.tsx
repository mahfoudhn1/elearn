"use client";
import React, { useEffect, useState } from "react";
import axiosClientInstance from "../lib/axiosInstance";

interface Equipment {
  computer: string;
  tablet: string;
  webcam: string;
}

interface FormDataState {
  name: string;
  familyName: string;
  phone: string;
  email: string;
  wilaya: string;
  grade: string;
  teachingGrade:string;
  yearsOfExperience:string;
  subject: string;
  onlineExperience: string;
  teachingExperience: string;
  privateLessons: string;
  degreeCertificate: File | null;
  equipment: Equipment;
}

interface City {
  city: string;
  admin_name: string;
}

export default function TeacherApplicationForm() {
  const [wilayas, setWilayas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // 👈 Loading state

  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    familyName: "",
    phone: "",
    email: "",
    wilaya: "",
    grade: "",
    teachingGrade:"",
    yearsOfExperience:"",
    subject: "",
    onlineExperience: "",
    teachingExperience: "",
    privateLessons: "",
    degreeCertificate: null,
    equipment: {
      computer: "no",
      tablet: "no",
      webcam: "no",
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, degreeCertificate: e.target.files[0] });
    }
  };

  const handleEquipmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      equipment: { ...formData.equipment, [name]: value },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); 
    const data = new FormData();
    (Object.entries(formData) as [string, any][]).forEach(([key, value]) => {
      if (key === "equipment" && value) {
        Object.entries(value as Equipment).forEach(([eqKey, eqValue]) => {
          data.append(eqKey, eqValue.toString());
        });
      } else if (key === "degreeCertificate" && value instanceof File) {
        data.append("degreeCertificate", value);
      } else if (value !== null && value !== undefined) {
        data.append(key, String(value));
      }
    });

    try {
      const res = await axiosClientInstance.post("/forms/", data);
      if (res.data) {
        alert("شكراً لك! سنتصل بك قريباً ✅");
        setFormData({
          name: "",
          familyName: "",
          phone: "",
          email: "",
          wilaya: "",
          grade: "",
          teachingGrade:"",
          yearsOfExperience:"",
          subject: "",
          onlineExperience: "",
          teachingExperience: "",
          privateLessons: "",
          degreeCertificate: null,
          equipment: { computer: "no", tablet: "no", webcam: "no" },
        });
      } else {
        alert("حدث خطأ ما ❌");
      }
    } catch (error) {
      alert("حدث خطأ ما ❌");
    }
  };

  useEffect(() => {
    fetch("/data/wilaya.json")
      .then((res) => res.json())
      .then((data: City[]) => {
        const uniqueWilayas = Array.from(new Set(data.map((c) => c.admin_name)));
        setWilayas(uniqueWilayas);
      })
      .catch((error) => console.error("Error fetching wilayas:", error));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-3xl space-y-6 transform transition-all duration-300"
      >
        <h2 className="text-3xl font-extrabold text-center text-orange-600 mb-6">
          استمارة التوظيف للمدرسين
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="أدخل الاسم"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اللقب</label>
            <input
              type="text"
              name="familyName"
              value={formData.familyName}
              onChange={handleChange}
              required
              placeholder="أدخل اللقب"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="أدخل رقم الهاتف"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="أدخل البريد الإلكتروني"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الولاية</label>
          <select
            name="wilaya"
            value={formData.wilaya}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          >
            <option value="">اختر الولاية</option>
            {wilayas.map((w: string, i: number) => (
              <option key={i} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الدرجة العلمية</label>
          <select
            name="grade"
            value={formData.grade}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          >
            <option value="">اختر الدرجة العلمية</option>
            <option value="bachelor">ليسانس</option>
            <option value="master">ماستر</option>
            <option value="phd">دكتوراه</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التخصص الدراسي</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder="أدخل التخصص الدراسي"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">شهادة التخرج</label>
          <input
            type="file"
            name="degreeCertificate"
            onChange={handleFileChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 transition duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            سنوات الخبرة
          </label>
          <select
            name="yearsOfExperience"
            value={formData.yearsOfExperience}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          >
            <option value="">اختر سنوات الخبرة</option>
            <option value="0-5">بين 0 و 5 سنوات</option>
            <option value="5+">أكثر من 5 سنوات</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الطور الذي تريد تدريسه</label>
          <select
            name="teachingGrade"
            value={formData.teachingGrade}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          >
            <option value="">اختر الطور</option>
            <option value="midschool">أستاذ تعليم متوسط</option>
            <option value="highschool">أستاذ تعليم ثانوي</option>
            <option value="languages">تعليم لغات</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            هل عملت من قبل في منصة تعليمية أو درست أونلاين؟
          </label>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="onlineExperience"
                value="نعم"
                required
                checked={formData.onlineExperience === "نعم"}
                onChange={(e) => setFormData({ ...formData, onlineExperience: e.target.value })}
                className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="mr-2 text-gray-700">نعم</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="onlineExperience"
                value="لا"
                required
                checked={formData.onlineExperience === "لا"}
                onChange={(e) => setFormData({ ...formData, onlineExperience: e.target.value })}
                className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="mr-2 text-gray-700">لا</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medi  um text-gray-700 mb-2">
            هل عملت من قبل في التدريس؟
          </label>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="teachingExperience"
                value="نعم"
                required
                checked={formData.teachingExperience === "نعم"}
                onChange={(e) => setFormData({ ...formData, teachingExperience: e.target.value })}
                className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="mr-2 text-gray-700">نعم</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="teachingExperience"
                value="لا"
                required
                checked={formData.teachingExperience === "لا"}
                onChange={(e) => setFormData({ ...formData, teachingExperience: e.target.value })}
                className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="mr-2 text-gray-700">لا</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            هل درست دروس خصوصية؟
          </label>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="privateLessons"
                value="نعم"
                required
                checked={formData.privateLessons === "نعم"}
                onChange={(e) => setFormData({ ...formData, privateLessons: e.target.value })}
                className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="mr-2 text-gray-700">نعم</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="privateLessons"
                value="لا"
                required
                checked={formData.privateLessons === "لا"}
                onChange={(e) => setFormData({ ...formData, privateLessons: e.target.value })}
                className="h-4 w-4 text-orange-600 focus:ring-orange border-gray-300"
              />
              <span className="mr-2 text-gray-700">لا</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">هل لديك الأدوات التالية؟</p>
          {(["computer", "tablet", "webcam"] as (keyof Equipment)[]).map((item) => (
            <div key={item} className="flex items-center gap-4 mb-4">
              <span className="w-32 text-gray-700">
                {item === "computer" && "حاسوب"}
                {item === "tablet" && "لوح إلكتروني"}
                {item === "webcam" && "كاميرا ويب"}
              </span>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={item}
                  value="yes"
                  checked={formData.equipment[item] === "yes"}
                  onChange={handleEquipmentChange}
                  required
                  className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="mr-2 text-gray-700">نعم</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={item}
                  value="no"
                  checked={formData.equipment[item] === "no"}
                  onChange={handleEquipmentChange}
                  required
                  className="h-4 w-4 text-orange-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="mr-2 text-gray-700">لا</span>
              </label>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading} 
          className={`w-full font-semibold py-3 px-4 rounded-lg transition duration-200 
            ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-600 hover:bg-grey-900 text-white"}
          `}
        >
          {loading ? "جاري الإرسال..." : "إرسال الطلب"}
        </button>
      </form>
    </div>
  );
}