export function formatStudentId(id: string): string {
  return id.replace(/^([1-3][A-D])([1-9])$/, "$10$2");
}
