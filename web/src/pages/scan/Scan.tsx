import { useState, useRef, useEffect, type Dispatch, type SetStateAction, useCallback } from "react";
import "./Scan.css";
import { Alert, Button, Card, Center, Checkbox, Flex, Loader, NumberInput, Paper, Select, Stack, Text, TextInput, Title, Stepper, Group, Accordion, Grid, Box } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import { IconReceipt, IconAlertCircle } from "@tabler/icons-react";
import { scanReceipt, type ReceiptData, type ReceiptItemData } from "../../api/scan";
import { getHouseholds } from "../../api/household";
import { insertProductWithSpecs } from "../../api/product.ts";
import { insertReceipt } from "../../api/receipt.ts";
import type { Household, InsertProduct, InsertProductSpecs, InsertReceipt, ProductSizeUnit } from "../../api/schema.ts";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router";
import { notifications } from "@mantine/notifications";

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

    const [state, setState] = useState<ScanState>({ state: "ready" });
    const [activeStep, setActiveStep] = useState(0);

    const [households, setHouseholds] = useState<Household[]>([]);

    useEffect(() => {
        void load();
        async function load() {
            const householdsResult = await getHouseholds();
            if (householdsResult.error) {
                setState({ state: "error", error: householdsResult.error });
            } else {
                setHouseholds(householdsResult.data ?? []);
            }
        }
    }, []);

    return (

        <>

        <Stack gap="xl" p="xl">
            <Group justify="space-between" align="flex-start">
                <Title order={1}>Load a new receipt to your pantry</Title>
            </Group>
            <Group justify="space-between" align="flex-start">
                <Text c="dimmed">You can take a new picture or drag and drop from your computer. You can only do it one receipt at a time.</Text>
            </Group>
            <Paper shadow="md" p="md">
                <Stepper active={activeStep} onStepClick={setActiveStep}>
                    <Stepper.Step label="Upload" description="Take or upload photo">
                        {activeStep === 0 && state.state === "ready" && <ScanReady state={state} setState={setState} setActiveStep={setActiveStep} />}
                    </Stepper.Step>
                    
                    <Stepper.Step label="Processing" description="AI reads receipt">
                        {activeStep === 1 && state.state === "processing" && <ScanProcessing state={state} setState={setState} setActiveStep={setActiveStep} />}
                    </Stepper.Step>
                    
                    <Stepper.Step label="Review" description="Check & edit items">
                        {activeStep === 2 && state.state === "finished" && <ScanReview state={state} setState={setState} households={households} setActiveStep={setActiveStep} />}
                    </Stepper.Step>
                    
                    <Stepper.Step label="Save" description="Final confirmation">
                        {activeStep === 3 && state.state === "finished" && <ScanSave state={state} households={households} user={user} setActiveStep={setActiveStep} />}
                    </Stepper.Step>
                </Stepper>
            </Paper>

            <Accordion variant="filled" radius="lg" chevronIconSize={17}>
                <Accordion.Item value="how-it-works">
                    <Accordion.Control>Curious about how it works?</Accordion.Control>
                    <Accordion.Panel>
                        We use OpenAI's model to read the receipt. We don't store any of the data, just the receipt which you can see in the View receipts page of your household.
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </Stack>


        {state.state === "error" && (
            <Alert
                variant="light"
                color="red"
                radius="md"
                icon={<IconAlertCircle size={18} />}
                title="Couldn't read your receipt"
                mt="md"
                mx="xl"
            >
                {friendlyScanError(state.error)}
                <Button 
                    size="sm" 
                    onClick={() => {
                        setState({ state: "ready" });
                        setActiveStep(0);
                    }}
                    mt="md"
                >
                    Try again
                </Button>
            </Alert>
        )}

    </>

    
    );

}

interface ScanReadyProps {
    state: ReadyState;
    setState: Dispatch<SetStateAction<ScanState>>;
    setActiveStep: Dispatch<SetStateAction<number>>;
}

function friendlyScanError(err: Error): string {
    const msg = err.message ?? "";
    if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        return "Couldn't reach the server. Check your connection.";
    }
    return msg || "Something went wrong while reading the receipt.";
}

