import { useState, useRef, useEffect, type Dispatch, type SetStateAction, useCallback } from "react";
import "./Scan.css";
import { Alert, Box, Button, Card, Center, Checkbox, Container, Flex, Grid, Loader, NumberInput, Paper, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import { IconReceipt } from "@tabler/icons-react";
import { scanReceipt, type ReceiptData, type ReceiptItemData } from "../../api/scan";
import { getHouseholds } from "../../api/household";
import { insertProductWithSpecs } from "../../api/product.ts";
import { insertReceipt } from "../../api/receipt.ts";
import type { Household, InsertProduct, InsertProductSpecs, InsertReceipt, ProductSizeUnit } from "../../api/schema.ts";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router";
//import { notifications } from "@mantine/notifications";

const IMG_SIZE = 2000;

interface ReadyState {
    state: "ready";
}

interface ProcessingState {
    state: "processing";
    bitmap: Promise<ImageBitmap>;
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
    key: number;
    enabled: boolean;
    unit: ProductSizeUnit | null;
    expirationDate: string | null;
}

export interface ScanProps {
    user: User;
}

export function Scan(props: ScanProps) {
    const { user } = props;

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
                {state.state == "finished"   && <ScanFinished   state={state} setState={setState} households={households} user={user} />}
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
            if (file) setState({state: "processing", bitmap: window.createImageBitmap(file)});
        });
    };

    const onDrop = (files: FileWithPath[]) => {
        const file = files[0];
        if (!file) return;
        setState({state: "processing", bitmap: window.createImageBitmap(file)});
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
        let cancel = false;
        void process();

        async function process() {
            try {
                // Resize image
                const bitmap = await state.bitmap;

                if (cancel) return;
                
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

                const result = await scanReceipt(image);

                if (cancel) return;

                if (result.error) {
                    setState({state: "error", error: result.error as Error});
                } else {
                    const data: EditReceiptData = {
                        ...result.data!,
                        items: result.data!.items.map((item, i) => {

                            let expirationDate: string | null = null;

                            if (item.estimatedExpirationDays) {
                                const ts = Date.now() + item.estimatedExpirationDays * 24 * 60 * 60 * 1000;
                                expirationDate = new Date(ts).toISOString().split("T")[0];
                            }

                            return {
                                ...item,
                                enabled: true,
                                key: i,
                                unit: typeof item.weight == "number" ? "kg" : null,
                                expirationDate,
                            };
                        })
                    };

                    setState({state: "finished", image, data});
                }
            } catch (error) {
                setState({state: "error", error: error as Error});
            }
        }

        return () => {
            cancel = true;
        };
    }, [state.bitmap, setState]);

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
    user: User;
}

function ScanFinished(props: ScanFinishedProps) {
    const {state, setState, households, user} = props;

    const navigate = useNavigate();

    const [saving, setSaving] = useState(false);

    const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

    const setItem = useCallback((newItem: EditReceiptItemData) => setState(s => {
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
    }), [setState]);

    const addItem = () => setState(s => {
        const oldState = s as FinishedState;
        return {
            ...oldState,
            data: {
                ...oldState.data,
                items: [
                    ...oldState.data.items,
                    {
                        enabled: false,
                        name: null,
                        estimatedExpirationDays: null,
                        expirationDate: null,
                        quantity: null,
                        totalPrice: null,
                        unit: null,
                        weight: null,
                        key: oldState.data.items.length,
                    }
                ]
            }
        }
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
        if (!selectedHousehold) return;
        setSaving(true);
        try {

            const items: [InsertProduct, Omit<InsertProductSpecs, "product_id">][] = [];

            const receipt: InsertReceipt = {
                household_id: selectedHousehold,
                store_name: state.data.storeName,
                total: state.data.totalPrice ?? 0,
                purchase_at: state.data.purchaseDate ?? new Date().toISOString().split("T")[0],
                buyer_id: user.id,
            };

            const receipt_res = await insertReceipt(receipt);
            if (receipt_res.error) throw receipt_res.error;

            for (const item of state.data.items) {
                if (!item.name) continue;
                if (!item.enabled) continue;
                items.push([
                    {
                        household_id: selectedHousehold,
                        name: item.name,
                        receipt_id: receipt_res.data.id,
                    },
                    {
                        quantity: item.quantity ?? 1,
                        price: item.totalPrice,
                        size: item.weight?.toString() ?? null,
                        expiration_date: item.expirationDate,
                        unit: item.unit,
                    }
                ]);
            }

            await Promise.all(items.map(async (item) => {
                const result = await insertProductWithSpecs(...item);
                if (result.error) throw result.error;
            }));

            void navigate("/pantry", {
                state: {
                    householdId: selectedHousehold,
                    householdName: households.find(h => h.id == selectedHousehold)
                }
            });
        } catch (error) {
            console.error("Scan handleSave failed", error)
            setState({state: "error", error: error as Error});
        } finally {
            setSaving(false);
        }
    };

    const disabled = saving || !selectedHousehold;

    return (
        <>
            <Center>
                <Button size="lg" onClick={() => setState({state: "ready"})}>New scan</Button>
            </Center>

            <Grid mt="md">
                <Grid.Col span={{base: 12, md: 5}}>
                    <Title order={4}>1. Your Receipt</Title>
                    <Box component="img" src={state.image} alt="Receipt" bdrs="md" mt="md" pos="sticky" top={20} />
                </Grid.Col>

                <Grid.Col span={{base: 12, md: 7}}>
                    <Title order={4}>2. Identified products</Title>
                    <Text c="dimmed">Pre filled expiration dates are estimates.</Text>

                    <Stack gap="sm" mt="md">
                        {state.data.items.map(p => (
                            <ProductCard key={p.key} item={p} setItem={setItem}/>
                        ))}

                        <Center>
                            <Button variant="subtle" onClick={addItem}>
                                Add missing product
                            </Button>
                        </Center>
                        
                        <Title order={4}>3. Save receipt and selected products</Title>

                        <Card shadow="none" withBorder>
                            <Select
                                label="Household"
                                placeholder="Household"
                                required
                                data={households.map((h) => ({ value: h.id, label: h.house_name }))}
                                value={selectedHousehold}
                                onChange={setSelectedHousehold}
                                mt="xs"
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
                                <Button disabled={disabled} loading={saving} onClick={() => void handleSave()}>Save</Button>
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
                <Center>
                    {state.error.message}
                </Center>
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
                checked={item.enabled && !!item.name}
                disabled={!item.name}
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
            </Flex>

            <Flex gap="sm" mt="xs">
                <TextInput
                    label="Expiration date"
                    type="date"
                    value={item.expirationDate || ""}
                    onChange={(e) => setItem({...item, expirationDate: e.target.value})}
                    flex={3}
                    />
                
                <NumberInput label="Price"
                    value={item.totalPrice ?? ""}
                    onChange={val => setItem({...item, totalPrice: typeof val == "number" ? val : null})}
                    decimalScale={2}
                    fixedDecimalScale
                    flex={2}
                    />
            </Flex>
        </Card>
    );
}
