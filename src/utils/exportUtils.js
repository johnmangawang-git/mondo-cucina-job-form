// Utility functions for exporting data to downloadable files

// Convert File objects to base64 for storage and PDF display
export const convertFilesToBase64 = async (files) => {
    if (!files || files.length === 0) return [];
    
    const convertedFiles = await Promise.all(
        files.map(async (file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {

                    resolve({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: e.target.result, // base64 data URL
                        lastModified: file.lastModified
                    });
                };
                reader.onerror = () => {
                    resolve({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: null,
                        error: 'Failed to read file'
                    });
                };
                reader.readAsDataURL(file);
            });
        })
    );
    
    return convertedFiles;
};

export const downloadAsJSON = (data, filename = 'job-orders') => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
};

export const downloadAsCSV = (data, filename = 'job-orders') => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Define CSV headers
    const headers = [
        'Case Number',
        'Customer Name',
        'Customer Address',
        'Customer Email',
        'SKU',
        'Coverage',
        'Order Date',
        'Dispatch Date',
        'Dispatch Time',
        'Complaint Details',
        'Tested Before',
        'Tested After',
        'Troubles Found',
        'Other Notes',
        'Terms Accepted',
        'Status',
        'Created At',
        'Has Signature',
        'Media Files Count',
        'Media File Names'
    ];

    // Convert data to CSV rows
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(item => [
            `"${item.caseNumber || ''}"`,
            `"${item.customerName || ''}"`,
            `"${(item.customerAddress || '').replace(/"/g, '""')}"`,
            `"${item.customerEmail || ''}"`,
            `"${item.sku || ''}"`,
            `"${Array.isArray(item.coverage) ? item.coverage.join('; ') : ''}"`,
            `"${item.orderDate || ''}"`,
            `"${item.dispatchDate || ''}"`,
            `"${item.dispatchTime || ''}"`,
            `"${(item.complaintDetails || '').replace(/"/g, '""')}"`,
            `"${item.testedBefore ? 'Yes' : 'No'}"`,
            `"${item.testedAfter ? 'Yes' : 'No'}"`,
            `"${item.troublesFound || 0}"`,
            `"${(item.otherNotes || '').replace(/"/g, '""')}"`,
            `"${item.termsAccepted ? 'Yes' : 'No'}"`,
            `"${item.status || ''}"`,
            `"${item.createdAt || ''}"`,
            `"${(item.signatureData || item.signature_url) ? 'Yes' : 'No'}"`,
            `"${item.mediaFiles ? item.mediaFiles.length : 0}"`,
            `"${item.mediaFiles ? item.mediaFiles.map(f => f.name).join('; ') : 'None'}"`
        ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
};

export const downloadAsPDF = async (data, filename = 'job-orders') => {
    // Create HTML content for PDF
    const htmlContent = generateHTMLReport(data);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Trigger print dialog (user can save as PDF)
    setTimeout(() => {
        printWindow.print();
    }, 500);
};

export const downloadSignatures = (data, filename = 'signatures') => {
    const signaturesWithData = data.filter(item => item.signatureData);
    
    if (signaturesWithData.length === 0) {
        alert('No signatures found to download');
        return;
    }

    // Create a zip-like structure by downloading individual signatures
    signaturesWithData.forEach((item, index) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                const signatureFilename = `signature_${item.caseNumber || index + 1}.png`;
                downloadBlob(blob, signatureFilename);
            }, 'image/png');
        };
        
        img.src = item.signatureData;
    });
};

export const downloadIndividualJobOrder = (jobOrder) => {
    const filename = `job-order-${jobOrder.caseNumber || 'unknown'}`;
    
    // Create a comprehensive report for single job order
    const reportData = {
        ...jobOrder,
        exportedAt: new Date().toISOString(),
        exportType: 'Individual Job Order'
    };
    
    downloadAsJSON([reportData], filename);
};

// Helper function to trigger download
const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

