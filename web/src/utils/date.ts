/* Helper functions for handling dates and formattings*/
export function formatDateInputValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
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

/* Helper for returning the expiration label shown in the table view. */
export function getExpiryLabel(daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) return "No date";
  if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)} day(s) ago`;
  if (daysUntilExpiry === 0) return "Expires today";
  return `Expires in ${daysUntilExpiry} day(s)`;
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) return "-";
  return amount.toFixed(2).replace(".", ",") + " kr";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Helper for formatting the expiration date. */
export function formatExpiry(expirationDate: string | null): string {
  if (!expirationDate) return "No expiration date";
  return new Date(expirationDate).toLocaleDateString();
}

/* Helper for formatting the purchasedOn date or other Optional dates needed. */
export function formatOptionalDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}
