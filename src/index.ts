import { PNG } from "pngjs";
import fs from "fs";

// // Imagem no campo de arquivo do ONE convrtida para base 64.
// const base64data = _object.imagem.getContentAsBase64();

// // Buffer da imagem.
// const imageBuffered = Buffer.from(base64data, "base64");

console.time("process");

const imageBuffered = fs.readFileSync(
  "/Users/matheusoliveira/Desktop/Node Image processing/image_input.png"
);

// Convertendo o buffer em PNG.
const png = PNG.sync.read(imageBuffered);

// Converte a imagem PNG em escala de cinza(grayscale).
const grayscalePng = convertToGrayscale(png);
// fs.writeFileSync("greyScale.png", PNG.sync.write(grayscalePng));

// Aplica o threshold na imagem.
const thresholdPng = applyThreshold(grayscalePng, 148);
// fs.writeFileSync("th.png", PNG.sync.write(thresholdPng));

// Aplica o threshold na imagem.
const thresholdPngFinal = applyAdaptiveMeanThreshold(thresholdPng, 7, 2);

// Converte a imagem PNG em um buffer
// const grayscaleBuffer = PNG.sync.write(thresholdPngFinal);
fs.writeFileSync("result.png", PNG.sync.write(thresholdPngFinal));

console.timeEnd("process");

// Converte a imagem em base64.
// const base64Image = grayscaleBuffer.toString("base64");

// Cria o arquivo baseado em base64.
// _object.imagemProcessada = _util._fileHelper.create({
//   targetFileName: "teste.png",
//   targetContentType: "image/png",
//   base64: base64Image,
// });

// Atualiza o objeto.
// imageProcessing.imageThreshold._update(_object);

// Converte imagem RGBa em Escala de Cinza.
function convertToGrayscale(png) {
  // Iterate over each pixel
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      // Calculate the index in the PNG data array
      const idx = (png.width * y + x) << 2; // 4 bytes per pixel: RGBA

      // Extract the RGB values
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];

      // Average method
      const gray = (r + g + b) / 3;

      // Set the new grayscale value
      png.data[idx] = gray; // Red
      png.data[idx + 1] = gray; // Green
      png.data[idx + 2] = gray; // Blue
      // Alpha channel remains unchanged
    }
  }

  return png;
}

// Algoritmo de threshold(0 - 255) na imagem.
function applyThreshold(png, threshold) {
  // Iterate over each pixel
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      // Calculate the index in the PNG data array
      const idx = (png.width * y + x) << 2; // 4 bytes per pixel: RGBA

      // Grayscale value (Red, Green, and Blue are the same)
      const gray = png.data[idx];

      // Apply threshold
      const value = gray > threshold ? 255 : 0; // White or Black

      // Set the new thresholded value
      png.data[idx] = value; // Red
      png.data[idx + 1] = value; // Green
      png.data[idx + 2] = value; // Blue
      // Alpha channel remains unchanged
    }
  }

  return png;
}

// Function to apply adaptive threshold using Gaussian filter
function applyGaussianThreshold(png, blockSize, sigma) {
  const width = png.width;
  const height = png.height;
  const data = png.data;

  // Convert PNG data to grayscale intensity array
  const grayData = new Float32Array(width * height);
  for (let i = 0; i < grayData.length; i++) {
    grayData[i] = data[i * 4]; // grayscale image
  }

  // Apply Gaussian filter to get the local mean values
  const blurredData = gaussianFilter(grayData, width, height, blockSize, sigma);

  // Apply thresholding
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const mean = blurredData[width * y + x];
      const value = data[idx] > mean ? 255 : 0; // Binary thresholding
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }

  return png;
}

function gaussianFilter(grayData, width, height, blockSize, sigma) {
  const kernelRadius = Math.floor(blockSize / 2);
  const kernelSize = blockSize;
  const kernel = createGaussianKernel(kernelSize, sigma);

  // Create a new array to store the blurred image data
  const blurredData = new Float32Array(grayData.length);

  // Apply Gaussian filter
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;

      for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
        for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
          const ny = y + ky;
          const nx = x + kx;

          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const weight = kernel[ky + kernelRadius][kx + kernelRadius];
            const idx = width * ny + nx;
            sum += grayData[idx] * weight;
            weightSum += weight;
          }
        }
      }

      blurredData[width * y + x] = sum / weightSum;
    }
  }

  return blurredData;
}

function createGaussianKernel(size, sigma) {
  const kernel = [];
  const halfSize = Math.floor(size / 2);
  const twoSigmaSquare = 2 * sigma * sigma;
  const PI_SIGMA = Math.PI * sigma * sigma;

  for (let y = -halfSize; y <= halfSize; y++) {
    const row = [];
    for (let x = -halfSize; x <= halfSize; x++) {
      const exponent = -(x * x + y * y) / twoSigmaSquare;
      row.push(Math.exp(exponent) / PI_SIGMA);
    }
    kernel.push(row);
  }

  return kernel;
}

// Aplica algoritmo adaptativo de baseado na média na imagem.
// Blocksize: número de vizinhos considerados para calcular o treshold
// C: Valor subtraído da média.
function applyAdaptiveMeanThreshold(png, blockSize, C) {
  const width = png.width;
  const height = png.height;
  const data = png.data;

  const halfBlockSize = Math.floor(blockSize / 2);

  // Iterate over each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      // Calculate the local mean in the neighborhood
      for (let ky = -halfBlockSize; ky <= halfBlockSize; ky++) {
        for (let kx = -halfBlockSize; kx <= halfBlockSize; kx++) {
          const ny = y + ky;
          const nx = x + kx;

          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const idx = (width * ny + nx) << 2;
            sum += data[idx]; // Grayscale value
            count++;
          }
        }
      }

      // Compute the local mean and apply threshold
      const mean = sum / count;
      const idx = (width * y + x) << 2;
      const value = data[idx] > mean - C ? 255 : 0; // Subtracting C for the threshold

      // Set the new thresholded value
      data[idx] = value; // Red
      data[idx + 1] = value; // Green
      data[idx + 2] = value; // Blue
      data[idx + 3] = 255; // Alpha (fully opaque)
    }
  }

  return png;
}
