/** An error whose message is safe and useful to show to the person who acted (validation, guard, permission). */
export class UserError extends Error {
  constructor(
    message: string,
    public code: 'invalid' | 'forbidden' | 'conflict' | 'not_found' | 'unauthenticated' = 'invalid',
    public field?: string,
  ) {
    super(message)
  }
}

export const fail = (message: string, code?: UserError['code'], field?: string): never => {
  throw new UserError(message, code, field)
}
export const forbidden = (message = 'Anda tidak berwenang melakukan tindakan ini.'): never => {
  throw new UserError(message, 'forbidden')
}
export const notFound = (what = 'Data'): never => {
  throw new UserError(`${what} tidak ditemukan.`, 'not_found')
}
export const conflict = (message = 'Data sudah diubah orang lain. Muat ulang halaman lalu coba lagi.'): never => {
  throw new UserError(message, 'conflict')
}
