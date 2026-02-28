import React from 'react';
import Papa from 'papaparse';

const FileUploader = ({ onFileSelect }) => {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => onFileSelect(file, results.data),
      });
    }
  };

  return (
    <div className="upload-box">
      <input type="file" accept=".csv" onChange={handleFile} id="file-input" hidden />
      <label htmlFor="file-input" className="upload-label">
        Click to Upload CSV
      </label>
    </div>
  );
};

export default FileUploader; 