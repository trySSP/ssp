'use client'

import { useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import html2pdf from 'html2pdf.js'
import ReactMarkdown from 'react-markdown'

export default function ExportPDFButton({ data, viewId, startupName = 'Startup Analysis' }) {
  const contentRef = useRef(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!contentRef.current) return
    
    setIsExporting(true)

    const element = contentRef.current
    
    // Options to ensure A4 size and proper rendering
    const opt = {
      margin: 0, // We control margins with CSS in the container
      filename: `analysis-report-${viewId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true // Helps with font rendering
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    try {
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Design tokens based on the spec
  const styles = {
    // Fonts
    fontSerif: '"Instrument Serif", serif',
    fontSans: '"Instrument Sans", sans-serif',
    
    // Colors
    colorBrandPeach: '#f97316',
    colorTextPrimary: '#0B0B0B',   // near-black
    colorTextSecondary: '#5F6368', // muted gray
    colorTextFaint: '#9AA0A6',     // metadata
    colorBorder: '#E0E0E0',        // light gray for dividers
    
    // Layout
    pageWidth: '210mm',
    pageMinHeight: '297mm',
    marginTop: '32mm',
    marginBottom: '28mm',
    marginLeft: '28mm',
    marginRight: '28mm',
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle rounded-lg text-sm text-secondary hover:text-primary hover:bg-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Icons.Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icons.Download className="w-4 h-4" />
        )}
        <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
      </button>

      {/* Hidden content for PDF generation */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
        <div 
          ref={contentRef} 
          style={{ 
            width: styles.pageWidth,
            minHeight: styles.pageMinHeight,
            backgroundColor: '#ffffff',
            paddingTop: styles.marginTop,
            paddingBottom: styles.marginBottom,
            paddingLeft: styles.marginLeft,
            paddingRight: styles.marginRight,
            boxSizing: 'border-box',
            fontFamily: styles.fontSans,
            color: styles.colorTextPrimary,
            position: 'relative' // For footer positioning if needed, though flows naturally
          }}
        >
          {/* Header Section */}
          <div style={{ marginBottom: '12mm' }}>
            <h1 
              style={{ 
                fontFamily: styles.fontSerif,
                fontWeight: 600, // Semibold
                fontSize: '32pt', // Large ~36-40pt equivalent scaled
                color: styles.colorBrandPeach, // Brand Peach
                margin: 0,
                lineHeight: 1.1,
                marginBottom: '4mm'
              }}
            >
              Analysis Report
            </h1>
            
            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: styles.colorBorder, width: '100%', marginBottom: '3mm' }} />
            
            {/* Metadata Line */}
            <div 
              style={{ 
                fontFamily: styles.fontSans, 
                fontSize: '9pt', 
                color: styles.colorTextSecondary,
                display: 'flex',
                gap: '8px'
              }}
            >
              <strong>{startupName}</strong>
              <span>·</span>
              <span>{viewId}</span>
              <span>·</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-12">
            {data && Object.entries(data).map(([key, value]) => (
              <div 
                key={key} 
                style={{ 
                  pageBreakInside: 'avoid', 
                  marginBottom: '10mm' 
                }}
              >
                {/* Section Title */}
                <div style={{ marginBottom: '6mm' }}>
                  <h2 
                    style={{ 
                      fontFamily: styles.fontSerif,
                      fontWeight: 500, // Medium
                      fontSize: '18pt', // Medium-large ~22-24pt
                      color: styles.colorTextPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      margin: 0,
                      marginBottom: '2mm'
                    }}
                  >
                    {key.replace(/_/g, ' ')}
                  </h2>
                  <div style={{ height: '1px', backgroundColor: styles.colorBorder, width: '100%' }} />
                </div>

                {/* Section Content */}
                <div style={{ 
                  fontFamily: styles.fontSans,
                  fontSize: '10.5pt',
                  lineHeight: '1.6',
                  color: styles.colorTextPrimary
                }}>
                  {typeof value === 'string' ? (
                    <ReactMarkdown
                      components={{
                        // Subsection Titles
                        h1: ({node, ...props}) => <h3 style={{ fontFamily: styles.fontSans, fontWeight: 500, fontSize: '12pt', marginTop: '4mm', marginBottom: '2mm', breakAfter: 'avoid' }} {...props} />,
                        h2: ({node, ...props}) => <h3 style={{ fontFamily: styles.fontSans, fontWeight: 500, fontSize: '12pt', marginTop: '4mm', marginBottom: '2mm', breakAfter: 'avoid' }} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{ fontFamily: styles.fontSans, fontWeight: 500, fontSize: '12pt', marginTop: '4mm', marginBottom: '2mm', breakAfter: 'avoid' }} {...props} />,
                        
                        // Body Paragraphs
                        p: ({node, ...props}) => <p style={{ marginBottom: '3mm', color: styles.colorTextPrimary }} {...props} />,
                        
                        // Lists
                        ul: ({node, ...props}) => <ul style={{ listStyleType: 'disc', paddingLeft: '5mm', marginBottom: '3mm' }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ listStyleType: 'decimal', paddingLeft: '5mm', marginBottom: '3mm' }} {...props} />,
                        li: ({node, ...props}) => <li style={{ marginBottom: '1.5mm', paddingLeft: '1mm' }} {...props} />,
                        
                        // Inline elements
                        strong: ({node, ...props}) => <strong style={{ fontWeight: 600, color: styles.colorTextPrimary }} {...props} />,
                        a: ({node, ...props}) => <a style={{ color: styles.colorTextPrimary, textDecoration: 'underline', textDecorationColor: styles.colorBrandPeach }} {...props} />,
                        blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: `2px solid ${styles.colorBrandPeach}`, paddingLeft: '4mm', marginLeft: 0, color: styles.colorTextSecondary, fontStyle: 'italic' }} {...props} />,
                        
                        // Code blocks (simple representation)
                        code: ({node, inline, ...props}) => inline 
                          ? <code style={{ fontFamily: 'monospace', fontSize: '0.9em', backgroundColor: '#F5F5F5', padding: '1px 3px', borderRadius: '2px' }} {...props} />
                          : <pre style={{ fontFamily: 'monospace', fontSize: '0.85em', backgroundColor: '#F5FAFA', padding: '4mm', borderRadius: '4px', overflowX: 'auto', marginBottom: '3mm', color: styles.colorTextSecondary }}><code {...props} /></pre>
                      }}
                    >
                      {value}
                    </ReactMarkdown>
                  ) : (
                    // Fallback for non-string data (Error states/Objects)
                    <div style={{ color: styles.colorTextSecondary, fontStyle: 'italic', borderLeft: '2px solid #EEE', paddingLeft: '4mm' }}>
                      {JSON.stringify(value, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div 
            style={{ 
              marginTop: '15mm', 
              paddingTop: '4mm', 
              textAlign: 'center', 
              fontSize: '8pt', 
              color: styles.colorTextFaint,
              fontFamily: styles.fontSans
            }}
          >
            Generated by Apricity
          </div>
        </div>
      </div>
    </>
  )
}
