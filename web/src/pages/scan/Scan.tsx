// src/components/ReceiptScanner.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import './Scan.css';
import { supabase } from '../../supabase';



interface ExtractedData {
  merchant: string;
  date: string;
  total: number;
  items: Array<{name: string; price: number}>;
}

export const Scan: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: Blob) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setImage(null);
    setExtractedData(null);
    setIsProcessing(true);
    setOcrProgress(0);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    try {
      const extractedText = await extractTextFromImage(file);
      console.log('Extracted text:', extractedText); // For debugging
      
      const data = parseReceiptText(extractedText);
      setExtractedData(data);
      
      if (supabase) {
        await saveToDatabase(file, data);
      }
      
    } catch (err) {
      console.error('Error:', err);
      setError('Sorry, something went wrong. Please try again with a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const videoOutputRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    void(load());
    async function load() {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });
      const videoOutput = videoOutputRef.current!;
      videoOutput.srcObject = mediaStream;
      await videoOutput.play();
    }
  });

  const takePhoto = async () => {
    const videoOutput = videoOutputRef.current!;
    const canvas = canvasRef.current!;

    const context = canvas.getContext("2d")!;

    canvas.width = videoOutput.videoWidth;
    canvas.height = videoOutput.videoHeight;

    context.drawImage(videoOutput, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      void(handleFile(blob!));
    });
  };

  const extractTextFromImage = async (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.floor(m.progress * 100));
            }
          }
        }
      ).then(({ data: { text } }) => {
        resolve(text);
      }).catch(reject);
    });
  };

  const parseReceiptText = (text: string): ExtractedData => {
    const lines = text.split('\n');
    
    // Extract merchant (look for common store patterns or first non-empty line)
    let merchant = "Unknown Store";
    const storePatterns = [
      /walmart/i, /target/i, /costco/i, /kroger/i, /aldi/i, /trader\s+joe/i,
      /whole\s+foods/i, /cvs/i, /walgreens/i, /rite\s+aid/i, /home\s+depot/i,
      /lowes/i, /best\s+buy/i, /amazon/i, /ebay/i
    ];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line && line.length > 2 && line.length < 60) {
        // Check if it matches a known store pattern
        for (const pattern of storePatterns) {
          if (pattern.test(line)) {
            merchant = line;
            break;
          }
        }
        // If no pattern matched but it's a short line, use as merchant
        if (merchant === "Unknown Store" && line.length < 40 && !line.match(/[0-9]/)) {
          merchant = line;
        }
      }
    }
    
    // Extract date
    const datePatterns = [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
      /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i
    ];
    
    let date = "Date not found";
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        date = match[0];
        break;
      }
    }
    
    // Extract total
    const totalPatterns = [
      /TOTAL\s*:?\s*\$?\s*(\d+\.\d{2})/i,
      /AMOUNT\s*:?\s*\$?\s*(\d+\.\d{2})/i,
      /BALANCE\s*:?\s*\$?\s*(\d+\.\d{2})/i,
      /TOTAL\s+DUE\s*:?\s*\$?\s*(\d+\.\d{2})/i,
      /AMOUNT\s+DUE\s*:?\s*\$?\s*(\d+\.\d{2})/i,
      /\$\s*(\d+\.\d{2})\s*$/m
    ];
    
    let total = 0;
    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        total = parseFloat(match[1]);
        break;
      }
    }
    
    // Extract items (simplified - look for lines with $ amounts)
    const items: Array<{name: string; price: number}> = [];
    for (const line of lines) {
      // Skip lines that are likely headers or totals
      const skipTerms = ['total', 'subtotal', 'tax', 'balance', 'amount', 'change', 'cash', 'card', 'thank', 'visit', 'store', 'phone', 'www'];
      const shouldSkip = skipTerms.some(term => line.toLowerCase().includes(term));
      
      if (!shouldSkip) {
        const priceMatch = line.match(/\$\s*(\d+\.\d{2})/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          const name = line.replace(priceMatch[0], '').trim();
          if (name && price > 0 && name.length > 1 && price < total) {
            items.push({ name, price });
          }
        }
      }
    }
    
    // Limit to reasonable number of items
    const uniqueItems = items.slice(0, 20);
    
    return { merchant, date, total, items: uniqueItems };
  };

  const saveToDatabase = async (file: Blob | File, data: ExtractedData) => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not logged in - skipping database save');
        return;
      }

      const fileExt = file instanceof File ? file.name.split('.').pop() : "png";
      const fileName = `${user.id}/${Date.now()}-receipt.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          merchant: data.merchant,
          date: data.date,
          total: data.total,
          items: data.items
        });
        
      if (insertError) throw insertError;
      
      console.log('Receipt saved to database!');
    } catch (err) {
      console.error('Failed to save to database:', err);
    }
  };

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    } else {
      setError('Please drop a valid image file');
    }
  };

  return (
    <div className="receipt-scanner">
      <h1 className="scanner-title">Receipt Scanner</h1>

      <canvas ref={canvasRef} style={{display: "none"}}></canvas>
      <video ref={videoOutputRef}>Video stream not available.</video>
      <br/>
      <button onClick={() => void(takePhoto())}>Take photo</button>
      
      <div
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          onChange={onFileSelect}
          className="file-input"
        />
        {isDragActive ? (
          <p className="dropzone-text">Drop your receipt here...</p>
        ) : (
          <div className="dropzone-content">
            <p className="dropzone-icon">camera icon</p>
            <p className="dropzone-text">Drag and drop a receipt image, or click to select</p>
            <p className="dropzone-hint">
              Supports JPEG, PNG (max 10MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {isProcessing && (
        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div 
              className="progress-bar"
              style={{ width: `${ocrProgress}%` }}
            >
              {ocrProgress > 0 && `${ocrProgress}%`}
            </div>
          </div>
          <p className="progress-text">
            {ocrProgress < 100 ? 'Reading your receipt...' : 'Processing complete!'}
          </p>
        </div>
      )}

      {image && !isProcessing && extractedData && (
        <div className="results-container">
          <div className="image-section">
            <h3 className="section-title">Your Receipt</h3>
            <img src={image} alt="Receipt" className="receipt-image" />
          </div>

          <div className="data-section">
            <h3 className="section-title">Extracted Information</h3>
            <div className="data-card">
              <p><strong>Store:</strong> {extractedData.merchant}</p>
              <p><strong>Date:</strong> {extractedData.date}</p>
              <p><strong>Total:</strong> ${extractedData.total.toFixed(2)}</p>
              
              <p><strong>🛒 Items ({extractedData.items.length}):</strong></p>
              {extractedData.items.length > 0 ? (
                <ul className="items-list">
                  {extractedData.items.map((item, index) => (
                    <li key={index} className="item-row">
                      {item.name} - <strong>${item.price.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items-message">No items detected. Try a clearer receipt image.</p>
              )}
              
              <button 
                className="copy-button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                  alert('Data copied to clipboard!');
                }}
              >
                Copy Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
