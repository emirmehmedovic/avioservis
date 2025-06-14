import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Define the absolute path to the private uploads directory
const privateUploadsDir = path.join(__dirname, '../../private_uploads');

// This endpoint serves files from the private_uploads directory
router.get('/:folder/:fileName', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folder, fileName } = req.params;

    // Path traversal vulnerability check
    if (fileName.includes('..') || folder.includes('..')) {
      res.status(400).send('Invalid path');
      return;
    }

    const safeFolderPath = path.join(privateUploadsDir, folder);
    const filePath = path.join(safeFolderPath, fileName);

    // Check if the resolved path is still within the intended directory
    if (!filePath.startsWith(safeFolderPath)) {
      res.status(400).send('Invalid path');
      return;
    }

    // TODO: Implement role-based access control here if needed.
    // For now, any authenticated user can access any file.

    await fs.promises.access(filePath, fs.constants.F_OK);
    res.sendFile(filePath);

  } catch (err) {
    // Check for file not found error
    if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).send('File not found');
    } else {
      console.error('Error accessing file:', err);
      res.status(500).send('Internal server error');
    }
  }
});

export default router;