function ScanReady(props: ScanReadyProps) {
    const { setState, setActiveStep } = props;

    const [camera, setCamera] = useState(false);

    const videoOutputRef = useRef<HTMLVideoElement>(null);

    // Setup the camera
    useEffect(() => {
        let cancel = false;
        let mediaStream: MediaStream | null = null;

        void (load());

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
            if (file) setState({ state: "processing", bitmap: window.createImageBitmap(file) });
            setActiveStep(1);
        });
    };

    const onDrop = (files: FileWithPath[]) => {
        const file = files[0];
        if (!file) return;
        setState({ state: "processing", bitmap: window.createImageBitmap(file) });
        setActiveStep(1);
    };

    return (
        <>
            <Flex direction={{ base: "column", md: "row" }} gap="md" align="stretch">
                {camera && (
                    <Flex direction="column" style={{ flex: 1 }}>
                        <Center pos="relative">
                            <video className="scan-video" ref={videoOutputRef}>Video stream not available.</video>
                            <Button pos="absolute" bottom={20} size="lg" onClick={takePhoto}>Scan</Button>
                        </Center>
                    </Flex>
                )}

                <Flex direction="column" style={{ flex: 1 }}>
                    {camera && (
                        <Center mt="md">
                            <Text size="lg">Or upload an image</Text>
                        </Center>
                    )}

                    <Dropzone onDrop={onDrop} accept={IMAGE_MIME_TYPE}>
                        <Stack align="center" p="md">
                            <IconReceipt size={54} />
                            <Text>Drag and drop a receipt image, or click to select</Text>
                        </Stack>
                    </Dropzone>
                </Flex>
            </Flex>
        </>
    );
}

interface ScanProcessingProps {
    state: ProcessingState;
    setState: Dispatch<SetStateAction<ScanState>>;
    setActiveStep: Dispatch<SetStateAction<number>>;
}

function ScanProcessing(props: ScanProcessingProps) {
    const { state, setState: setScanState, setActiveStep } = props;

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

                if (result.response?.status == 429) {
                    setScanState({ state: "error", error: new Error("Please try again later") });
                } else if (result.error) {
                    setScanState({ state: "error", error: result.error as Error });
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

                    setScanState({ state: "finished", image, data });
                    setActiveStep(2); // autoadvance to next step
                }
            } catch (error) {
                setScanState({ state: "error", error: error as Error });
            }
        }

        return () => {
            cancel = true;
        };
    }, [state.bitmap, setScanState, setActiveStep]);

    return (
        <>
            <Stack align="center">
                <Loader size="lg" mt="md" />
                <Text mt="md">Reading your receipt...</Text>
            </Stack>

            <Group justify="center" mt="xl">
                <Button 
                    variant="default" 
                    onClick={() => {
                        setScanState({ state: "ready" });
                        setActiveStep(0);
                    }}
                >
                    Back to Upload
                </Button>
            </Group>
        </>
    );
}

interface ScanReviewProps {
    state: FinishedState;
    setState: Dispatch<SetStateAction<ScanState>>;
    households: Household[];
    setActiveStep: Dispatch<SetStateAction<number>>;
}

function ScanReview(props: ScanReviewProps) {
    const { state, setState, setActiveStep } = props;

    const setItem = useCallback((newItem: EditReceiptItemData) => setState(s => {
        const oldState = s as FinishedState;
        const data: EditReceiptData = {
            ...oldState.data,
            items: oldState.data.items.map(item => item.key == newItem.key ? newItem : item),
        };
        return { ...oldState, data };
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



    return (
        <>
            <Title order={3}>Review & edit receipt</Title>
            <Text c="dimmed" mb="md">Pre-filled expiration dates are estimates! Please check on your product for the actual expiration date.</Text>

            <Grid>
                <Grid.Col span={{ base: 12, md: 5 }}>
                <Card shadow="sm" withBorder p="sm">
                    <Box 
                        component="img" 
                        src={state.image} 
                        alt="Receipt" 
                        style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                    />
                </Card>

                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>

            <Title order={4}>Products</Title>
            <Stack gap="sm" mt="xs">
                {state.data.items.map(p => (
                    <ProductCard key={p.key} item={p} setItem={setItem} />
                ))}

                <Center>
                    <Button variant="subtle" onClick={addItem}>
                        Add missing product
                    </Button>
                </Center>
            </Stack>

                </Grid.Col>
            </Grid>

            <Group justify="center" mt="xl">
                <Button variant="default" onClick={() => setActiveStep(1)}>Back</Button>
                <Button onClick={() => setActiveStep(3)}>
                    Continue to Save
                </Button>
            </Group>
        </>
    );
}

interface ScanSaveProps {
    state: FinishedState;
    households: Household[];
    user: User;
    setActiveStep: Dispatch<SetStateAction<number>>;
}

function ScanSave(props: ScanSaveProps) {
    const { state, households, user, setActiveStep } = props;
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
    
    // Local state for editable fields
    const [storeName, setStoreName] = useState(state.data.storeName ?? "");
    const [purchaseDate, setPurchaseDate] = useState(state.data.purchaseDate ?? "");
    const [totalPrice, setTotalPrice] = useState<number | null>(state.data.totalPrice ?? null);

    const handleSave = async () => {
        if (!selectedHousehold) return;
        setSaving(true);
        try {
            const items: [InsertProduct, Omit<InsertProductSpecs, "product_id">][] = [];

            const receipt: InsertReceipt = {
                household_id: selectedHousehold,
                store_name: storeName || "Unknown Store",
                total: totalPrice ?? 0,
                purchase_at: purchaseDate || new Date().toISOString().split("T")[0],
                buyer_id: user.id,
            };

            const receipt_res = await insertReceipt(receipt);
            if (receipt_res.error) throw receipt_res.error;

            for (const item of state.data.items) {
                if (!item.name || !item.enabled) continue;
                items.push([
                    {
                        household_id: selectedHousehold,
                        name: item.name,
                        receipt_id: receipt_res.data.id,
                    },
                    {
                        bought_quantity: item.quantity ?? 1,
                        current_quantity: item.quantity ?? 1,
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

            const savedCount = items.length;
            notifications.show({
                color: "green",
                title: "Receipt saved",
                message: `Added ${savedCount} product${savedCount === 1 ? "" : "s"} to your pantry.`,
            });
            
            setActiveStep(0);
            void navigate("/pantry", {
                state: {
                    householdId: selectedHousehold,
                    householdName: households.find(h => h.id == selectedHousehold)?.house_name
                }
            });
        } catch (error) {
            notifications.show({
                color: "red",
                title: "Could not save receipt",
                message: friendlyScanError(error as Error)
            });
        } finally {
            setSaving(false);
        }
    };

    const enabledItems = state.data.items.filter(i => i.enabled && i.name);
    const totalProducts = enabledItems.length;
    const totalValue = enabledItems.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

    return (
        <>
            <Title order={3}>Confirm and save</Title>
            <Grid>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Card shadow="sm" withBorder p="sm">
                        <Box 
                            component="img" 
                            src={state.image} 
                            alt="Receipt" 
                            style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                        />
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                    
                    <Card shadow="none" withBorder mb="md">
                        <Select
                            label="Household"
                            placeholder="Select household"
                            required
                            data={households.map((h) => ({ value: h.id, label: h.house_name }))}
                            value={selectedHousehold}
                            onChange={setSelectedHousehold}
                        />

                        <TextInput 
                            label="Store name"
                            value={storeName}
                            onChange={e => setStoreName(e.target.value)}
                            mt="xs"
                        />

                        <Flex gap="sm" mt="xs">
                            <TextInput
                                label="Purchase date"
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                flex={1}
                            />

                            <NumberInput 
                                label="Total price"
                                value={totalPrice ?? ""}
                                onChange={val => setTotalPrice(typeof val == "number" ? val : null)}
                                decimalScale={2}
                                fixedDecimalScale
                                flex={1}
                            />
                        </Flex>
                    </Card>

                    <Text fw={500} mt="md">Products to save ({totalProducts}):</Text>
                    {enabledItems.map((item, idx) => (
                        <Text key={idx} size="sm">
                            • {item.name} - Qty: {item.quantity ?? 1} - ${item.totalPrice?.toFixed(2) ?? "0.00"}
                            {item.expirationDate && ` (Exp: ${item.expirationDate})`}
                        </Text>
                    ))}
                    
                    {totalProducts === 0 && (
                        <Text c="red" size="sm">No products selected to save!</Text>
                    )}
                    
                    <Text fw={500} mt="md">Total value: ${totalValue.toFixed(2)}</Text>

                    <Group justify="center" mt="xl">
                        <Button variant="default" onClick={() => setActiveStep(2)}>Back to Edit</Button>
                        <Button 
                            onClick={() => void handleSave()} 
                            loading={saving} 
                            disabled={saving || !selectedHousehold || totalProducts === 0}
                            color="green"
                        >
                            Save to Pantry
                        </Button>
                    </Group>
                </Grid.Col>
            </Grid>
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
                onChange={e => setItem({ ...item, name: e.target.value })}
            />

            <Checkbox
                checked={item.enabled && !!item.name}
                disabled={!item.name}
                onChange={e => setItem({ ...item, enabled: e.target.checked })}
                pos="absolute" right={8} top={8} size="md"
            />

            <Flex gap="sm" mt="xs">
                <NumberInput label="Quantity"
                    value={item.quantity ?? ""}
                    onChange={val => setItem({ ...item, quantity: typeof val == "number" ? val : null })}
                    allowDecimal={false}
                    flex={1}
                />

                <NumberInput label="Size"
                    value={item.weight ?? ""}
                    onChange={val => setItem({ ...item, weight: typeof val == "number" ? val : null })}
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
                    onChange={val => setItem({ ...item, unit: val })}
                    flex={1}
                />
            </Flex>

            <Flex gap="sm" mt="xs">
                <TextInput
                    label="Expiration date"
                    type="date"
                    value={item.expirationDate || ""}
                    onChange={(e) => setItem({ ...item, expirationDate: e.target.value })}
                    flex={3}
                />

                <NumberInput label="Price"
                    value={item.totalPrice ?? ""}
                    onChange={val => setItem({ ...item, totalPrice: typeof val == "number" ? val : null })}
                    decimalScale={2}
                    fixedDecimalScale
                    flex={2}
                />
            </Flex>
        </Card>
    );
}
