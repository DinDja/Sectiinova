/**
 * Comprime imagem para base64 com qualidade controlada
 * @param {File} file - Arquivo da imagem
 * @param {Object} options - Opções de compressão
 * @param {number} options.maxWidth - Largura máxima (padrão: 800)
 * @param {number} options.maxHeight - Altura máxima (padrão: 800)
 * @param {number} options.quality - Qualidade JPEG 0-1 (padrão: 0.7)
 * @param {number} options.maxSizeKB - Tamanho máximo em KB (padrão: 200)
 * @returns {Promise<string>} - Base64 da imagem comprimida
 */
export async function compressImageToBase64(file, options = {}) {
    const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 0.7,
        maxSizeKB = 200,
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionar se necessário
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Tentar comprimir até atingir tamanho máximo
                let currentQuality = quality;
                let base64;
                let iterations = 0;
                const maxIterations = 10;

                const tryCompress = () => {
                    base64 = canvas.toDataURL('image/jpeg', currentQuality);
                    const sizeKB = (base64.length / 1024).toFixed(2);

                    if (sizeKB > maxSizeKB && currentQuality > 0.1 && iterations < maxIterations) {
                        currentQuality -= 0.1;
                        iterations++;
                        tryCompress();
                    } else {
                        resolve(base64);
                    }
                };

                tryCompress();
            };

            img.onerror = () => {
                reject(new Error('Falha ao carregar imagem para compressão'));
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            reject(new Error('Falha ao ler arquivo de imagem'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Valida se arquivo é imagem válida
 * @param {File} file - Arquivo a validar
 * @param {number} maxSizeMB - Tamanho máximo em MB (padrão: 5)
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export function validateImageFile(file, maxSizeMB = 5) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!file) {
        return { isValid: false, error: 'Nenhuma imagem selecionada' };
    }

    if (!validTypes.includes(file.type)) {
        return { isValid: false, error: 'Tipo de imagem não suportado. Use JPEG, PNG, WebP ou GIF' };
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
        return { isValid: false, error: `Imagem muito grande. Máximo: ${maxSizeMB}MB` };
    }

    return { isValid: true };
}

/**
 * Retorna tamanho formatado da imagem em base64
 * @param {string} base64 - String base64
 * @returns {string} - Tamanho formatado (ex: "150 KB")
 */
export function getBase64Size(base64) {
    const sizeBytes = (base64.length / 1024).toFixed(2);
    if (sizeBytes > 1024) {
        return `${(sizeBytes / 1024).toFixed(2)} MB`;
    }
    return `${sizeBytes} KB`;
}
