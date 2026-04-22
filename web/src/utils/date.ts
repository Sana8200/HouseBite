export function formatDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10)
}

export function getExpirationDateBounds() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const minDate = new Date(today)
    minDate.setFullYear(today.getFullYear() - 100)

    const maxDate = new Date(today)
    maxDate.setFullYear(today.getFullYear() + 100)

    return {
        min: formatDateInputValue(minDate),
        max: formatDateInputValue(maxDate),
    }
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
    if (!expiryDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
