import React, { useState } from "react";
import { User } from "../types/student";

interface ProfileFormProps {
  user: User;
  onSubmit: (data: Partial<User>, avatarFile?: File) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    username: user?.username || "",
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    avatar_file: user?.avatar_file || "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.avatar_file || null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, avatarFile || undefined);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-lg space-y-6"
    >
      <h2 className="text-2xl font-semibold text-gray-800 text-center">
        التعديل على الملف الشخصي
      </h2>

      {/* Username */}
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="block text-sm font-medium text-gray-600"
        >
          اسم المستخدم
        </label>
        <input
          id="username"
          type="text"
          name="username"
          value={formData.username || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
          placeholder="Enter your username"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-600"
        >
          الايميل
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
          placeholder="Enter your email"
        />
      </div>

      {/* First Name */}
      <div className="space-y-2">
        <label
          htmlFor="first_name"
          className="block text-sm font-medium text-gray-600"
        >
          الاسم الأول
        </label>
        <input
          id="first_name"
          type="text"
          name="first_name"
          value={formData.first_name || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
          placeholder="Enter your first name"
        />
      </div>

      {/* Last Name */}
      <div className="space-y-2">
        <label
          htmlFor="last_name"
          className="block text-sm font-medium text-gray-600"
        >
          اسم العائلة
        </label>
        <input
          id="last_name"
          type="text"
          name="last_name"
          value={formData.last_name || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
          placeholder="Enter your last name"
        />
      </div>

      {/* Profile Picture */}
      <div className="space-y-2">
        <label
          htmlFor="avatar_file"
          className="block text-sm font-medium text-gray-600"
        >
          الصورة الشخصية
        </label>
        <div className="flex items-center space-x-4">
          {avatarPreview && (
            <img
              src={avatarPreview}
              alt="Avatar Preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
          )}
          <label className="flex-1">
            <span className="inline-block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors text-center">
              Choose Image
            </span>
            <input
              id="avatar_file"
              type="file"
              name="avatar_file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium"
      >
        حفظ
      </button>
    </form>
  );
};

export default ProfileForm;