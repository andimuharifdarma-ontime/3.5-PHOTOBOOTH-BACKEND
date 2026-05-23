import { google } from 'googleapis';

/**
 * Google Drive dengan OAuth 2.0
 * Setup: Login sekali sebagai admin, token disimpan dan di-refresh otomatis
 */

// Setup OAuth2 Client
function getOAuth2Client() {
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 
                      process.env.GOOGLE_REDIRECT_URI || 
                      'http://localhost:3000/api/auth/google/callback';
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // Set credentials dari env (refresh token)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  } else {
    console.warn('⚠️ GOOGLE_REFRESH_TOKEN not set');
  }

  return oauth2Client;
}

/**
 * Upload file ke Google Drive menggunakan OAuth
 */
export async function uploadToGoogleDriveOAuth(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
) {
  try {
    const oauth2Client = getOAuth2Client();
    
    // Refresh access token jika diperlukan
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('🔄 OAuth access token refreshed');
    } catch (refreshError) {
      console.warn('⚠️ Failed to refresh access token, using existing:', refreshError);
    }
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Validasi folder ID
    const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!targetFolderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');
    }
    
    console.log(`📤 Uploading ${fileName} (${(fileBuffer.length / 1024).toFixed(2)} KB) to folder: ${targetFolderId}`);

    // Konversi buffer ke stream
    const { Readable } = require('stream');
    const stream = Readable.from(fileBuffer);

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    console.log('✅ File uploaded to Google Drive (OAuth):', response.data.name, 'ID:', response.data.id);
    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
    };
  } catch (error: any) {
    console.error('❌ Google Drive OAuth upload error:', error);
    console.error('   Error details:', {
      message: error?.message,
      code: error?.code,
      errors: error?.errors,
    });
    
    // Extract detailed error message
    let errorMessage = 'Unknown error';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.errors && error.errors.length > 0) {
      errorMessage = error.errors.map((e: any) => e.message).join('; ');
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error?.code || 'NO_CODE',
    };
  }
}

/**
 * Buat folder dengan nama tanggal (OAuth)
 */
export async function createDailyFolderOAuth() {
  try {
    const oauth2Client = getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Format folder: YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Check apakah folder hari ini sudah ada
    const folderSearch = await drive.files.list({
      q: `name='${today}' and mimeType='application/vnd.google-apps.folder' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true, // PENTING: Untuk shared folders
      includeItemsFromAllDrives: true, // PENTING: Include folders dari shared drives
    });

    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      console.log('📁 OAuth: Using existing folder:', today, folderSearch.data.files[0].id);
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

    console.log('📁 OAuth: Created new folder:', today, folder.data.id);
    return folder.data.id!;
  } catch (error) {
    console.error('❌ Error creating daily folder (OAuth):', error);
    return process.env.GOOGLE_DRIVE_FOLDER_ID!;
  }
}

/**
 * Generate OAuth URL untuk login pertama kali
 */
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/drive.file', // Upload files
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // PENTING: Untuk dapat refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen untuk dapat refresh token
  });

  return authUrl;
}

/**
 * Exchange authorization code untuk tokens
 */
export async function getTokensFromCode(code: string) {
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    return {
      success: true,
      tokens,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
    };
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test OAuth connection
 */
export async function testOAuthConnection() {
  try {
    const oauth2Client = getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Try to get user info
    const response = await drive.about.get({
      fields: 'user, storageQuota',
    });
    
    return {
      success: true,
      user: response.data.user,
      quota: response.data.storageQuota,
    };
  } catch (error) {
    console.error('❌ OAuth connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

