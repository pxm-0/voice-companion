export function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(date)
}
