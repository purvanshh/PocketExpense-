// Backward-compatible re-export from the new structured pipeline.
// All consumers should migrate to importing from 'services/sms' directly.
export { parseSms, isBankMessage, type ParsedTransaction, EMPTY_RESULT } from './sms';
