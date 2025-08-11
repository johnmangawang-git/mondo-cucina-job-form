import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Button from '../ui/Button';

const SignaturePad = ({ signature, onChange }) => {
    const sigRef = useRef(null);
    const [isEmpty, setIsEmpty] = useState(true);

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
            <div className="signature-canvas-container">
                <SignatureCanvas
                    ref={sigRef}
                    canvasProps={{
                        width: Math.min(400, window.innerWidth - 80),
                        height: 200,
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