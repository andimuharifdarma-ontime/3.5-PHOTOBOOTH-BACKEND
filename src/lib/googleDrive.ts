import { google } from 'googleapis';

/**
 * Upload file ke Google Drive
 */
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
) {
  try {
    // Setup auth dengan service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Konversi buffer ke stream
    const { Readable } = require('stream');
    const stream = Readable.from(fileBuffer);

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId || process.env.GOOGLE_DRIVE_FOLDER_ID!],
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true, // PENTING: Untuk shared folders
    });

    console.log('✅ File uploaded to Google Drive:', response.data.name);
    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
    };
  } catch (error) {
    console.error('❌ Google Drive upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Buat folder dengan nama tanggal (YYYY-MM-DD)
 * Jika folder sudah ada, return existing folder ID
 */
export async function createDailyFolder() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Format folder: YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Check apakah folder hari ini sudah ada
    const folderSearch = await drive.files.list({
      q: `name='${today}' and mimeType='application/vnd.google-apps.folder' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true, // PENTING: Untuk shared folders
      includeItemsFromAllDrives: true, // PENTING: Include files dari shared drives
    });

    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      // Folder sudah ada, gunakan yang existing
      console.log('📁 Service Account: Using existing folder:', today, folderSearch.data.files[0].id);
      return folderSearch.data.files[0].id!;
    }

    // Buat folder baru
    const folder = await drive.files.create({
      requestBody: {
        name: today,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      fields: 'id, name',
      supportsAllDrives: true, // PENTING: Untuk shared folders
    });

    console.log('📁 Service Account: Created new folder:', today, folder.data.id);
    return folder.data.id!;
  } catch (error) {
    console.error('❌ Error creating daily folder:', error);
    // Fallback ke root folder jika gagal
    return process.env.GOOGLE_DRIVE_FOLDER_ID!;
  }
}

/**
 * Hapus folder beserta seluruh isinya dari Google Drive
 */
export async function deleteFolder(folderId: string) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({
      fileId: folderId,
      supportsAllDrives: true,
    });

    console.log('🗑️ Folder deleted from Google Drive (Service Account):', folderId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List files di folder tertentu
 */
export async function listFiles(folderId?: string) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.list({
      q: `'${folderId || process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, size)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      supportsAllDrives: true, // PENTING: Untuk shared folders
      includeItemsFromAllDrives: true, // PENTING: Include files dari shared drives
    });

    return {
      success: true,
      files: response.data.files || [],
    };
  } catch (error) {
    console.error('❌ Error listing files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      files: [],
    };
  }
}

