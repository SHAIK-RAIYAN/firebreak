import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const generate = customAlphabet(alphabet, 20);

/**
 * Generate a prefixed unique id.
 * Format: `<prefix>_` + 20-char nanoid from [0-9a-z].
 */
export function newId(
  prefix:
    | "ws"
    | "svc"
    | "ghi"
    | "vcn"
    | "alr"
    | "inc"
    | "sus"
    | "ana"
    | "act"
    | "prb"
    | "evt"
    | "mck"
    | "aic"
    | "req",
): string {
  return `${prefix}_${generate()}`;
}
