export function formatCurrency(amount: number | null | undefined, options?: Intl.NumberFormatOptions): string {
    if (typeof amount != "number") return "-";

    const formatter = new Intl.NumberFormat(undefined, {
        ...options,
        style: "currency",
        currency: options?.currency || "SEK",
    });

    return formatter.format(amount);
}
