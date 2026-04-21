import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import "./Scan.css";
import { Alert, Box, Button, Card, Center, Container, Flex, Grid, Loader, NumberInput, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import { IconReceipt } from "@tabler/icons-react";
import { scanReceipt, type ReceiptData, type ReceiptItemData } from "../../api/scan";

const IMG_SIZE = 2000;

interface ReadyState {
    state: "ready";
}

interface ProcessingState {
    state: "processing";
    file: Blob;
}

interface FinishedState {
    state: "finished";
    image: string;
    data: ReceiptData;
}

interface ErrorState {
    state: "error";
    error: Error;
}

type ScanState = ReadyState | ProcessingState | FinishedState | ErrorState;

export function Scan() {
    const [state, setState] = useState<ScanState>({state: "ready"});

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
    const {setState} = props;

    const [camera, setCamera] = useState(false);

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
                setCamera(true);
            } catch {
                setCamera(false);
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
            <Center pos="relative" style={camera ? {} : {display: "none"}}>
                <video className="scan-video" ref={videoOutputRef}>Video stream not available.</video>
                <Button pos="absolute" bottom={20} size="lg" onClick={takePhoto}>Scan</Button>
            </Center>

            {camera &&
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
            // const result = await Tesseract.recognize(image, "swe", {});
            // setState({state: "finished", image, data: result.data.text});

            const result = await scanReceipt(image);

            if (result.error) {
                setState({state: "error", error: result.error as Error});
            } else {
                setState({state: "finished", image, data: result.data!});
            }
        }

    }, [state.file, setState]);

    return (
        <>
            <Stack align="center">
                <Loader size="lg" mt="md"/>
                <Text mt="md">Reading your receipt...</Text>
            </Stack>
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
                <Button size="lg" onClick={() => setState({state: "ready"})}>New scan</Button>
            </Center>

            <Grid mt="md">
                <Grid.Col span={{base: 12, md: 5}}>
                    <Title order={4}>Your Receipt</Title>
                    <Box component="img" src={state.image} alt="Receipt" bdrs="md" mt="md"/>
                </Grid.Col>

                <Grid.Col span={{base: 12, md: 7}}>
                    <Title order={4}>Identified products</Title>
                    <Stack gap="sm" mt="md">
                        {state.data.items.map((p, i) => (
                            <ProductCard key={i} item={p}/>
                        ))}
                    </Stack>
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
                <Button size="lg" onClick={() => setState({state: "ready"})}>Retry</Button>
            </Center>
        </>
    );
}

interface ProductCardProps {
    item: ReceiptItemData;
}

function ProductCard(props: ProductCardProps) {
    const { item } = props;

    const [name, setName] = useState(item.name ?? "");
    const [quantity, setQuantity] = useState<string | number>(item.quantity ?? 1);
    const [size, setSize] = useState<string | number>(item.weight ?? "");
    const [price, setPrice] = useState<string | number>(item.totalPrice ?? "");

    const [added, setAdded] = useState(false);
    const [adding, setAdding] = useState(false);

    const disabled = added || adding;

    return (
        <Card shadow="none" withBorder>
            <TextInput label="Name" disabled={disabled} value={name} onChange={e => setName(e.target.value)}/>
            
            <Flex gap="sm" mt="xs">
                <NumberInput label="Quantity" disabled={disabled} value={quantity} onChange={setQuantity} flex={1} allowDecimal={false}/>
                <NumberInput label="Size" disabled={disabled} value={size} onChange={setSize} flex={1} decimalScale={2} fixedDecimalScale/>
                <NumberInput label="Price" disabled={disabled} value={price} onChange={setPrice} flex={1} decimalScale={2} fixedDecimalScale/>
            </Flex>
            
            <Flex justify="end" mt="sm">
                <Button disabled={disabled} loading={adding}>Add</Button>
            </Flex>
        </Card>
    );
}
