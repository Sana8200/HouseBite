import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import "./Scan.css";
import { Alert, Box, Button, Card, Center, Checkbox, Container, Flex, Grid, Loader, NumberInput, Paper, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import { IconReceipt } from "@tabler/icons-react";
import { scanReceipt, type ReceiptData, type ReceiptItemData } from "../../api/scan";
import { getHouseholds, type Household } from "../../api/household";

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
    data: EditReceiptData;
}

interface ErrorState {
    state: "error";
    error: Error;
}

type ScanState = ReadyState | ProcessingState | FinishedState | ErrorState;

interface EditReceiptData extends ReceiptData {
    items: EditReceiptItemData[];
}

interface EditReceiptItemData extends ReceiptItemData {
    key: string;
    enabled: boolean;
    unit: string | null;
    expirationDate: string | null;
}

export function Scan() {
    const [state, setState] = useState<ScanState>({state: "ready"});

    const [households, setHouseholds] = useState<Household[]>([]);

    useEffect(() => {
        void load();
        async function load() {
            const result = await getHouseholds();
            if (result.error) {
                setState({state: "error", error: result.error});
            } else {
                setHouseholds(result.data);
            }
        }
    }, []);

    return (
        <Container size="md" p="md">
            <Paper shadow="md" p="md">
                {state.state == "ready"      && <ScanReady      state={state} setState={setState} />}
                {state.state == "processing" && <ScanProcessing state={state} setState={setState} />}
                {state.state == "finished"   && <ScanFinished   state={state} setState={setState} households={households} />}
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
                const data: EditReceiptData = {
                    ...result.data!,
                    items: result.data!.items.map(item => {

                        let expirationDate: string | null = null;

                        if (item.estimatedExpirationDays) {
                            const ts = Date.now() + item.estimatedExpirationDays * 24 * 60 * 60 * 1000;
                            expirationDate = new Date(ts).toISOString().split("T")[0];
                        }

                        return {
                            ...item,
                            enabled: true,
                            key: self.crypto.randomUUID(),
                            unit: typeof item.weight == "number" ? "kg" : null,
                            expirationDate,
                        };
                    })
                };

                setState({state: "finished", image, data});
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
    households: Household[];
}

function ScanFinished(props: ScanFinishedProps) {
    const {state, setState, households} = props;

    const [saving, setSaving] = useState(false);

    const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

    const setItem = (newItem: EditReceiptItemData) => setState(s => {
        const oldState = s as FinishedState;

        const data: EditReceiptData = {
            ...oldState.data,
            items: oldState.data.items.map(item => item.key == newItem.key ? newItem : item),
        };

        const newState = {
            ...oldState,
            data,
        };

        return newState;
    });

    const setStoreName = (newName: string) => setState(s => {
        const oldState = s as FinishedState;
        return {
            ...oldState,
            data: {
                ...oldState.data,
                storeName: newName,
            }
        }
    });

    const setPurchaseDate = (newPurchaseDate: string | null) => setState(s => {
        const oldState = s as FinishedState;
        return {
            ...oldState,
            data: {
                ...oldState.data,
                purchaseDate: newPurchaseDate,
            }
        }
    });

    const setTotalPrice = (newTotalPrice: number | null) => setState(s => {
        const oldState = s as FinishedState;
        return {
            ...oldState,
            data: {
                ...oldState.data,
                totalPrice: newTotalPrice,
            }
        }
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO save
        } catch (error) {
            setState({state: "error", error: error as Error});
        }
    };

    return (
        <>
            <Center>
                <Button size="lg" onClick={() => setState({state: "ready"})}>New scan</Button>
            </Center>

            <Grid mt="md">
                <Grid.Col span={{base: 12, md: 5}}>
                    <Title order={4}>Your Receipt</Title>
                    <Box component="img" src={state.image} alt="Receipt" bdrs="md" mt="md" pos="sticky" top={20} />
                </Grid.Col>

                <Grid.Col span={{base: 12, md: 7}}>
                    <Title order={4}>Identified products</Title>
                    <Stack gap="sm" mt="md">
                        {state.data.items.map((p, i) => (
                            <ProductCard key={i} item={p} setItem={setItem}/>
                        ))}

                        <Card shadow="none" withBorder>
                            <Title order={4}>Save receipt and products</Title>

                            <Select
                                label="Unit"
                                placeholder="Household"
                                required
                                data={households.map((h) => ({ value: h.id, label: h.house_name }))}
                                value={selectedHousehold}
                                onChange={setSelectedHousehold}
                                />

                            <TextInput label="Store name"
                                value={state.data.storeName ?? ""}
                                onChange={e => setStoreName(e.target.value)}
                                mt="xs"
                                />

                            <Flex gap="sm" mt="xs">
                                <TextInput
                                    label="Purchase date"
                                    type="date"
                                    value={state.data.purchaseDate ?? ""}
                                    onChange={(e) => setPurchaseDate(e.target.value || null)}
                                    flex={1}
                                    />

                                <NumberInput label="Total price"
                                    value={state.data.totalPrice ?? ""}
                                    onChange={val => setTotalPrice(typeof val == "number" ? val : null)}
                                    decimalScale={2}
                                    fixedDecimalScale
                                    flex={1}
                                    />
                            </Flex>
                            
                            <Flex justify="end" mt="md">
                                <Button disabled={saving} loading={saving} onClick={() => void handleSave()}>Save selected</Button>
                            </Flex>
                        </Card>
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
    item: EditReceiptItemData;
    setItem: (item: EditReceiptItemData) => void;
}

function ProductCard(props: ProductCardProps) {
    const { item, setItem } = props;   
    

    return (
        <Card shadow="none" withBorder pos="relative">

            <TextInput label="Name"
                required
                value={item.name ?? ""}
                onChange={e => setItem({...item, name: e.target.value})}
                />

            <Checkbox
                checked={item.enabled}
                onChange={e => setItem({...item, enabled: e.target.checked})}
                pos="absolute" right={8} top={8} size="md"
                />
            
            <Flex gap="sm" mt="xs">
                <NumberInput label="Quantity"
                    value={item.quantity ?? ""}
                    onChange={val => setItem({...item, quantity: typeof val == "number" ? val : null})}
                    allowDecimal={false}
                    flex={1}
                    />

                <NumberInput label="Size"
                    value={item.weight ?? ""}
                    onChange={val => setItem({...item, weight: typeof val == "number" ? val : null})}
                    decimalScale={2}
                    fixedDecimalScale
                    flex={1}
                    />

                <Select
                    label="Unit"
                    placeholder="No unit"
                    clearable
                    data={["gr", "ml", "kg", "L"]}
                    value={item.unit}
                    onChange={val => setItem({...item, unit: val})}
                    flex={1}
                    />

                <NumberInput label="Size"
                    value={item.totalPrice ?? ""}
                    onChange={val => setItem({...item, totalPrice: typeof val == "number" ? val : null})}
                    decimalScale={2}
                    fixedDecimalScale
                    flex={1}
                    />
            </Flex>

            <TextInput
                label="Expiration date"
                type="date"
                value={item.expirationDate || ""}
                onChange={(e) => setItem({...item, expirationDate: e.target.value})}
                />
            
        </Card>
    );
}
