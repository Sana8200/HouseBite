import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import Tesseract from "tesseract.js";
import "./Scan.css";
import { Alert, Box, Button, Center, Container, Grid, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import { IconReceipt } from "@tabler/icons-react";

const IMG_SIZE = 1500;

interface ReadyState {
    state: "ready";
    camera: boolean;
}

interface ProcessingState {
    state: "processing";
    file: Blob;
}

interface FinishedState {
    state: "finished";
    image: string;
    data: string;
}

interface ErrorState {
    state: "error";
    error: Error;
}

type ScanState = ReadyState | ProcessingState | FinishedState | ErrorState;

export function Scan() {
    const [state, setState] = useState<ScanState>({state: "ready", camera: false});

    return (
        <Container size="md" p="md">
            <Paper shadow="md" p="md">
                {state.state == "ready"      && <ScanReady      state={state} setState={setState} />}
                {state.state == "processing" && <ScanProcessing state={state} setState={setState} />}
                {state.state == "finished"   && <ScanFinished   state={state} setState={setState} />}
                {state.state == "error"      && <ScanError      state={state} setState={setState} />}
            </Paper>
        </Container>
    );
};

interface ScanReadyProps {
    state: ReadyState;
    setState: Dispatch<SetStateAction<ScanState>>;
}

function ScanReady(props: ScanReadyProps) {
    const {state, setState} = props;

    const videoOutputRef = useRef<HTMLVideoElement>(null);

    // Setup the camera
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
                setState(s => ({...s, camera: true}))
            } catch {
                setState(s => ({...s, camera: false}))
            }
        }

        function stop() {
            cancel = true;
            if (!mediaStream) return;
            mediaStream.getTracks().forEach(s => s.stop());
        }

        return stop;
    }, [setState]);

    const takePhoto = () => {
        const videoOutput = videoOutputRef.current!;

        const canvas = document.createElement("canvas");

        const context = canvas.getContext("2d")!;

        canvas.width = videoOutput.videoWidth;
        canvas.height = videoOutput.videoHeight;

        context.drawImage(videoOutput, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(file => {
            if (file) setState({state: "processing", file});
        });
    };

    const onDrop = (files: FileWithPath[]) => {
        const file = files[0];
        if (!file) return;
        setState({state: "processing", file});
    };

    return (
        <>
            <Center pos="relative" style={state.camera ? {} : {display: "none"}}>
                <video className="scan-video" ref={videoOutputRef}>Video stream not available.</video>
                <Button pos="absolute" bottom={20} size="lg" onClick={takePhoto}>Scan</Button>
            </Center>

            {state.camera &&
                <Center mt="md">
                    <Text size="lg">Or upload an image</Text>
                </Center>
            }

            <Dropzone
                onDrop={onDrop}
                accept={IMAGE_MIME_TYPE}
                mt="md">

                <Stack align="center" p="md">
                    <IconReceipt size={54}/>
                    <Text>Drag and drop a receipt image, or click to select</Text>
                </Stack>

            </Dropzone>
        </>
    );
}

interface ScanProcessingProps {
    state: ProcessingState;
    setState: Dispatch<SetStateAction<ScanState>>;
}

function ScanProcessing(props: ScanProcessingProps) {
    const {state, setState} = props;

    useEffect(() => {
        void process();

        async function process() {
            // Resize image
            const bitmap = await window.createImageBitmap(state.file);
            const canvas = document.createElement("canvas");
            const aspectRatio = bitmap.width / bitmap.height;

            if (aspectRatio >= 1) { // landscape
                canvas.width = IMG_SIZE;
                canvas.height = IMG_SIZE / aspectRatio;
            } else { // portrait
                canvas.width = IMG_SIZE * aspectRatio;
                canvas.height = IMG_SIZE;
            }

            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const image = canvas.toDataURL("image/jpeg");

            // Recognize
            const result = await Tesseract.recognize(image, "swe", {});
            setState({state: "finished", image, data: result.data.text});
        }

    }, [state.file, setState]);

    return (
        <>
            <Loader size="lg" mt="md"/>
            <Center>
                <Text mt="md">Reading your receipt...</Text>
            </Center>
        </>
    );
}

interface ScanFinishedProps {
    state: FinishedState;
    setState: Dispatch<SetStateAction<ScanState>>;
}

function ScanFinished(props: ScanFinishedProps) {
    const {state, setState} = props;
    return (
        <>
            <Center>
                <Button size="lg" onClick={() => setState({state: "ready", camera: false})}>New scan</Button>
            </Center>

            <Grid mt="md">
                <Grid.Col span={{base: 12, md: 6}}>
                    <Title order={4}>Your Receipt</Title>
                    <Box component="img" src={state.image} alt="Receipt" bdrs="md" mt="md"/>
                </Grid.Col>

                <Grid.Col span={{base: 12, md: 6}}>
                    <Title order={4}>Extracted data</Title>
                    <pre>
                        {state.data}
                    </pre>
                </Grid.Col>
            </Grid>
        </>
    );
}

interface ScanErrorProps {
    state: ErrorState;
    setState: Dispatch<SetStateAction<ScanState>>;
}

function ScanError(props: ScanErrorProps) {
    const {state, setState} = props;
    return (
        <>
            <Alert variant="light" color="red" mt="md">
                {state.error.message}
            </Alert>
            <Center>
                <Button size="lg" onClick={() => setState({state: "ready", camera: false})}>Retry</Button>
            </Center>
        </>
    );
}
