const { BlobServiceClient } = require('@azure/storage-blob');

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_ACC_STORAGE);
const containerClient = blobServiceClient.getContainerClient('edumatch-container');

module.exports = containerClient;