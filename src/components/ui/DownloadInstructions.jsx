import React, { useState } from 'react';
import Button from './Button';

const DownloadInstructions = () => {
    const [showInstructions, setShowInstructions] = useState(false);

    return (
        <div className="download-instructions">
            <Button
                variant="outline"
                size="small"
                onClick={() => setShowInstructions(!showInstructions)}
            >
                ❓ How to find downloads
            </Button>
            
            {showInstructions && (
                <div className="instructions-popup">
                    <div className="instructions-content">
                        <h4>📱 How to Find Your Downloaded Files</h4>
                        
                        <div className="instruction-section">
                            <h5>📱 On Android:</h5>
                            <ul>
                                <li>Open <strong>Files</strong> or <strong>Downloads</strong> app</li>
                                <li>Look in <strong>Downloads</strong> folder</li>
                                <li>Files will be named like: <code>mondo-cucina-job-orders-2024-01-15.csv</code></li>
                            </ul>
                        </div>
                        
                        <div className="instruction-section">
                            <h5>📱 On iPhone:</h5>
                            <ul>
                                <li>Open <strong>Files</strong> app</li>
                                <li>Go to <strong>Downloads</strong> folder</li>
                                <li>Or check <strong>Safari Downloads</strong> in Safari settings</li>
                            </ul>
                        </div>
                        
                        <div className="instruction-section">
                            <h5>📄 File Types:</h5>
                            <ul>
                                <li><strong>CSV:</strong> Open with Excel, Google Sheets</li>
                                <li><strong>JSON:</strong> Raw data for technical use</li>
                                <li><strong>PNG:</strong> Signature images</li>
                                <li><strong>PDF:</strong> Print-ready reports</li>
                            </ul>
                        </div>
                        
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => setShowInstructions(false)}
                        >
                            Got it!
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DownloadInstructions;