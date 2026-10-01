/**
 * File Upload Utility Abstraction
 * Ready for Supabase Storage bucket integration later.
 */

export const MAX_FILE_SIZE_MB = 5;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const validateFile = (file) => {
  if (!file) return { isValid: false, error: 'No file selected' };

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { isValid: false, error: `File size exceeds max limit of ${MAX_FILE_SIZE_MB}MB` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Invalid file format. Allowed: JPG, PNG, WEBP, PDF' };
  }

  return { isValid: true, error: null };
};

export const fileUploadService = {
  async uploadDocument(file, folder = 'attachments') {
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Mock upload response (To be replaced with supabase.storage.from(bucket).upload)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          url: URL.createObjectURL(file),
          path: `${folder}/${Date.now()}_${file.name}`,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }, 500);
    });
  },
};
