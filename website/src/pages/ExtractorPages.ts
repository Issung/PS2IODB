/**
 * The Extractor and Upload pages, re-exported from one module so App's lazy imports put them in the same chunk.
 * Upload is a rarely used debugging page, so it rides along with the Extractor rather than getting its own chunk.
 */
export { default as Extractor } from './Extractor';
export { default as Upload } from './Upload';
