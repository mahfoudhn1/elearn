"use client";
import { useState, FormEvent } from "react";
import axiosClientInstance from "../lib/axiosInstance";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const RiffaAiPage = () => {
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResponse("");

    const formData = new FormData();
    formData.append("prompt", prompt);
    if (pdfFile) {
      formData.append("pdf_file", pdfFile);
    }

    try {
      const result = await axiosClientInstance.post(
        "/ai/interact/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResponse(result.data.response);
    } catch (err: any){
      setError(
        err.response?.data?.detail || "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center">
      <div className="w-full max-w-3xl p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">
            مساعد رفعة الذكي
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            اطرح سؤالاً أو قم بتحميل ورقة اختبار للحصول على مساعدة خطوة بخطوة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="text-lg font-medium text-gray-800">
              سؤالك
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: اشرح نظرية فيثاغورس"
              className="mt-2 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base"
              rows={5}
              required
            ></textarea>
          </div>

          <div className="flex items-center space-x-4">
            <label
              htmlFor="pdfFile"
              className="cursor-pointer px-6 py-2 bg-orange-600 text-white rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <span>ارفع PDF</span>
              <input
                id="pdfFile"
                name="pdfFile"
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  setPdfFile(e.target.files ? e.target.files[0] : null)
                }
                className="sr-only"
              />
            </label>
            {pdfFile && (
              <p className="text-gray-600">
                الملف المختار: {pdfFile.name}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-400"
            >
              {isLoading ? "جاري الرد..." : "اسأل مساعد رفعة"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-medium">خطأ</p>
            <p>{error}</p>
          </div>
        )}

        {response && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              الاجابة
            </h2>
            <ReactMarkdown
              className="prose prose-lg max-w-none text-gray-700"
              remarkPlugins={[remarkGfm]}
            >
              {response}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiffaAiPage;