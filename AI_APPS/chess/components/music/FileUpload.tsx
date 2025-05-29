import React, { useRef } from 'react';
import { Button } from '../ui/Button';
import { UploadIcon } from '../ui/Icons';

interface FileUploadProps {
  onFileUpload: (files: FileList) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFileUpload(event.target.files);
      // Reset file input to allow uploading the same file again
      if(fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        accept=".mp3,audio/mpeg" // More robust accept types
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        id="mp3-upload"
      />
      <Button onClick={triggerFileInput} className="w-full bg-teal-600 hover:bg-teal-500">
        <UploadIcon className="w-5 h-5 mr-2" />
        Upload MP3s
      </Button>
    </div>
  );
};
