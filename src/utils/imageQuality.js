// Image quality check — blur detection via canvas Laplacian variance
export function checkImageQuality(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = h * maxDim / w; w = maxDim; }
        if (h > w && h > maxDim) { w = w * maxDim / h; h = maxDim; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Convert to grayscale and compute Laplacian variance for blur
        const gray = [];
        for (let i = 0; i < data.length; i += 4) {
          const g = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
          gray.push(g);
        }
        // Simple blur metric: variance of Laplacian
        let laplacian = [];
        const width = w;
        for (let y = 1; y < h-1; y++) {
          for (let x = 1; x < width-1; x++) {
            const idx = y*width + x;
            const val = -4*gray[idx] + gray[idx-1] + gray[idx+1] + gray[idx-width] + gray[idx+width];
            laplacian.push(val);
          }
        }
        const mean = laplacian.reduce((a,b) => a+b, 0) / laplacian.length;
        const variance = laplacian.reduce((a,b) => a + (b-mean)*(b-mean), 0) / laplacian.length;

        const isBlurry = variance < 100; // threshold tuned for leaf photos
        const isDark = gray.reduce((a,b) => a+b, 0)/gray.length < 50;
        const isBright = gray.reduce((a,b) => a+b, 0)/gray.length > 220;

        let issues = [];
        if (isBlurry) issues.push('Photo is blurry — take closer, steady photo of leaf');
        if (isDark) issues.push('Photo too dark — take in daylight');
        if (isBright) issues.push('Photo too bright — avoid direct flash');
        if (w < 200 || h < 200) issues.push('Photo too small — take closer photo');

        resolve({
          variance: Math.round(variance),
          isBlurry,
          isDark,
          isBright,
          issues,
          isGood: issues.length === 0,
          width: img.width,
          height: img.height
        });
      } catch (e) {
        resolve({ variance: 0, isBlurry: false, issues: [], isGood: true, width: img.width, height: img.height });
      }
    };
    img.onerror = () => resolve({ variance: 0, isBlurry: false, issues: [], isGood: true, width: 0, height: 0 });
    img.src = imageDataUrl;
  });
}
