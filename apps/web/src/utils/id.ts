import { v4 as uuidv4 } from 'uuid'

export function createClientId() {
  const cryptoObject = globalThis.crypto

  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID()
  }

  return uuidv4()
}
