import React, { useState } from 'react';
import { UploadCloud, File, X, CheckCircle } from 'lucide-react';
import { validateFile, fileUploadService } from '../../utils/fileUpload';
import LoadingSpinner from './LoadingSpinner';

export default function FileUpload({ onUploadSuccess, label = 'Upload Document or Receipt', acceptedTypes = '.jpg,.png,.webp,.pdf' }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validation = validateFile(selected);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setError('');
    setFile(selected);
    setIsUploading(true);

    try {
      const result = await fileUploadService.uploadDocument(selected);
      if (onUploadSuccess) onUploadSuccess(result);
    } catch (err) {
      setError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}
      <div className="border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-xl p-4 text-center bg-slate-50 hover:bg-white transition-all cursor-pointer relative">
        <input
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2 text-xs text-slate-500">
            <LoadingSpinner size="md" />
            <span className="mt-2 font-medium">Uploading attachment...</span>
          </div>
        ) : file ? (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2">
            <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
            <p className="text-xs font-semibold text-slate-700">Click to upload or drag and drop</p>
            <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP or PDF (Max 5MB)</p>
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
