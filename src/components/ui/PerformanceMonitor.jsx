import React, { useEffect, useState } from 'react';

const PerformanceMonitor = ({ enabled = false }) => {
    const [metrics, setMetrics] = useState({
        pageLoad: null,
        domContentLoaded: null,
        firstPaint: null,
        firstContentfulPaint: null,
        largestContentfulPaint: null
    });

    useEffect(() => {
        if (!enabled) return;

        const measurePerformance = () => {
            // Page Load Timing
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                setMetrics(prev => ({
                    ...prev,
                    pageLoad: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                    domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)
                }));
            }

            // Paint Timing
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');

            if (firstPaint) {
                setMetrics(prev => ({ ...prev, firstPaint: Math.round(firstPaint.startTime) }));
            }
            if (firstContentfulPaint) {
                setMetrics(prev => ({ ...prev, firstContentfulPaint: Math.round(firstContentfulPaint.startTime) }));
            }

            // Largest Contentful Paint
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    setMetrics(prev => ({ ...prev, largestContentfulPaint: Math.round(lastEntry.startTime) }));
                });
                observer.observe({ entryTypes: ['largest-contentful-paint'] });

                return () => observer.disconnect();
            }
        };

        // Measure after page load
        if (document.readyState === 'complete') {
            measurePerformance();
        } else {
            window.addEventListener('load', measurePerformance);
            return () => window.removeEventListener('load', measurePerformance);
        }
    }, [enabled]);

    if (!enabled || !metrics.pageLoad) return null;

    const getPerformanceColor = (value, thresholds) => {
        if (value <= thresholds.good) return 'success';
        if (value <= thresholds.fair) return 'warning';
        return 'danger';
    };

    const thresholds = {
        pageLoad: { good: 2000, fair: 4000 },
        firstContentfulPaint: { good: 1000, fair: 2500 },
        largestContentfulPaint: { good: 2500, fair: 4000 }
    };

    return (
        <div className="performance-monitor position-fixed bottom-0 end-0 m-3" style={{ zIndex: 1050 }}>
            <div className="card shadow-sm" style={{ width: '280px', fontSize: '0.8rem' }}>
                <div className="card-header bg-dark text-white py-2">
                    <h6 className="card-title mb-0">
                        <i className="bi bi-speedometer2 me-2"></i>
                        Performance Metrics
                    </h6>
                </div>
                <div className="card-body p-2">
                    <div className="row g-1">
                        {metrics.pageLoad && (
                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>Page Load</span>
                                    <span className={`badge bg-${getPerformanceColor(metrics.pageLoad, thresholds.pageLoad)}`}>
                                        {metrics.pageLoad}ms
                                    </span>
                                </div>
                            </div>
                        )}
                        {metrics.domContentLoaded && (
                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>DOM Ready</span>
                                    <span className="badge bg-info">{metrics.domContentLoaded}ms</span>
                                </div>
                            </div>
                        )}
                        {metrics.firstContentfulPaint && (
                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>First Paint</span>
                                    <span className={`badge bg-${getPerformanceColor(metrics.firstContentfulPaint, thresholds.firstContentfulPaint)}`}>
                                        {metrics.firstContentfulPaint}ms
                                    </span>
                                </div>
                            </div>
                        )}
                        {metrics.largestContentfulPaint && (
                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>LCP</span>
                                    <span className={`badge bg-${getPerformanceColor(metrics.largestContentfulPaint, thresholds.largestContentfulPaint)}`}>
                                        {metrics.largestContentfulPaint}ms
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-2 pt-2 border-top">
                        <div className="d-flex justify-content-between">
                            <small className="text-muted">Memory:</small>
                            <small className="text-muted">
                                {performance.memory ? 
                                    `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                                    'N/A'
                                }
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceMonitor;