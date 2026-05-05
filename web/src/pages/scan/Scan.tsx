import { useState, useRef, useEffect, type Dispatch, type SetStateAction, Fragment } from "react";
import "./Scan.css";
import { Alert, Button, Card, Center, Flex, NumberInput, Paper, Select, Stack, Text, TextInput, Title, Stepper, Group, Accordion, Grid, Box, Table, Divider, ThemeIcon, Tooltip, Popover, Checkbox } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import { DatePickerInput } from "@mantine/dates";
import { getExpirationDateBounds } from "../../utils/date";
import { IconReceipt, IconAlertCircle, IconBuildingCommunity } from "@tabler/icons-react";
import { scanReceipt, type ReceiptData, type ReceiptItemData } from "../../api/scan";
import { getHouseholds } from "../../api/household";
import { insertProductWithSpecs } from "../../api/product.ts";
import { insertReceipt } from "../../api/receipt.ts";
import type { Household, InsertProduct, InsertProductSpecs, InsertReceipt, ProductSizeUnit } from "../../api/schema.ts";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router";
import { notifications } from "@mantine/notifications";
import { DelayedCustomLoader, CustomLoader } from "../../components/CustomLoader.tsx";
import { formatCurrency } from "../../utils/currency.ts";

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
    const navigate = useNavigate();

    const [state, setState] = useState<ScanState>({ state: "ready" });
    const [activeStep, setActiveStep] = useState(0);
    const [confirmReset, setConfirmReset] = useState(false);

    const [households, setHouseholds] = useState<Household[]>([]);
    const [loadingHouseholds, setLoadingHouseholds] = useState(true);

    useEffect(() => {
        void load();
        async function load() {
            const householdsResult = await getHouseholds();
            if (householdsResult.error) {
                setState({ state: "error", error: householdsResult.error });
                setLoadingHouseholds(false);
                return;
            }
            const list = householdsResult.data ?? [];
            setHouseholds(list);
            setLoadingHouseholds(false);
        }
    }, []);

    // Stepper buttons do nothing - they're just visual indicators
    const handleStepClick = () => {        
        return;// do nothing
    };

    const handleReset = () => {
        setState({ state: "ready" });
        setActiveStep(0);
        setConfirmReset(false);
    };

    if (loadingHouseholds) {
        return (
            <Center p="xl">
                <DelayedCustomLoader />
            </Center>
        );
    }

    if (households.length === 0) {
        return (
            <Center p="xl">
                <Paper withBorder shadow="sm" radius="xl" p={{ base: "lg", sm: "xl" }} maw={520}>
                    <Stack gap="md" align="center" ta="center">
                        <ThemeIcon size={64} radius="xl" variant="light" color="brand">
                            <IconBuildingCommunity size={32} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={2} size="h3">You need a household first</Title>
                        <Text c="dimmed">
                            Scanned receipts are saved to a household so everyone living together can see them.
                            Create or join a household to start scanning receipts.
                        </Text>
                        <Button
                            mt="xs"
                            leftSection={<IconBuildingCommunity size={18} />}
                            onClick={() => void navigate("/household")}
                        >
                            Go to Households
                        </Button>
                    </Stack>
                </Paper>
            </Center>
        );
    }

    return (
        <>
            <Stack gap="xl" p="xl">
                <Group justify="space-between" align="flex-start">
                    <Title order={1}>Load a new receipt to your pantry</Title>
                </Group>
                <Group justify="space-between" align="flex-start">
                    <Text c="dimmed">You can take a new picture or drag and drop from your computer. You can only do it one receipt at a time. Pre-filled expiration dates are estimates! Please check on your product for the actual expiration date.</Text>
                    <Text c="dimmed" mb="sm">Don't reload or close this page until you save, you will lose your progress.</Text>
                </Group>
                <Paper shadow="md" p="md">
                    <Stepper active={activeStep} onStepClick={handleStepClick}>
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

                <Accordion variant="filled" chevronPosition="left" radius="lg" chevronIconSize={17}>
                    <Accordion.Item value="how-it-works">
                        <Accordion.Control>Curious about how it works?</Accordion.Control>
                        <Accordion.Panel>
                            We use a third party's model to read the receipt. We don't store any of the data, just the receipt which you can see in the View receipts page of your household.
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
                        onClick={handleReset}
                        mt="md"
                    >
                        Try again
                    </Button>
                </Alert>
            )}

            {/* Reset Confirmation Popover */}
            <Popover
                opened={confirmReset}
                onClose={() => setConfirmReset(false)}
                position="top"
                withArrow
                shadow="md"
                withinPortal
            >
                <Popover.Target>
                    <div style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }} />
                </Popover.Target>
                <Popover.Dropdown>
                    <Stack gap="sm">
                        <Text size="sm">This will delete your progress so far. Are you sure?</Text>
                        <Group gap="sm" justify="flex-end">
                            <Button size="xs" variant="default" onClick={() => setConfirmReset(false)}>
                                Cancel
                            </Button>
                            <Button 
                                size="xs" 
                                color="red" 
                                onClick={handleReset}
                            >
                                Yes, delete progress
                            </Button>
                        </Group>
                    </Stack>
                </Popover.Dropdown>
            </Popover>
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
            <Flex direction="column" style={{ flex: 1 }}>
                <Center pos="relative" style={{ display: camera ? "flex" : "none" }}>
                    <video className="scan-video" ref={videoOutputRef}>Video stream not available.</video>
                    <Button pos="absolute" bottom={20} size="lg" onClick={takePhoto}>Scan</Button>
                </Center>
                
                {!camera && (
                    <Paper p="xl" ta="center" style={{ width: "100%" }}>
                        <Center h="100%" mih={200}>
                            <Stack align="center" p="md">
                                <CustomLoader size={40} />
                                <Text size="sm" c="dimmed" ta="center">
                                    Requesting camera access…
                                </Text>
                            </Stack>
                        </Center>
                    </Paper>
                )}
            </Flex>

                <Flex direction="column" style={{ flex: 1 }}>
                    {camera}

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
                    // Handle case when no items are detected
                    const items = result.data?.items ?? [];
                    
                    const data: EditReceiptData = {
                        ...result.data!,
                        storeName: result.data?.storeName ?? "",
                        purchaseDate: result.data?.purchaseDate ?? "",
                        totalPrice: result.data?.totalPrice ?? null,
                        items: items.length > 0 ? items.map((item, i) => {
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
                        }) : [
                            // Add a default empty item when no products detected
                            {
                                enabled: true,
                                name: "",
                                estimatedExpirationDays: null,
                                expirationDate: null,
                                quantity: 1,
                                totalPrice: null,
                                unit: null,
                                weight: null,
                                key: 0,
                            }
                        ]
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
                <CustomLoader />
                <Text mt="md">Reading your receipt...</Text>
            </Stack>
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
    const [confirmReset, setConfirmReset] = useState(false);

    const addItem = () => setState(s => {
        const oldState = s as FinishedState;
        const newItem = {
            enabled: true,
            name: "",
            estimatedExpirationDays: null,
            expirationDate: null,
            quantity: 1,
            totalPrice: null,
            unit: null,
            weight: null,
            key: oldState.data.items.length,
        };
        const newItems = [...oldState.data.items, newItem];
        
        return {
            ...oldState,
            data: {
                ...oldState.data,
                items: newItems,
            }
        };
    });

    const hasValidProducts = state.data.items.some(item => item.name && item.name.trim() !== "" && item.enabled);

    return (
        <>
            <Grid>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Card withBorder={false} shadow="none" p={0}>
                        <Center>
                            <Box 
                                component="img" 
                                src={state.image} 
                                alt="Receipt" 
                                style={{ width: "80%", height: "auto", borderRadius: "8px" }}
                            />
                        </Center>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Stack gap="md">
                        <Box ta="right" mt="xl">
                            <Text c="dimmed" size="sm">
                                You can unselect products if you don't want to include them
                            </Text>
                        </Box>
                        {state.data.items.map((item, index) => (
                            <Fragment key={item.key}>
                                <ProductCard 
                                    item={item} 
                                    setItem={(updatedItem) => {
                                        const newItems = [...state.data.items];
                                        newItems[index] = updatedItem;
                                        setState(s => {
                                            const oldState = s as FinishedState;
                                            return {
                                                ...oldState,
                                                data: { ...oldState.data, items: newItems }
                                            };
                                        });
                                    }} 
                                />
                                <Divider />
                            </Fragment>
                        ))}

                        <Center>
                            <Button variant="subtle" onClick={addItem} size="sm">
                                + Add missing product
                            </Button>
                        </Center>

                        <Group justify="space-between" mt="xl">
                            <Popover
                                opened={confirmReset}
                                onClose={() => setConfirmReset(false)}
                                position="bottom"
                                withArrow
                                shadow="md"
                            >
                                <Popover.Target>
                                    <Button 
                                        variant="default" 
                                        onClick={() => setConfirmReset(true)}
                                    >
                                        Back to Upload
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Stack gap="sm">
                                        <Text size="sm">This will delete your progress so far. Are you sure?</Text>
                                        <Group gap="sm" justify="flex-end">
                                            <Button size="xs" variant="default" onClick={() => setConfirmReset(false)}>
                                                Cancel
                                            </Button>
                                            <Button 
                                                size="xs" 
                                                color="red" 
                                                onClick={() => {
                                                    setConfirmReset(false);
                                                    setState({ state: "ready" });
                                                    setActiveStep(0);
                                                }}
                                            >
                                                Yes, delete progress
                                            </Button>
                                        </Group>
                                    </Stack>
                                </Popover.Dropdown>
                            </Popover>
                            
                            <Button 
                                onClick={() => setActiveStep(3)}
                                color="green"
                                disabled={!hasValidProducts}
                            >
                                Continue to Save
                            </Button>
                        </Group>
                    </Stack>
                </Grid.Col>
            </Grid>
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
    const totalPrice = state.data.totalPrice ?? null;

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

    const enabledItems = state.data.items.filter(i => i.enabled && i.name && i.name.trim() !== "");
    const totalProducts = enabledItems.length;
    const totalValue = enabledItems.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

    const noProductsTooltip = "No products have been added yet. Please go back to the review step and add products.";

    return (
        <>
            <Grid>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Card withBorder={false} shadow="none" p={0}>
                        <Center>
                            <Box 
                                component="img" 
                                src={state.image} 
                                alt="Receipt" 
                                style={{ width: "80%", height: "auto", borderRadius: "8px" }}
                            />
                        </Center>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Paper radius="md" p="lg" shadow="none">
                        <Stack gap="md">
                            {/* Receipt Header */}
                            <Flex 
                                  gap="xl"
                                  justify="center"
                                  direction={{ base: "column", sm: "row" }} 
                                  wrap="wrap">

                                <Select
                                    label="Household"
                                    placeholder="Select household"
                                    required
                                    data={households.map((h) => ({ value: h.id, label: h.house_name }))}
                                    value={selectedHousehold}
                                    onChange={setSelectedHousehold}
                                />

                                <TextInput 
                                    label="Shop name"
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                    size="sm"
                                />

                                <TextInput
                                    label="Purchase date"
                                    type="date"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    size="sm"
                                />
                            </Flex>

                            {/* Products Table */}
                            {totalProducts > 0 ? (
                                <Table verticalSpacing="sm" horizontalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Product</Table.Th>
                                            <Table.Th ta="center">Quantity</Table.Th>
                                            <Table.Th ta="right">Price</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {enabledItems.map((item) => (
                                            <Table.Tr key={item.key}>
                                                <Table.Td>
                                                    <Text fw={500} size="sm">{item.name}</Text>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Text c="dimmed" size="sm">{item.quantity ?? 1}</Text>
                                                </Table.Td>
                                                <Table.Td ta="right">
                                                    <Text fw={500} size="sm">{formatCurrency(item.totalPrice)}</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Text c="dimmed" ta="center" py="md">No products added yet</Text>
                            )}

                            {/* Summary Footer */}
                            <Divider />

                            <Group justify="space-between" align="center">
                                <Group gap="sm">
                                    <ThemeIcon size={30} radius="xl" variant="light" color="brand">
                                        <IconReceipt size={16} stroke={1.8} />
                                    </ThemeIcon>
                                    <Text fw={700} size="lg">Total</Text>
                                </Group>

                                <Stack gap={4} align="flex-end">
                                    <Text fw={800} size="xl" c="brand.7">
                                        {formatCurrency(totalValue)}
                                    </Text>
                                </Stack>
                            </Group>

                            {/* Navigation Buttons */}
                            <Group justify="space-between" mt="md">
                                <Button variant="default" onClick={() => setActiveStep(2)} size="sm">
                                    Back to Review
                                </Button>
                                <Tooltip 
                                    label={totalProducts === 0 ? noProductsTooltip : "Please select a household first"}
                                    position="bottom"
                                    disabled={(!!selectedHousehold && totalProducts > 0)}
                                >
                                    <span>
                                        <Button 
                                            onClick={() => void handleSave()} 
                                            loading={saving} 
                                            disabled={saving || !selectedHousehold || totalProducts === 0}
                                            color="green"
                                            size="sm"
                                        >
                                            Save to Pantry
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Group>
                        </Stack>
                    </Paper>
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
    const expirationDateBounds = getExpirationDateBounds();

    return (
        <Card shadow="none" pos="relative" style={{ opacity: item.enabled ? 1 : 0.6 }}>
            <Checkbox
                checked={item.enabled && !!item.name}
                disabled={!item.name}
                onChange={e => setItem({ ...item, enabled: e.target.checked })}
                pos="absolute" 
                right={8} 
                top={8} 
                size="md"
                label={!item.name ? "Add name to enable" : ""}
            />

            <TextInput label="Name"
                required
                value={item.name ?? ""}
                onChange={e => setItem({ ...item, name: e.target.value, enabled: e.target.value ? item.enabled : false })}
                pr={50}
            />

            <Flex gap="sm" mt="xs">
                <NumberInput label="Quantity"
                    value={item.quantity ?? ""}
                    onChange={val => setItem({ ...item, quantity: typeof val == "number" ? val : null })}
                    allowDecimal={false}
                    flex={1}
                    disabled={!item.enabled}
                />

                <NumberInput label="Size"
                    value={item.weight ?? ""}
                    onChange={val => setItem({ ...item, weight: typeof val == "number" ? val : null })}
                    decimalScale={2}
                    fixedDecimalScale
                    flex={1}
                    disabled={!item.enabled}
                />

                <Select
                    label="Unit"
                    placeholder="No unit"
                    clearable
                    data={["gr", "ml", "kg", "L"]}
                    value={item.unit}
                    onChange={val => setItem({ ...item, unit: val })}
                    flex={1}
                    disabled={!item.enabled}
                />
            </Flex>

            <Flex gap="sm" mt="xs">
                <DatePickerInput
                    label="Expiration date"
                    placeholder="Pick a date"
                    clearable
                    value={item.expirationDate || null}
                    minDate={expirationDateBounds.min}
                    maxDate={expirationDateBounds.max}
                    onChange={(value) => setItem({ ...item, expirationDate: value })}
                    flex={3}
                    disabled={!item.enabled}
                    popoverProps={{ classNames: { dropdown: "app-date-picker__dropdown" } }}
                    classNames={{
                        input: "app-date-picker__input",
                        calendarHeader: "app-date-picker__header",
                        calendarHeaderControl: "app-date-picker__header-control",
                        weekday: "app-date-picker__weekday",
                        day: "app-date-picker__day",
                    }}
                />

                <NumberInput label="Price"
                    value={item.totalPrice ?? ""}
                    onChange={val => setItem({ ...item, totalPrice: typeof val == "number" ? val : null })}
                    decimalScale={2}
                    fixedDecimalScale
                    flex={2}
                    disabled={!item.enabled}
                />
            </Flex>
        </Card>
    );
}
