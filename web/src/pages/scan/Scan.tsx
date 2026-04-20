import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import './Scan.css';
import { Alert, Box, Button, Center, Container, Grid, Paper, Progress, Stack, Text, Title } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { IconReceipt } from "@tabler/icons-react";

const MAX_FILE_SIZE = 10 * 1024 ** 2;

export const Scan: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [didCapture, setDidCapture] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  const handleFile = async (file: Blob | File) => {
    if (!file) return;

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
      setExtractedData(extractedText);
    } catch {
      setError('Sorry, something went wrong. Please try again with a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const videoOutputRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancel = false;
    let mediaStream: MediaStream | null = null;
    void(load());
    async function load() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment"
          }
        });
        if (cancel) stop();
        const videoOutput = videoOutputRef.current!;
        videoOutput.srcObject = mediaStream;
        await videoOutput.play();
        setHasCamera(true);
      } catch {
        setHasCamera(false);
      }
    }
    function stop() {
      cancel = true;
      if (!mediaStream) return;
      mediaStream.getTracks().forEach(s => s.stop());
    }
    return stop;
  }, []);

  const takePhoto = () => {
    const videoOutput = videoOutputRef.current!;
    const canvas = canvasRef.current!;

    const context = canvas.getContext("2d")!;

    canvas.width = videoOutput.videoWidth;
    canvas.height = videoOutput.videoHeight;

    context.drawImage(videoOutput, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      setDidCapture(true);
      void(handleFile(blob!));
    });
  };

  const extractTextFromImage = async (file: Blob): Promise<string> => {
    const result = await Tesseract.recognize(
      file,
      'swe',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.floor(m.progress * 100));
          }
        }
      }
    );

    return result.data.text;
  };

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];
    if (!file) return;
    setDidCapture(true);
    void(handleFile(file));
  };

  return (
    <Container size="md" p="md">
      <Paper shadow="md" p="md">
        <canvas ref={canvasRef} style={{display: "none"}}></canvas>

        <Center pos="relative" style={hasCamera && !didCapture ? {} : {display: "none"}}>
          <video className="scan-video" ref={videoOutputRef}>Video stream not available.</video>
          <Button pos="absolute" bottom={20} size="lg" onClick={takePhoto}>Scan</Button>
        </Center>

        <Center style={hasCamera && didCapture ? {} : {display: "none"}}>
          <Button size="lg" onClick={() => setDidCapture(false)}>New scan</Button>
        </Center>

        {!didCapture &&
          <>
            {hasCamera &&
              <>
                <Center mt="md">
                  <Text size="lg">Or upload an image</Text>
                </Center>
              </>
            }

            <Dropzone
              onDrop={onDrop}
              accept={IMAGE_MIME_TYPE}
              maxSize={MAX_FILE_SIZE}
              mt="md">

              <Stack align="center" p="md">
                <IconReceipt size={54}/>
                <Text>Drag and drop a receipt image, or click to select</Text>
                <Text c="dimmed">Max 10MB</Text>
              </Stack>

            </Dropzone>
          </>
        }

        {error && (
          <Alert variant="light" color="red" mt="md">
            {error}
          </Alert>
        )}

        {isProcessing && (
          <>
            <Progress value={ocrProgress} animated size="lg" mt="md"/>
            <Center>
              <Text mt="md">Reading your receipt...</Text>
            </Center>
          </>
        )}

        {image && !isProcessing && extractedData && (
          <Grid mt="md">
            <Grid.Col span={{base: 12, md: 6}}>
              <Title order={4}>Your Receipt</Title>
              <Box component="img" src={image} alt="Receipt" bdrs="md" mt="md"/>
            </Grid.Col>

            <Grid.Col span={{base: 12, md: 6}}>
              <Title order={4}>Extracted data</Title>
              <pre>
                {extractedData}
              </pre>
            </Grid.Col>
          </Grid>
        )}

      </Paper>
    </Container>
  );
};
