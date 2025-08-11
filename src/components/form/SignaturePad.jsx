import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Button from '../ui/Button';

const SignaturePad = ({ signature, onChange }) => {
    const sigRef = useRef(null);
    const containerRef = useRef(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [canvasSize, setCanvasSize] = useState({ width: 400, height: 200 });

    useEffect(() => {
        const updateCanvasSize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth - 20; // Account for padding
                const width = Math.max(300, Math.min(containerWidth, 600));
                const height = 200;
                setCanvasSize({ width, height });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    useEffect(() => {
        if (signature && sigRef.current) {
            sigRef.current.fromDataURL(signature);
            setIsEmpty(false);
        }
    }, [signature]);

    const handleClear = () => {
        if (sigRef.current) {
            sigRef.current.clear();
            setIsEmpty(true);
            onChange(null);
        }
    };

    const handleEnd = () => {
        if (sigRef.current) {
            const isCurrentlyEmpty = sigRef.current.isEmpty();
            setIsEmpty(isCurrentlyEmpty);
            
            if (!isCurrentlyEmpty) {
                const signatureData = sigRef.current.toDataURL();
                console.log('Signature captured:', signatureData.substring(0, 50) + '...');
                onChange(signatureData);
            } else {
                onChange(null);
            }
        }
    };

    return (
        <div className="signature-pad">
            <div className="signature-canvas-container" ref={containerRef}>
                <SignatureCanvas
                    ref={sigRef}
                    canvasProps={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        className: 'signature-canvas'
                    }}
                    onEnd={handleEnd}
                    backgroundColor="rgba(255,255,255,1)"
                />
                {isEmpty && (
                    <div className="signature-placeholder">
                        Sign here with your finger
                    </div>
                )}
            </div>
            
            <div className="signature-actions">
                <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={handleClear}
                    disabled={isEmpty}
                >
                    Clear Signature
                </Button>
                {!isEmpty && (
                    <span className="signature-status">✓ Signature captured</span>
                )}
            </div>
        </div>
    );
};

export default SignaturePad;