// Generate HTML report for PDF export
const generateHTMLReport = (data) => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mondo Cucina Job Orders Report</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0;
                padding: 20px;
                line-height: 1.4;
                color: #333;
            }
            .header { 
                text-align: center; 
                margin-bottom: 40px; 
                border-bottom: 3px solid #2c3e50;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #2c3e50;
                margin-bottom: 10px;
                font-size: 28px;
            }
            .header p {
                color: #7f8c8d;
                margin: 5px 0;
                font-size: 14px;
            }
            
            /* Job Order Details - First Page */
            .job-order-details { 
                margin-bottom: 40px; 
                padding: 20px; 
                border: 2px solid #e1e5e9; 
                border-radius: 8px;
                background: #fafafa;
                page-break-after: always;
            }
            .job-order-details h3 { 
                margin-top: 0; 
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
                font-size: 20px;
            }
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
            }
            .details-section {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #e1e5e9;
            }
            .details-section h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 16px;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            .field { 
                margin: 10px 0; 
                display: flex;
                align-items: flex-start;
            }
            .field strong { 
                display: inline-block; 
                width: 140px; 
                color: #555;
                font-weight: 600;
                flex-shrink: 0;
            }
            .field-value {
                flex: 1;
                word-wrap: break-word;
            }
            .full-width {
                grid-column: 1 / -1;
            }
            
            /* Images Page - Second Page */
            .images-page {
                page-break-before: always;
                margin-top: 40px;
            }
            .images-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 15px;
            }
            .images-header h3 {
                color: #2c3e50;
                margin: 0;
                font-size: 22px;
            }
            .media-section {
                margin-bottom: 40px;
                text-align: center;
            }
            .media-section h4 {
                color: #2c3e50;
                margin-bottom: 20px;
                font-size: 18px;
            }
            .media-files {
                display: flex;
                flex-wrap: wrap;
                gap: 30px;
                justify-content: center;
                margin-top: 20px;
                align-items: flex-start;
            }
            .media-item {
                text-align: center;
                margin: 10px;
                page-break-inside: avoid;
            }
            .media-item img {
                max-width: 450px;
                max-height: 350px;
                border: 2px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                background: white;
                object-fit: contain;
            }
            .media-item .filename {
                font-size: 14px;
                color: #666;
                margin-top: 10px;
                font-weight: 500;
                word-break: break-all;
            }
            .signature-section { 
                margin-top: 50px;
                text-align: center;
                page-break-inside: avoid;
            }
            .signature-section h4 {
                color: #2c3e50;
                margin-bottom: 20px;
                font-size: 18px;
            }
            .signature-section img { 
                max-width: 600px; 
                max-height: 300px;
                border: 3px solid #2c3e50; 
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 15px;
                object-fit: contain;
            }
            
            @media print {
                body { 
                    margin: 0; 
                    padding: 15px;
                }
                .job-order-details { 
                    page-break-after: always; 
                }
                .images-page {
                    page-break-before: always;
                }
                .media-item, .signature-section { 
                    page-break-inside: avoid; 
                }
                .details-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                }
                .media-item img {
                    max-width: 400px;
                    max-height: 300px;
                }
                .signature-section img {
                    max-width: 500px;
                    max-height: 250px;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Mondo Cucina Job Orders Report</h1>
            <p>Generated on: ${currentDate}</p>
            <p>Total Orders: ${data.length}</p>
        </div>
        
        ${data.map((item, index) => `
            <div class="job-order">
                <h3>Job Order #${index + 1} - Case: ${item.caseNumber || 'N/A'}</h3>
                
                <div class="field"><strong>Customer Name:</strong> ${item.customerName || 'N/A'}</div>
                <div class="field"><strong>Customer Address:</strong> ${item.customerAddress || 'N/A'}</div>
                <div class="field"><strong>Customer Email:</strong> ${item.customerEmail || 'N/A'}</div>
                <div class="field"><strong>SKU:</strong> ${item.sku || 'N/A'}</div>
                <div class="field"><strong>Coverage:</strong> ${Array.isArray(item.coverage) ? item.coverage.join(', ') : 'N/A'}</div>
                <div class="field"><strong>Order Date:</strong> ${item.orderDate || 'N/A'}</div>
                <div class="field"><strong>Dispatch Date:</strong> ${item.dispatchDate || 'N/A'}</div>
                <div class="field"><strong>Dispatch Time:</strong> ${item.dispatchTime || 'N/A'}</div>
                <div class="field"><strong>Complaint:</strong> ${item.complaintDetails || 'N/A'}</div>
                <div class="field"><strong>Tested Before:</strong> ${item.testedBefore ? 'Yes' : 'No'}</div>
                <div class="field"><strong>Tested After:</strong> ${item.testedAfter ? 'Yes' : 'No'}</div>
                <div class="field"><strong>Troubles Found:</strong> ${item.troublesFound || 0}</div>
                <div class="field"><strong>Other Notes:</strong> ${item.otherNotes || 'N/A'}</div>
                <div class="field"><strong>Status:</strong> ${item.status || 'N/A'}</div>
                <div class="field"><strong>Created:</strong> ${item.createdAt || 'N/A'}</div>
                
                ${(item.mediaFiles && item.mediaFiles.length > 0) ? `
                    <div class="section-divider">
                        <div class="media-section">
                            <strong>📷 Uploaded Files (${item.mediaFiles.length}):</strong>
                            <div class="media-files">
                                ${item.mediaFiles.map((file, fileIndex) => {
                                    // Check if file is an image - be more flexible with detection
                                    const isImage = (file.type && file.type.startsWith('image/')) || 
                                                   (file.name && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)) ||
                                                   (file.data && file.data.startsWith('data:image/'));
                                    

                                    
                                    if (isImage && file.data) {
                                        return `
                                            <div class="media-item">
                                                <img src="${file.data}" alt="Uploaded file ${fileIndex + 1}" onerror="this.style.display='none';" />
                                                <div class="filename">${(file.name || `File ${fileIndex + 1}`).replace(/[<>]/g, '')}</div>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div class="media-item">
                                                <div style="padding: 20px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; text-align: center;">
                                                    📄 ${(file.name || `File ${fileIndex + 1}`).replace(/[<>]/g, '')}
                                                    <br><small style="color: #666;">${(file.type || 'Unknown type').replace(/[<>]/g, '')}</small>
                                                    ${file.size ? `<br><small style="color: #999;">${(file.size / 1024).toFixed(1)} KB</small>` : ''}

                                                </div>
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${(item.signatureData || item.signature_url) ? `
                    <div class="section-divider">
                        <div class="signature">
                            <strong>✍️ Customer Signature:</strong><br><br>
                            <img src="${item.signatureData || item.signature_url}" alt="Customer Signature" />
                        </div>
                    </div>
                ` : '<div class="section-divider"><div class="field"><strong>✍️ Signature:</strong> Not provided</div></div>'}
            </div>
        `).join('')}
    </body>
    </html>
    `;
};