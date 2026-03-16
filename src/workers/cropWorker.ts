self.onmessage = (e) => {
  const { id, imageData, targetRatio } = e.data;
  const { width, height, data } = imageData;
  
  const energy = new Float32Array(width * height);
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      
      const iRight = (y * width + x + 1) * 4;
      const rR = data[iRight], gR = data[iRight+1], bR = data[iRight+2];
      
      const iDown = ((y + 1) * width + x) * 4;
      const rD = data[iDown], gD = data[iDown+1], bD = data[iDown+2];
      
      const dx = Math.abs(r - rR) + Math.abs(g - gR) + Math.abs(b - bR);
      const dy = Math.abs(r - rD) + Math.abs(g - gD) + Math.abs(b - bD);
      
      const cx = width / 2;
      const cy = height / 2;
      const dx_c = (x - cx) / cx;
      const dy_c = (y - cy) / cy;
      const distSq = dx_c * dx_c + dy_c * dy_c;
      const centerBias = Math.exp(-distSq * 2); 
      
      energy[y * width + x] = (dx + dy) * centerBias;
    }
  }
  
  let cropX = 0, cropY = 0, cropW = width, cropH = height;
  const imgRatio = width / height;
  
  if (Math.abs(imgRatio - targetRatio) > 0.01) {
    if (imgRatio > targetRatio) {
      cropW = Math.round(height * targetRatio);
      cropH = height;
      
      const colSums = new Float32Array(width);
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let y = 0; y < height; y++) sum += energy[y * width + x];
        colSums[x] = sum;
      }
      
      let currentEnergy = 0;
      for (let x = 0; x < cropW; x++) currentEnergy += colSums[x];
      
      let maxEnergy = currentEnergy;
      let bestX = 0;
      
      for (let x = 1; x <= width - cropW; x++) {
        currentEnergy = currentEnergy - colSums[x - 1] + colSums[x + cropW - 1];
        if (currentEnergy > maxEnergy) {
          maxEnergy = currentEnergy;
          bestX = x;
        }
      }
      cropX = bestX;
    } else {
      cropW = width;
      cropH = Math.round(width / targetRatio);
      
      const rowSums = new Float32Array(height);
      for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let x = 0; x < width; x++) sum += energy[y * width + x];
        rowSums[y] = sum;
      }
      
      let currentEnergy = 0;
      for (let y = 0; y < cropH; y++) currentEnergy += rowSums[y];
      
      let maxEnergy = currentEnergy;
      let bestY = 0;
      
      for (let y = 1; y <= height - cropH; y++) {
        currentEnergy = currentEnergy - rowSums[y - 1] + rowSums[y + cropH - 1];
        if (currentEnergy > maxEnergy) {
          maxEnergy = currentEnergy;
          bestY = y;
        }
      }
      cropY = bestY;
    }
  }
  
  self.postMessage({ id, cropX, cropY, cropW, cropH });
};
