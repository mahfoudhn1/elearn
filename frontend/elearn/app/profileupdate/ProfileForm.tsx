import React, { useState } from "react";
import { User } from "../types/student";

interface ProfileFormProps {
  user: User;
  onSubmit: (data: Partial<User>, avatarFile?: File) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  
    avatar_file: user?.avatar_file || '', // Keep as string (URL)
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_file || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Separate state for file

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          type="text"
          name="username"
          value={formData.username || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">First Name</label>
        <input
          type="text"
          name="first_name"
          value={formData.first_name || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Last Name</label>
        <input
          type="text"
          name="last_name"
          value={formData.last_name || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
        {avatarPreview && (
          <img src={avatarPreview} alt="Avatar Preview" className="w-20 h-20 rounded-full mb-2" />
        )}
        <input
          type="file"
          name="avatar_file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Save Changes
      </button>
    </form>
  );
};

export default ProfileForm;
