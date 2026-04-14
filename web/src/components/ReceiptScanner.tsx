// src/components/ReceiptScanner.tsx

import React, { useState } from 'react';  // For building the user interface
import { useDropzone } from 'react-dropzone';  // For drag-and-drop file upload
import { createClient } from '@supabase/supabase-js';  // For connecting to Supabase

// Connect to Supabase (our backend)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,  // Where Supabase lives
  import.meta.env.VITE_SUPABASE_ANON_KEY  // Our password to access it
);

// This is our main component - like a blueprint for what appears on screen
export const ReceiptScanner: React.FC = () => {
  // State variables - these remember things while the user uses the app
  const [image, setImage] = useState<string | null>(null);  // Stores the uploaded image
  const [extractedData, setExtractedData] = useState<any>(null);  // Stores the receipt data
  const [isProcessing, setIsProcessing] = useState(false);  // Tells us if we're still working
  const [uploadProgress, setUploadProgress] = useState(0);  // Shows upload percentage

  // This function handles when a user drops or selects a file
  const onDrop = async (acceptedFiles: File[]) => {
    // Get the first file (there should only be one)
    const file = acceptedFiles[0];
    if (!file) return;

    // Create a preview of the image so the user can see it
    const reader = new FileReader();
    reader.onload = async (e) => {
      // Show the image preview
      const imgUrl = e.target?.result as string;
      setImage(imgUrl);
      
      // Start processing
      setIsProcessing(true);
      
      try {
        // Step 1: Upload the image to Supabase Storage
        const publicUrl = await uploadToStorage(file);
        
        // Step 2: Ask the Edge Function to read the receipt
        const result = await callReceiptOCR(publicUrl);
        
        // Step 3: Display the extracted information
        if (result.success) {
          setExtractedData(result.data);
        }
      } catch (error) {
        // If something goes wrong, tell the user
        console.error('Error:', error);
        alert('Sorry, something went wrong. Please try again.');
      } finally {
        // We're done processing
        setIsProcessing(false);
      }
    };
    
    // Read the image file so we can display it
    reader.readAsDataURL(file);
  };

  // This function uploads the image to Supabase Storage
  const uploadToStorage = async (file: File): Promise<string> => {
    // Get the current user's ID (who is logged in)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please log in first');

    // Create a unique filename (so files don't overwrite each other)
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-receipt.${fileExt}`;

    // Upload the file
    const { error, data } = await supabase.storage
      .from('receipts')  // The folder name
      .upload(fileName, file, {
        onUploadProgress: (progress) => {
          // Update the progress bar
          setUploadProgress((progress.loaded / progress.total) * 100);
        },
      });

    if (error) throw error;

    // Get the public URL where the image can be accessed
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // This function calls our Edge Function to read the receipt
  const callReceiptOCR = async (imageUrl: string) => {
    // Ask Supabase to run our OCR function
    const { data, error } = await supabase.functions.invoke('receipt-ocr', {
      body: { imageUrl }  // Send the image URL
    });

    if (error) throw error;
    return data;
  };

  // This sets up the drag-and-drop zone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']  // Only accept images
    },
    maxSize: 10 * 1024 * 1024  // Max 10MB file size
  });

  // This is what actually appears on the screen (the user interface)
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Receipt Scanner</h1>
      
      {/* Drag and Drop Zone */}
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#f0f0f0' : 'white'
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop your receipt here...</p>
        ) : (
          <div>
            <p>Drag and drop a receipt image, or click to select</p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Supports JPEG, PNG (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress Bar */}
      {isProcessing && uploadProgress > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ backgroundColor: '#e0e0e0', borderRadius: '4px', height: '20px' }}>
            <div 
              style={{
                backgroundColor: '#007bff',
                width: `${uploadProgress}%`,
                height: '20px',
                borderRadius: '4px',
                transition: 'width 0.3s'
              }}
            />
          </div>
          <p>Uploading: {Math.round(uploadProgress)}%</p>
        </div>
      )}

      {/* Results Section */}
      {image && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Image Preview */}
          <div>
            <h3>Your Receipt</h3>
            <img src={image} alt="Receipt" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          </div>

          {/* Extracted Data */}
          <div>
            <h3>Extracted Information</h3>
            {isProcessing ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Reading your receipt...</p>
                <div style={{ 
                  display: 'inline-block',
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #007bff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            ) : extractedData ? (
              <div>
                <p><strong>Store:</strong> {extractedData.merchant}</p>
                <p><strong>Date:</strong> {extractedData.date}</p>
                <p><strong>Total:</strong> ${extractedData.total}</p>
                <p><strong>Items:</strong></p>
                <ul>
                  {extractedData.items?.map((item: any, index: number) => (
                    <li key={index}>{item.name} - ${item.price}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};