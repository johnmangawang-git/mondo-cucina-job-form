import React, { useRef, useState } from 'react';
import Button from '../ui/Button';
import { convertFilesToBase64 } from '../../utils/exportUtils';

const MediaUpload = ({ files = [], onChange }) => {
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = async (selectedFiles) => {
        const fileArray = Array.from(selectedFiles);
        const validFiles = fileArray.filter(file => {
            // Accept images and common document types
            const validTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                'application/pdf', 'text/plain',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
        });

        if (validFiles.length !== fileArray.length) {
            alert('Some files were rejected. Please ensure files are images, PDFs, or documents under 10MB.');
        }

        // Convert new files to base64 immediately
        const convertedFiles = await convertFilesToBase64(validFiles);
        const newFiles = [...files, ...convertedFiles];
        onChange(newFiles);
    };

    const handleFileInput = (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files);
            e.target.value = ''; // Reset input
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        onChange(newFiles);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="media-upload">
            <div 
                className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="upload-content">
                    <div className="upload-icon">📁</div>
                    <p>Click to select files or drag and drop</p>
                    <p className="upload-hint">
                        Supported: Images, PDF, Word documents (max 10MB each)
                    </p>
                </div>
                
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />
            </div>

            {files.length > 0 && (
                <div className="uploaded-files">
                    <h4>Uploaded Files ({files.length})</h4>
                    <div className="file-list">
                        {files.map((file, index) => {
                            const isImage = (file.type && file.type.startsWith('image/')) || 
                                           (file.name && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name));
                            
                            return (
                                <div key={index} className="file-item">
                                    {isImage && file.data && (
                                        <div className="file-preview">
                                            <img 
                                                src={file.data} 
                                                alt={file.name}
                                                style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    objectFit: 'cover',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ddd'
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="file-info">
                                        <div className="file-name">{file.name}</div>
                                        <div className="file-size">{formatFileSize(file.size)}</div>
                                        {isImage && <div className="file-type">📷 Image</div>}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="small"
                                        onClick={() => removeFile(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaUpload;