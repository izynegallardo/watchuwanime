import { pipeline } from '@huggingface/transformers'

let extractor

/**
 * Initialize the embedding pipeline
 */
export async function getExtractor() {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    }

    return extractor
}

/**
 * Generates a vector embedding array for a given text string.
 * @param {string} text - The input text (e.g., anime synopsis, genres, tags)
 * @returns {Promise<number[]>} A 384-dimensional array of numbers
 */
export async function generateEmbedding(text) {
    const extract = await getExtractor()

    // pooling: 'mean' averages token outputs; normalize: true squashes vector length to 1
    const output = await extract(text, { pooling: 'mean', normalize: true })

    // extract the raw numerical array from the underlying tensor object
    return Array.from(output.data)
}
