const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ImageProcessor {
  constructor() {
    this.avatarSizes = {
      thumbnail: { width: 50, height: 50 },
      small: { width: 100, height: 100 },
      medium: { width: 200, height: 200 },
      large: { width: 400, height: 400 }
    };
  }

  // Process avatar image with multiple sizes
  async processAvatar(inputPath, outputDir, filename) {
    try {
      const processedImages = {};
      const baseFilename = path.parse(filename).name;

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Process each size
      for (const [sizeName, dimensions] of Object.entries(this.avatarSizes)) {
        const outputFilename = `${baseFilename}-${sizeName}.webp`;
        const outputPath = path.join(outputDir, outputFilename);

        await sharp(inputPath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 85 })
          .toFile(outputPath);

        processedImages[sizeName] = {
          filename: outputFilename,
          path: outputPath,
          url: `/uploads/avatars/${outputFilename}`,
          width: dimensions.width,
          height: dimensions.height
        };
      }

      // Clean up original file
      try {
        await fs.unlink(inputPath);
      } catch (error) {
        console.warn('Failed to delete original file:', error.message);
      }

      return processedImages;
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process avatar image');
    }
  }

  // Validate image file
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      
      const validations = {
        isValid: true,
        errors: []
      };

      // Check format
      const allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
      if (!allowedFormats.includes(metadata.format)) {
        validations.isValid = false;
        validations.errors.push('Invalid image format. Allowed: JPEG, PNG, GIF, WebP');
      }

      // Check dimensions
      const maxDimension = 2048;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        validations.isValid = false;
        validations.errors.push(`Image dimensions too large. Maximum: ${maxDimension}x${maxDimension}`);
      }

      const minDimension = 50;
      if (metadata.width < minDimension || metadata.height < minDimension) {
        validations.isValid = false;
        validations.errors.push(`Image dimensions too small. Minimum: ${minDimension}x${minDimension}`);
      }

      // Check if image has transparency (for PNG/GIF)
      if (metadata.hasAlpha && metadata.format === 'png') {
        // This is fine, PNG with transparency is allowed
      }

      return {
        ...validations,
        metadata: {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
          hasAlpha: metadata.hasAlpha
        }
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid or corrupted image file'],
        metadata: null
      };
    }
  }

  // Generate image thumbnail for preview
  async generateThumbnail(inputPath, outputPath, size = 150) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  // Clean up old avatar files
  async cleanupOldAvatars(userId, currentAvatarData) {
    try {
      const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
      const files = await fs.readdir(avatarDir);
      
      // Find files that belong to this user
      const userFiles = files.filter(file => file.startsWith(`avatar-${userId}-`));
      
      // Keep current avatar files
      const currentFiles = currentAvatarData ? 
        Object.values(currentAvatarData).map(img => img.filename) : [];
      
      // Delete old files
      for (const file of userFiles) {
        if (!currentFiles.includes(file)) {
          try {
            await fs.unlink(path.join(avatarDir, file));
            console.log(`🗑️  Cleaned up old avatar: ${file}`);
          } catch (error) {
            console.warn(`Failed to delete old avatar ${file}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Avatar cleanup error:', error);
    }
  }

  // Get image info without processing
  async getImageInfo(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      const stats = await fs.stat(filePath);

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: stats.size,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density,
        space: metadata.space
      };
    } catch (error) {
      throw new Error('Failed to get image information');
    }
  }

  // Convert image to WebP format
  async convertToWebP(inputPath, outputPath, quality = 85) {
    try {
      await sharp(inputPath)
        .webp({ quality })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('WebP conversion error:', error);
      throw new Error('Failed to convert image to WebP');
    }
  }

  // Optimize image without changing dimensions
  async optimizeImage(inputPath, outputPath, quality = 85) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      let pipeline = sharp(inputPath);
      
      // Apply format-specific optimization
      switch (metadata.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        default:
          // Convert to WebP for other formats
          pipeline = pipeline.webp({ quality });
      }

      await pipeline.toFile(outputPath);
      return outputPath;
    } catch (error) {
      console.error('Image optimization error:', error);
      throw new Error('Failed to optimize image');
    }
  }
}

// Create singleton instance
const imageProcessor = new ImageProcessor();

module.exports = imageProcessor;