import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Download, IdCard, Images, Printer, Sparkles, UserRound } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { auth } from '../../../firebase';
import { getAvatarSrc, getInitials } from '../../utils/helpers';
import { buildMembershipBarcodePayload } from '../../utils/membershipBarcode';

const CARD_WIDTH = 1400;
const CARD_HEIGHT = 884;
const CARD_RADIUS = 72;
const INK = '#0f172a';
const CYAN = '#67e8f9';
const YELLOW = '#fde047';
const PINK = '#f472b6';
const LIME = '#bef264';
const FONT_STACK = '"Comic Sans MS", "Comic Neue", Arial, sans-serif';
const MENTOR_PROFILES = new Set(['orientador', 'coorientador']);
const CARD_TEMPLATES = [
    {
        id: 'neo',
        label: 'Neo Brutalista',
        summary: 'Visual colorido com geometrias e destaque para identidade do clube.'
    },
    {
        id: 'classic',
        label: 'Classico Institucional',
        summary: 'Layout mais formal com leitura limpa para impressao.'
    },
    {
        id: 'tech',
        label: 'Tech Neon',
        summary: 'Estetica futurista com contraste alto para eventos de CT&I.'
    }
];
const CARD_TEMPLATE_IDS = new Set(CARD_TEMPLATES.map((template) => template.id));

const normalizeCardTemplateId = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return CARD_TEMPLATE_IDS.has(normalized) ? normalized : 'neo';
};

const getCardTemplateMeta = (templateId) => {
    const normalized = normalizeCardTemplateId(templateId);
    return CARD_TEMPLATES.find((template) => template.id === normalized) || CARD_TEMPLATES[0];
};

const normalizeProfile = (value) => String(value || '').trim().toLowerCase();

const isMentorProfile = (value) => MENTOR_PROFILES.has(normalizeProfile(value));

const safeText = (value, fallback = '') => {
    const text = String(value || '').trim();
    return text || fallback;
};

const stripDiacritics = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const makeCode = (value, size) => {
    const normalized = stripDiacritics(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
    return (normalized || 'CLUBE').slice(0, size).padEnd(size, 'X');
};

const buildMembershipNumber = (club, student) => {
    const clubCode = makeCode(club?.id || club?.nome, 4);
    const studentCode = makeCode(student?.matricula || student?.id || student?.uid || student?.email || student?.nome, 6);
    return `CTI${clubCode}${studentCode}`;
};

const getMemberBarcodeReference = (member) => safeText(
    member?.id
    || member?.uid
    || member?.matricula
    || member?.matricula_escolar
    || member?.registro
    || member?.codigo
    || member?.email
    || member?.nome,
    'MEMBRO'
);

const buildMembershipBarcodeValue = (club, member, role, year = new Date().getFullYear()) => buildMembershipBarcodePayload({
    clubId: safeText(club?.id || club?.nome, 'CLUBE'),
    memberId: getMemberBarcodeReference(member),
    roleCode: String(role || '').trim().toLowerCase() === 'mentor' ? 'M' : 'C',
    expiryYmd: `${Number(year || new Date().getFullYear())}1231`,
});

const getStudentKey = (student, index = 0) => String(
    student?.id || student?.uid || student?.email || student?.matricula || `${student?.nome || 'clubista'}${index}`
).trim();

const getMatricula = (student) => safeText(
    student?.matricula || student?.matricula_escolar || student?.registro || student?.codigo || '', 'Nao informada'
);

const getStudentClass = (student) => safeText(
    student?.turma || student?.serie || student?.ano || student?.etapa || '', 'Clubista'
);

const sanitizeFilename = (value) => {
    const cleaned = stripDiacritics(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    return cleaned || 'carteirinhaclube';
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem de assinatura.'));
    reader.readAsDataURL(file);
});

const loadCanvasImage = (src) => new Promise((resolve) => {
    const imageSrc = safeText(src);
    if (!imageSrc || typeof Image === 'undefined') { resolve(null); return; }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = imageSrc;
});

const roundedPath = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
};

const fillRoundRect = (ctx, x, y, width, height, radius, fillStyle) => {
    ctx.save();
    roundedPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
};

const strokeRoundRect = (ctx, x, y, width, height, radius, strokeStyle = INK, lineWidth = 8) => {
    ctx.save();
    roundedPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
};

const drawCoverImage = (ctx, image, x, y, width, height) => {
    if (!image) return;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let drawWidth = width, drawHeight = height, drawX = x, drawY = y;

    if (imageRatio > targetRatio) {
        drawHeight = height;
        drawWidth = height * imageRatio;
        drawX = x - (drawWidth - width) / 2;
    } else {
        drawWidth = width;
        drawHeight = width / imageRatio;
        drawY = y - (drawHeight - height) / 2;
    }
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
};

const drawRoundedImage = (ctx, image, x, y, width, height, radius, fallbackText, fallbackFill) => {
    ctx.save();
    roundedPath(ctx, x, y, width, height, radius);
    ctx.clip();
    if (image) {
        drawCoverImage(ctx, image, x, y, width, height);
    } else {
        ctx.fillStyle = fallbackFill;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.min(width, height) * 0.28}px ${FONT_STACK}`;
        ctx.fillText(fallbackText, x + width / 2, y + height / 2);
    }
    ctx.restore();
    strokeRoundRect(ctx, x, y, width, height, radius, INK, 8);
};

// CORREÇÃO: Adicionado o `maxWidth` no fillText nativo como trava de segurança final.
const drawFittedText = (ctx, text, x, y, maxWidth, initialSize, options = {}) => {
    const {
        color = INK,
        weight = 900,
        minSize = 28,
        align = 'left',
        baseline = 'alphabetic',
    } = options;

    const displayText = safeText(text);
    let size = initialSize;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;

    while (ctx.measureText(displayText).width > maxWidth && size > minSize) {
        size -= 2;
        ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    }

    // Trava de compressão visual: impede que invada outras divs se atingir o minSize
    ctx.fillText(displayText, x, y, maxWidth);
    return size;
};

const drawLabelValue = (ctx, label, value, x, y, width) => {
    fillRoundRect(ctx, x, y, width, 88, 26, 'rgba(255,255,255,0.88)');
    strokeRoundRect(ctx, x, y, width, 88, 26, INK, 5);

    ctx.fillStyle = PINK;
    ctx.fillRect(x + 20, y + 18, 12, 52);
    ctx.fillStyle = INK;
    ctx.font = `900 22px ${FONT_STACK}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label.toUpperCase(), x + 46, y + 34, width - 70);
    drawFittedText(ctx, value, x + 46, y + 66, width - 70, 30, { minSize: 20, weight: 900 });
};

const drawBarcode = (ctx, x, y, width, height, value) => {
    fillRoundRect(ctx, x, y, width, height, 22, '#ffffff');
    strokeRoundRect(ctx, x, y, width, height, 22, INK, 5);
    const source = safeText(value, 'CTI1|CLUBE|MEMBRO|C|20991231|000')
        .replace(/[^a-zA-Z0-9@._:\-|]/g, '');

    const barcodeCanvas = document.createElement('canvas');
    const horizontalPadding = 22;
    const verticalPadding = 12;
    const maxBarcodeWidth = Math.max(120, width - horizontalPadding * 2);
    const maxBarcodeHeight = Math.max(28, height - verticalPadding * 2);

    try {
        JsBarcode(barcodeCanvas, source || 'CTI1|CLUBE|MEMBRO|C|20991231|000', {
            format: 'CODE128',
            displayValue: false,
            margin: 0,
            width: 2,
            height: maxBarcodeHeight,
            lineColor: INK,
            background: '#ffffff',
        });

        const widthScale = maxBarcodeWidth / barcodeCanvas.width;
        const heightScale = maxBarcodeHeight / barcodeCanvas.height;
        const scale = Math.min(widthScale, heightScale);
        const drawWidth = barcodeCanvas.width * scale;
        const drawHeight = barcodeCanvas.height * scale;
        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(barcodeCanvas, drawX, drawY, drawWidth, drawHeight);
        ctx.imageSmoothingEnabled = prevSmoothing;
    } catch (error) {
        console.warn('Falha ao renderizar barcode CODE128 da carteirinha:', error);
        let cursor = x + 24;
        const maxX = x + width - 24;
        const fallbackSeed = source || 'CTI1|CLUBE|MEMBRO|C|20991231|000';
        for (let index = 0; cursor < maxX; index += 1) {
            const charCode = fallbackSeed.charCodeAt(index % fallbackSeed.length);
            const barWidth = 3 + (charCode % 3) * 2;
            const gap = 2 + (charCode % 2);
            ctx.fillStyle = INK;
            ctx.fillRect(cursor, y + 14, barWidth, height - 28);
            cursor += barWidth + gap;
        }
    }
};

const drawSeal = (ctx, cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.16);
    ctx.fillStyle = LIME;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 22px ${FONT_STACK}`;
    ctx.fillText('CLUBE', 0, -8);
    ctx.font = `900 18px ${FONT_STACK}`;
    ctx.fillText('OFICIAL', 0, 18);
    ctx.restore();
};

const createMembershipCardImage = async ({
    viewingClub,
    viewingClubSchool,
    selectedMember,
    memberRole,
    signingMentorName,
    signatureImageUrl,
    clubBannerUrl,
    clubLogoUrl,
    templateId = 'neo'
}) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;

    const ctx = canvas.getContext('2d');
    const memberPhotoUrl = getAvatarSrc(selectedMember);
    const resolvedTemplateId = normalizeCardTemplateId(templateId);
    const [bannerImage, logoImage, memberImage, signatureImage] = await Promise.all([
        loadCanvasImage(clubBannerUrl),
        loadCanvasImage(clubLogoUrl),
        loadCanvasImage(memberPhotoUrl),
        loadCanvasImage(signatureImageUrl),
    ]);

    const clubName = safeText(viewingClub?.nome, 'Clube de Ciencias');
    const memberName = safeText(selectedMember?.nome, 'Membro');
    const schoolName = safeText(viewingClubSchool?.nome || viewingClub?.escola_nome || selectedMember?.escola_nome, 'Unidade escolar');
    const roleLabel = memberRole === 'mentor' ? 'MENTOR' : 'CLUBISTA';
    const currentYear = new Date().getFullYear();
    const membershipBarcodeValue = buildMembershipBarcodeValue(viewingClub, selectedMember, memberRole, currentYear);


    if (resolvedTemplateId === 'classic') {
        ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
        fillRoundRect(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, CARD_RADIUS, '#f8fafc');

        if (bannerImage) {
            ctx.save();
            roundedPath(ctx, 8, 8, CARD_WIDTH - 16, 230, 48);
            ctx.clip();
            ctx.globalAlpha = 0.32;
            drawCoverImage(ctx, bannerImage, 8, 8, CARD_WIDTH - 16, 230);
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = 'rgba(15,23,42,0.04)';
        for (let y = 32; y < CARD_HEIGHT; y += 30) {
            ctx.fillRect(0, y, CARD_WIDTH, 1.5);
        }

        fillRoundRect(ctx, 38, 38, 14, CARD_HEIGHT - 76, 8, PINK);
        strokeRoundRect(ctx, 10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, CARD_RADIUS, INK, 12);
        strokeRoundRect(ctx, 36, 36, CARD_WIDTH - 72, CARD_HEIGHT - 72, 44, 'rgba(15,23,42,0.3)', 4);

        drawRoundedImage(ctx, logoImage, 82, 74, 150, 150, 34, getInitials(clubName), '#ffffff');

        fillRoundRect(ctx, 262, 74, 720, 76, 30, '#ffffff');
        strokeRoundRect(ctx, 262, 74, 720, 76, 30, INK, 5);
        drawFittedText(ctx, 'CARTEIRINHA OFICIAL DO CLUBE', 300, 122, 640, 34, { minSize: 24, weight: 900, baseline: 'middle' });

        fillRoundRect(ctx, 1010, 74, 310, 76, 30, CYAN);
        strokeRoundRect(ctx, 1010, 74, 310, 76, 30, INK, 5);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 30px ${FONT_STACK}`;
        ctx.fillText(String(currentYear), 1165, 112);
        ctx.textAlign = 'left';

        drawRoundedImage(ctx, memberImage, 84, 236, 340, 522, 36, getInitials(memberName), '#ffffff');
        drawSeal(ctx, 390, 220);

        fillRoundRect(ctx, 458, 236, 858, 90, 30, '#ffffff');
        strokeRoundRect(ctx, 458, 236, 858, 90, 30, INK, 5);
        drawFittedText(ctx, roleLabel, 496, 292, 200, 34, { minSize: 22, weight: 900 });

        drawFittedText(ctx, memberName.toUpperCase(), 458, 382, 858, 66, { minSize: 34, weight: 900 });
        drawFittedText(ctx, clubName.toUpperCase(), 458, 430, 858, 34, { minSize: 22, weight: 900, color: '#1e3a8a' });
        drawFittedText(ctx, schoolName.toUpperCase(), 458, 470, 858, 22, { minSize: 14, weight: 900, color: '#475569' });

        drawLabelValue(ctx, 'Matricula', getMatricula(selectedMember), 458, 516, 308);
        drawLabelValue(ctx, 'Turma', getStudentClass(selectedMember), 782, 516, 208);
        drawLabelValue(ctx, 'Validade', `12/${currentYear}`, 1006, 516, 200);

        drawBarcode(ctx, 458, 634, 748, 96, membershipBarcodeValue);

        return canvas.toDataURL('image/png');
    }

    if (resolvedTemplateId === 'tech') {
        const bgGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
        bgGradient.addColorStop(0, '#020617');
        bgGradient.addColorStop(0.5, '#0f172a');
        bgGradient.addColorStop(1, '#1e293b');
        fillRoundRect(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, CARD_RADIUS, bgGradient);

        if (bannerImage) {
            ctx.save();
            roundedPath(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, CARD_RADIUS);
            ctx.clip();
            ctx.globalAlpha = 0.24;
            drawCoverImage(ctx, bannerImage, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16);
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = 'rgba(103,232,249,0.34)';
        ctx.lineWidth = 1;
        for (let y = 32; y < CARD_HEIGHT; y += 36) {
            ctx.beginPath();
            ctx.moveTo(18, y);
            ctx.lineTo(CARD_WIDTH - 18, y);
            ctx.stroke();
        }

        strokeRoundRect(ctx, 10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, CARD_RADIUS, '#67e8f9', 8);
        strokeRoundRect(ctx, 28, 28, CARD_WIDTH - 56, CARD_HEIGHT - 56, 54, '#f472b6', 3);

        drawRoundedImage(ctx, logoImage, 70, 70, 168, 168, 36, getInitials(clubName), '#ffffff');

        fillRoundRect(ctx, 262, 70, 842, 84, 26, 'rgba(2,6,23,0.72)');
        strokeRoundRect(ctx, 262, 70, 842, 84, 26, '#67e8f9', 4);
        drawFittedText(ctx, 'CARTEIRINHA TECH CT&I', 300, 122, 760, 36, { minSize: 24, weight: 900, color: '#e2e8f0', baseline: 'middle' });

        fillRoundRect(ctx, 1128, 70, 198, 84, 26, 'rgba(244,114,182,0.9)');
        strokeRoundRect(ctx, 1128, 70, 198, 84, 26, '#67e8f9', 4);
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 30px ${FONT_STACK}`;
        ctx.fillText(String(currentYear), 1227, 112);
        ctx.textAlign = 'left';

        drawRoundedImage(ctx, memberImage, 82, 252, 360, 540, 42, getInitials(memberName), '#ffffff');
        drawSeal(ctx, 428, 232);

        fillRoundRect(ctx, 474, 252, 834, 86, 24, 'rgba(15,23,42,0.78)');
        strokeRoundRect(ctx, 474, 252, 834, 86, 24, '#67e8f9', 4);
        drawFittedText(ctx, roleLabel, 516, 306, 220, 34, { minSize: 22, weight: 900, color: '#f8fafc' });

        drawFittedText(ctx, memberName.toUpperCase(), 474, 412, 834, 66, { minSize: 34, weight: 900, color: '#f8fafc' });
        drawFittedText(ctx, clubName.toUpperCase(), 474, 458, 834, 30, { minSize: 20, weight: 900, color: '#67e8f9' });
        drawFittedText(ctx, schoolName.toUpperCase(), 474, 494, 834, 20, { minSize: 14, weight: 900, color: '#cbd5e1' });

        drawLabelValue(ctx, 'Matricula', getMatricula(selectedMember), 474, 534, 308);
        drawLabelValue(ctx, 'Turma', getStudentClass(selectedMember), 798, 534, 208);
        drawLabelValue(ctx, 'Validade', `12/${currentYear}`, 1022, 534, 180);

        drawBarcode(ctx, 474, 650, 728, 100, membershipBarcodeValue);

        return canvas.toDataURL('image/png');
    }

    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.save();
    roundedPath(ctx, 10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, CARD_RADIUS);
    ctx.clip();

    const bgGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bgGradient.addColorStop(0, '#d9f99d');
    bgGradient.addColorStop(0.42, '#67e8f9');
    bgGradient.addColorStop(1, '#f9a8d4');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    if (bannerImage) drawCoverImage(ctx, bannerImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.fillStyle = 'rgba(15,23,42,0.08)';
    for (let y = 26; y < CARD_HEIGHT; y += 38) {
        for (let x = 24; x < CARD_WIDTH; x += 38) {
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.fillStyle = 'rgba(253,224,71,0.86)';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(560, 0); ctx.lineTo(330, CARD_HEIGHT); ctx.lineTo(0, CARD_HEIGHT);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = 'rgba(103,232,249,0.88)';
    ctx.beginPath();
    ctx.moveTo(CARD_WIDTH, 0); ctx.lineTo(CARD_WIDTH, CARD_HEIGHT); ctx.lineTo(980, CARD_HEIGHT); ctx.lineTo(1160, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    strokeRoundRect(ctx, 10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, CARD_RADIUS, INK, 14);
    strokeRoundRect(ctx, 36, 36, CARD_WIDTH - 72, CARD_HEIGHT - 72, 52, 'rgba(15,23,42,0.32)', 4);

    drawRoundedImage(ctx, logoImage, 86, 76, 176, 176, 40, getInitials(clubName), '#ffffff');

    fillRoundRect(ctx, 294, 76, 520, 72, 30, '#ffffff');
    strokeRoundRect(ctx, 294, 76, 520, 72, 30, INK, 6);
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle'; // CORREÇÃO: Alinhamento vertical da Header Box
    ctx.font = `900 28px ${FONT_STACK}`;
    ctx.fillText('CARTEIRINHA OFICIAL', 330, 112); 
    
    ctx.fillStyle = PINK;
    ctx.fillRect(750, 96, 36, 32);

    fillRoundRect(ctx, 1120, 76, 194, 76, 30, YELLOW);
    strokeRoundRect(ctx, 1120, 76, 194, 76, 30, INK, 6);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // CORREÇÃO: Alinhamento vertical da caixa de Ano
    ctx.font = `900 30px ${FONT_STACK}`;
    ctx.fillText(String(currentYear), 1217, 114);
    ctx.textAlign = 'left';

    drawRoundedImage(ctx, memberImage, 88, 304, 388, 452, 48, getInitials(memberName), '#ffffff');
    drawSeal(ctx, 440, 300); // CORREÇÃO: Selo recuado para esquerda para não sobrepor o texto.

    // CORREÇÃO: Baseline 'bottom' e Y em 250 para evitar a faixa rosa na linha 266.
    drawFittedText(ctx, clubName.toUpperCase(), 528, 250, 720, 54, { minSize: 32, weight: 900, baseline: 'bottom' });
    ctx.fillStyle = PINK;
    ctx.fillRect(528, 266, 478, 16);
    ctx.fillStyle = CYAN;
    ctx.fillRect(528, 286, 298, 16);

    fillRoundRect(ctx, 526, 326, 748, 184, 42, 'rgba(255,255,255,0.9)');
    strokeRoundRect(ctx, 526, 326, 748, 184, 42, INK, 7);
    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 24px ${FONT_STACK}`;
    ctx.fillText(roleLabel, 572, 374);
    
    // CORREÇÃO: Reduzido a maxWidth do Nome de 620 para 498 (Para não bater na Div de CT&I)
    drawFittedText(ctx, memberName.toUpperCase(), 572, 448, 498, 62, { minSize: 34, weight: 900 });
    
    fillRoundRect(ctx, 1090, 366, 128, 72, 24, LIME);
    strokeRoundRect(ctx, 1090, 366, 128, 72, 24, INK, 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // CORREÇÃO: Alinhamento CT&I
    ctx.font = `900 22px ${FONT_STACK}`;
    ctx.fillText('CT&I', 1154, 402);
    ctx.textAlign = 'left';

    drawLabelValue(ctx, 'Matricula', getMatricula(selectedMember), 526, 548, 330);
    drawLabelValue(ctx, 'Turma', getStudentClass(selectedMember), 884, 548, 220);
    drawLabelValue(ctx, 'Validade', `12/${currentYear}`, 1132, 548, 178);
    drawBarcode(ctx, 526, 684, 560, 98, membershipBarcodeValue);

    return canvas.toDataURL('image/png');
};

export default function MembershipCardGenerator({
    viewingClub,
    viewingClubSchool,
    mentors = [],
    students = [],
    clubBannerUrl = '',
    clubLogoUrl = '',
    loggedUser = null,
    canManageTemplate = false,
    onChangeTemplate = async () => {},
}) {
    const isMentorViewer = isMentorProfile(loggedUser?.perfil);

    const normalizedMembers = useMemo(() => {
        const allMembers = [
            ...(Array.isArray(students) ? students : []).map((member) => ({ ...member, __role: 'clubista' })),
            ...(Array.isArray(mentors) ? mentors : []).map((member) => ({ ...member, __role: 'mentor' })),
        ].filter(Boolean);

        const byKey = new Map();
        allMembers.forEach((member, index) => {
            const cardKey = getStudentKey(member, index);
            const current = byKey.get(cardKey);
            if (!current || member.__role === 'mentor') {
                byKey.set(cardKey, {
                    ...member,
                    cardKey,
                    cardRole: member.__role === 'mentor' || isMentorProfile(member?.perfil) ? 'mentor' : 'clubista',
                });
            }
        });

        return [...byKey.values()];
    }, [mentors, students]);

    const userKeys = useMemo(() => new Set([
        loggedUser?.id, loggedUser?.uid, loggedUser?.email, loggedUser?.matricula,
    ].map((value) => String(value || '').trim()).filter(Boolean)), [loggedUser]);

    const visibleMembers = useMemo(() => {
        if (isMentorViewer) return normalizedMembers;

        return normalizedMembers.filter((member) => (
            [member.id, member.uid, member.email, member.matricula]
                .map((value) => String(value || '').trim())
                .some((value) => userKeys.has(value))
        ));
    }, [isMentorViewer, normalizedMembers, userKeys]);

    const mentorCandidates = useMemo(() => (
        normalizedMembers.filter((member) => member.cardRole === 'mentor')
    ), [normalizedMembers]);

    const activeSigningMentor = useMemo(() => {
        if (isMentorViewer) {
            const ownMentor = mentorCandidates.find((mentor) => (
                [mentor.id, mentor.uid, mentor.email, mentor.matricula]
                    .map((value) => String(value || '').trim())
                    .some((value) => userKeys.has(value))
            ));
            if (ownMentor) return ownMentor;
            if (isMentorProfile(loggedUser?.perfil)) return loggedUser;
        }
        return mentorCandidates[0] || null;
    }, [isMentorViewer, loggedUser, mentorCandidates, userKeys]);

    const preferredStudentKey = useMemo(() => {
        const match = visibleMembers.find((student) => (
            [student.id, student.uid, student.email, student.matricula]
                .map((value) => String(value || '').trim())
                .some((value) => userKeys.has(value))
        ));

        return match?.cardKey || visibleMembers[0]?.cardKey || '';
    }, [userKeys, visibleMembers]);

    const [selectedStudentKey, setSelectedStudentKey] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const [signatureOverrideDataUrl, setSignatureOverrideDataUrl] = useState('');
    const clubTemplateId = useMemo(() => normalizeCardTemplateId(viewingClub?.carteirinha_modelo), [viewingClub?.carteirinha_modelo]);
    const [templateChoiceId, setTemplateChoiceId] = useState(clubTemplateId);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateSaveError, setTemplateSaveError] = useState('');
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [verificationInput, setVerificationInput] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [verificationError, setVerificationError] = useState('');
    const [isVerifyingCard, setIsVerifyingCard] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCameraScanning, setIsCameraScanning] = useState(false);
    const [scannerError, setScannerError] = useState('');
    const scannerVideoRef = useRef(null);
    const scannerStreamRef = useRef(null);
    const scannerFrameRef = useRef(0);
    const scannerDetectorRef = useRef(null);
    const isBarcodeDetectorSupported = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return typeof window.BarcodeDetector === 'function'
            && Boolean(window.navigator?.mediaDevices?.getUserMedia);
    }, []);

    useEffect(() => {
        setTemplateChoiceId(clubTemplateId);
    }, [clubTemplateId]);

    useEffect(() => {
        if (visibleMembers.length === 0) {
            if (selectedStudentKey) setSelectedStudentKey('');
            return;
        }

        const hasSelected = visibleMembers.some((student) => student.cardKey === selectedStudentKey);
        if (!hasSelected) {
            setSelectedStudentKey(preferredStudentKey);
        }
    }, [visibleMembers, preferredStudentKey, selectedStudentKey]);

    useEffect(() => {
        setVerificationInput('');
        setVerificationError('');
        setVerificationResult(null);
        setScannerError('');
    }, [selectedStudentKey, viewingClub?.id]);

    const selectedMember = visibleMembers.find((student) => student.cardKey === selectedStudentKey) || visibleMembers[0] || null;
    const studentPhotoUrl = getAvatarSrc(selectedMember);
    const clubName = safeText(viewingClub?.nome, 'Clube de Ciencias');
    const studentName = safeText(selectedMember?.nome, 'Membro');
    const schoolName = safeText(viewingClubSchool?.nome || viewingClub?.escola_nome || selectedMember?.escola_nome, 'Unidade escolar');
    const currentYear = new Date().getFullYear();
    const membershipNumber = selectedMember ? buildMembershipNumber(viewingClub, selectedMember) : '';
    const membershipBarcodeValue = selectedMember
        ? buildMembershipBarcodeValue(viewingClub, selectedMember, selectedMember?.cardRole || 'clubista', currentYear)
        : '';
    const memberRoleLabel = selectedMember?.cardRole === 'mentor' ? 'Mentor(a)' : 'Clubista';
    const filename = sanitizeFilename(`${clubName}${studentName}carteirinha`);
    const canSelectOtherMembers = isMentorViewer && visibleMembers.length > 1;
    const signatureImageUrl = signatureOverrideDataUrl;
    const signingMentorName = safeText(activeSigningMentor?.nome || loggedUser?.nome, 'Mentoria do Clube');
    const activeTemplateMeta = getCardTemplateMeta(templateChoiceId);

    const buildImage = () => createMembershipCardImage({
        viewingClub, viewingClubSchool, selectedMember, memberRole: selectedMember?.cardRole || 'clubista',
        signingMentorName, signatureImageUrl, clubBannerUrl, clubLogoUrl, templateId: templateChoiceId,
    });

    const handleTemplateSelectionChange = async (event) => {
        const nextTemplateId = normalizeCardTemplateId(event?.target?.value);
        if (!nextTemplateId || nextTemplateId === templateChoiceId) return;

        const previousTemplateId = templateChoiceId;
        setTemplateChoiceId(nextTemplateId);
        setTemplateSaveError('');

        if (!canManageTemplate) return;

        setIsSavingTemplate(true);
        try {
            await onChangeTemplate(nextTemplateId);
        } catch (error) {
            console.error('Falha ao definir modelo da carteirinha:', error);
            setTemplateChoiceId(previousTemplateId);
            setTemplateSaveError(String(error?.message || 'Nao foi possivel salvar o modelo da carteirinha.'));
        } finally {
            setIsSavingTemplate(false);
        }
    };

    useEffect(() => {
        let isActive = true;

        if (!selectedMember) {
            setPreviewImageUrl('');
            setIsPreviewLoading(false);
            return () => {
                isActive = false;
            };
        }

        setIsPreviewLoading(true);

        void createMembershipCardImage({
            viewingClub,
            viewingClubSchool,
            selectedMember,
            memberRole: selectedMember?.cardRole || 'clubista',
            signingMentorName,
            signatureImageUrl,
            clubBannerUrl,
            clubLogoUrl,
            templateId: templateChoiceId,
        })
            .then((dataUrl) => {
                if (!isActive) return;
                setPreviewImageUrl(String(dataUrl || ''));
            })
            .catch((error) => {
                console.error('Falha ao gerar pre-visualizacao da carteirinha:', error);
                if (!isActive) return;
                setPreviewImageUrl('');
            })
            .finally(() => {
                if (!isActive) return;
                setIsPreviewLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [
        viewingClub,
        viewingClubSchool,
        selectedMember,
        signingMentorName,
        signatureImageUrl,
        clubBannerUrl,
        clubLogoUrl,
        templateChoiceId,
    ]);

    const stopCameraScanner = useCallback(() => {
        if (scannerFrameRef.current) {
            window.cancelAnimationFrame(scannerFrameRef.current);
            scannerFrameRef.current = 0;
        }

        if (scannerStreamRef.current) {
            scannerStreamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch {
                    // noop
                }
            });
            scannerStreamRef.current = null;
        }

        if (scannerVideoRef.current) {
            scannerVideoRef.current.srcObject = null;
        }

        scannerDetectorRef.current = null;
        setIsCameraScanning(false);
    }, []);

    useEffect(() => () => {
        stopCameraScanner();
    }, [stopCameraScanner]);

    const handleUseCurrentCardCode = () => {
        if (!membershipBarcodeValue) return;
        setVerificationInput(membershipBarcodeValue);
        setVerificationError('');
        setVerificationResult(null);
    };

    const handleVerifyCard = async () => {
        const codeToVerify = String(verificationInput || '').trim();
        if (!codeToVerify) {
            setVerificationError('Informe ou escaneie um codigo de carteirinha para validar.');
            setVerificationResult(null);
            return;
        }

        setIsVerifyingCard(true);
        setVerificationError('');
        setVerificationResult(null);

        try {
            let token = '';
            try {
                token = await auth?.currentUser?.getIdToken?.();
            } catch {
                token = '';
            }

            const response = await fetch('/api/teacher/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ code: codeToVerify }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(String(payload?.error || 'Nao foi possivel validar a carteirinha agora.'));
            }

            setVerificationResult(payload);
        } catch (error) {
            console.error('Falha ao validar carteirinha:', error);
            setVerificationError(String(error?.message || 'Nao foi possivel validar a carteirinha.'));
        } finally {
            setIsVerifyingCard(false);
        }
    };

    const handleStartCameraScanner = useCallback(async () => {
        if (!isBarcodeDetectorSupported) {
            setScannerError('Leitura por camera indisponivel neste navegador/dispositivo.');
            return;
        }

        setScannerError('');
        setVerificationError('');
        setVerificationResult(null);
        setIsScannerOpen(true);
        stopCameraScanner();

        try {
            const stream = await window.navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                },
                audio: false,
            });

            const videoElement = scannerVideoRef.current;
            if (!videoElement) {
                throw new Error('Elemento de video indisponivel para leitura.');
            }

            scannerStreamRef.current = stream;
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', 'true');
            await videoElement.play();

            scannerDetectorRef.current = new window.BarcodeDetector({
                formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
            });
            setIsCameraScanning(true);

            let isDetecting = false;
            const scanLoop = async () => {
                if (!scannerDetectorRef.current || !scannerVideoRef.current || !scannerStreamRef.current) {
                    return;
                }

                if (!isDetecting && scannerVideoRef.current.readyState >= 2) {
                    isDetecting = true;
                    try {
                        const foundCodes = await scannerDetectorRef.current.detect(scannerVideoRef.current);
                        const firstCode = (foundCodes || []).find((item) => String(item?.rawValue || '').trim());
                        if (firstCode) {
                            const detectedValue = String(firstCode.rawValue || '').trim();
                            setVerificationInput(detectedValue);
                            setIsScannerOpen(false);
                            stopCameraScanner();
                            return;
                        }
                    } catch {
                        // ignore transient camera detection errors
                    } finally {
                        isDetecting = false;
                    }
                }

                scannerFrameRef.current = window.requestAnimationFrame(scanLoop);
            };

            scannerFrameRef.current = window.requestAnimationFrame(scanLoop);
        } catch (error) {
            console.error('Falha ao iniciar scanner de barcode:', error);
            setScannerError('Nao foi possivel acessar a camera para leitura do codigo de barras.');
            setIsScannerOpen(false);
            stopCameraScanner();
        }
    }, [isBarcodeDetectorSupported, stopCameraScanner]);

    const handleCloseScanner = () => {
        setIsScannerOpen(false);
        stopCameraScanner();
    };

    const handleSignatureFileChange = async (event) => {
        const file = event?.target?.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl) setSignatureOverrideDataUrl(dataUrl);
        } catch (error) {
            console.error(error);
            setExportError('Nao foi possivel carregar a assinatura selecionada.');
        } finally {
            if (event?.target) event.target.value = '';
        }
    };

    const handleDownload = async () => {
        if (!selectedMember || isExporting) return;

        setIsExporting(true);
        setExportError('');

        try {
            const dataUrl = await buildImage();
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Falha ao gerar carteirinha:', error);
            setExportError('Nao foi possivel baixar a imagem. Verifique se banner, logo e foto carregaram corretamente.');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = async () => {
        if (!selectedMember || isExporting) return;

        setIsExporting(true);
        setExportError('');

        try {
            const dataUrl = await buildImage();
            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                setExportError('O navegador bloqueou a janela de impressao.');
                return;
            }

            printWindow.document.write(`
                <!doctype html>
                <html>
                    <head>
                        <title>Carteirinha do Clube</title>
                        <style>
                            @page { size: landscape; margin: 12mm; }
                            * { box-sizing: border-box; }
                            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; font-family: Arial, sans-serif; }
                            img { width: min(92vw, 900px); height: auto; display: block; }
                            @media print { body { background: #fff; } img { width: 100%; max-width: 900px; } }
                        </style>
                    </head>
                    <body>
                        <img src="${dataUrl}" alt="Carteirinha do clube" />
                        <script>
                            window.addEventListener('load', function () {
                                setTimeout(function () {
                                    window.focus();
                                    window.print();
                                }, 250);
                            });
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error('Falha ao imprimir carteirinha:', error);
            setExportError('Nao foi possivel preparar a impressao da carteirinha.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="bg-white border-[3px] border-slate-900 rounded-[3rem] p-6 md:p-10 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#0f172a 2px, transparent 2px)', backgroundSize: '18px 18px' }} />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8 border-b-[3px] border-slate-900 pb-5">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase flex items-center gap-3">
                        <IdCard className="w-8 h-8 stroke-[2.5] text-pink-500" /> Carteirinha do Clube
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-cyan-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                            <Images className="w-4 h-4 stroke-[3]" />
                            Banner + logo
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-yellow-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                            <Sparkles className="w-4 h-4 stroke-[3]" />
                            Modelo: {activeTemplateMeta.label}
                        </span>
                    </div>
                </div>

                <div className="inline-flex items-center gap-3 rounded-full border-[3px] border-slate-900 bg-lime-300 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm">
                    <BadgeCheck className="w-5 h-5 stroke-[3]" />
                    {visibleMembers.length} carteirinha{visibleMembers.length === 1 ? '' : 's'}
                </div>
            </div>

            {visibleMembers.length === 0 ? (
                <div className="relative z-10 rounded-[2rem] border-[3px] border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                    <UserRound className="mx-auto mb-4 h-12 w-12 text-slate-400 stroke-[2]" />
                    <p className="text-lg font-black uppercase tracking-widest text-slate-500">
                        {isMentorViewer ? 'Nenhum membro vinculado.' : 'Sua carteirinha nao esta disponivel para este clube.'}
                    </p>
                </div>
            ) : (
                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    <div className="xl:col-span-4 space-y-5">
                        {canSelectOtherMembers ? (
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-900">
                                    Selecione mentor(a) ou clubista
                                </label>
                                <select
                                    value={selectedStudentKey}
                                    onChange={(event) => setSelectedStudentKey(event.target.value)}
                                    className="w-full rounded-[1.5rem] border-[3px] border-slate-900 bg-white px-5 py-4 text-sm font-black uppercase text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] outline-none transition-all focus:translate-x-1 focus:translate-y-1 focus:shadow-[7px_7px_0px_0px_#0f172a]"
                                >
                                    {visibleMembers.map((student) => (
                                        <option key={student.cardKey} value={student.cardKey}>
                                            {safeText(student.nome, 'Membro')} ({student.cardRole === 'mentor' ? 'Mentor(a)' : 'Clubista'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border-[3px] border-slate-900 bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm">
                                Exibindo apenas sua carteirinha
                            </div>
                        )}

                        {canManageTemplate ? (
                            <div className="rounded-[1.5rem] border-[3px] border-slate-900 bg-white px-5 py-4 shadow-sm">
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-900">
                                    Modelo oficial adotado pelo clube
                                </label>
                                <select
                                    value={templateChoiceId}
                                    onChange={handleTemplateSelectionChange}
                                    disabled={isSavingTemplate || isExporting}
                                    className="w-full rounded-[1.2rem] border-[3px] border-slate-900 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-900 outline-none disabled:opacity-60"
                                >
                                    {CARD_TEMPLATES.map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-600">
                                    {isSavingTemplate ? 'Salvando modelo oficial...' : activeTemplateMeta.summary}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border-[3px] border-slate-900 bg-white px-5 py-4 text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-sm">
                                Modelo oficial do clube: {activeTemplateMeta.label}
                            </div>
                        )}

                        {templateSaveError && (
                            <p className="rounded-[1.5rem] border-[3px] border-slate-900 bg-pink-500 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                                {templateSaveError}
                            </p>
                        )}

                        <div className="rounded-[2rem] border-[3px] border-slate-900 bg-yellow-400 p-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.25rem] border-[3px] border-slate-900 bg-white flex items-center justify-center text-lg font-black text-slate-900">
                                    {studentPhotoUrl ? (
                                        <img src={studentPhotoUrl} alt={studentName} className="h-full w-full object-cover" />
                                    ) : (
                                        <span>{getInitials(studentName)}</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="line-clamp-1 text-lg font-black uppercase leading-tight text-slate-900">{studentName}</p>
                                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-800">{memberRoleLabel}</p>
                                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-700">{membershipNumber}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={isExporting}
                                className="inline-flex items-center justify-center gap-3 rounded-full border-[3px] border-slate-900 bg-cyan-300 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                <Download className="w-4 h-4 stroke-[3]" />
                                {isExporting ? 'Gerando...' : 'Baixar PNG'}
                            </button>

                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={isExporting}
                                className="inline-flex items-center justify-center gap-3 rounded-full border-[3px] border-slate-900 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                <Printer className="w-4 h-4 stroke-[3]" />
                                Imprimir
                            </button>
                        </div>

                        <div className="rounded-[1.5rem] border-[3px] border-slate-900 bg-white px-5 py-4 shadow-sm">
                            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-900">
                                Validador de carteirinha
                            </label>
                            <input
                                type="text"
                                value={verificationInput}
                                onChange={(event) => setVerificationInput(event.target.value)}
                                placeholder="Cole ou escaneie o codigo de barras"
                                className="w-full rounded-[1rem] border-[3px] border-slate-900 bg-slate-50 px-4 py-3 text-xs font-black tracking-wide text-slate-900 outline-none"
                            />

                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={handleUseCurrentCardCode}
                                    className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-cyan-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900"
                                >
                                    Usar codigo desta carteirinha
                                </button>

                                <button
                                    type="button"
                                    onClick={handleStartCameraScanner}
                                    disabled={!isBarcodeDetectorSupported || isCameraScanning}
                                    className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900 disabled:opacity-50"
                                >
                                    {isCameraScanning ? 'Lendo camera...' : 'Ler codigo com camera'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleVerifyCard}
                                    disabled={isVerifyingCard}
                                    className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-lime-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900 disabled:opacity-50"
                                >
                                    {isVerifyingCard ? 'Validando...' : 'Validar codigo'}
                                </button>
                            </div>

                            {!!membershipBarcodeValue && (
                                <p className="mt-3 rounded-[0.9rem] border-[2px] border-slate-900 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 break-all">
                                    Codigo atual: {membershipBarcodeValue}
                                </p>
                            )}

                            {scannerError && (
                                <p className="mt-3 rounded-[0.9rem] border-[2px] border-slate-900 bg-amber-200 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-900">
                                    {scannerError}
                                </p>
                            )}

                            {verificationError && (
                                <p className="mt-3 rounded-[0.9rem] border-[2px] border-slate-900 bg-pink-500 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white">
                                    {verificationError}
                                </p>
                            )}

                            {verificationResult && (
                                <div className={`mt-3 rounded-[1rem] border-[3px] border-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-wide ${
                                    verificationResult?.valid ? 'bg-cyan-300 text-slate-900' : 'bg-pink-500 text-white'
                                }`}>
                                    <p>{verificationResult?.valid ? 'Carteirinha valida' : 'Carteirinha invalida'}</p>
                                    <p className="mt-1 text-[10px] font-bold tracking-normal normal-case">
                                        {String(verificationResult?.reason || '')}
                                    </p>
                                    {!!verificationResult?.member?.nome && (
                                        <p className="mt-1 text-[10px] font-bold tracking-normal normal-case">
                                            Membro: {verificationResult.member.nome}
                                        </p>
                                    )}
                                    {!!verificationResult?.club?.nome && (
                                        <p className="mt-1 text-[10px] font-bold tracking-normal normal-case">
                                            Clube: {verificationResult.club.nome}
                                        </p>
                                    )}
                                    {!!verificationResult?.card?.expiryDate && (
                                        <p className="mt-1 text-[10px] font-bold tracking-normal normal-case">
                                            Validade: {verificationResult.card.expiryDate}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {exportError && (
                            <p className="rounded-[1.5rem] border-[3px] border-slate-900 bg-pink-500 px-5 py-4 text-xs font-black uppercase tracking-wider text-white shadow-sm">
                                {exportError}
                            </p>
                        )}
                    </div>

                    <div className="xl:col-span-8">
                        <div className="mx-auto w-full max-w-[760px]">
                            <div className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-slate-900 bg-slate-100 shadow-[10px_10px_0px_0px_#0f172a]" style={{ aspectRatio: '1.586 / 1' }}>
                                {previewImageUrl ? (
                                    <img
                                        src={previewImageUrl}
                                        alt={`Pre-visualizacao da carteirinha de ${studentName}`}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#bef264_0%,#67e8f9_45%,#f9a8d4_100%)]">
                                        <p className="rounded-full border-[3px] border-slate-900 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm">
                                            Gerando pre-visualizacao...
                                        </p>
                                    </div>
                                )}

                                {isPreviewLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px]">
                                        <p className="rounded-full border-[3px] border-slate-900 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                                            Atualizando modelo da carteirinha
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isScannerOpen && (
                <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-xl rounded-[2rem] border-[3px] border-slate-900 bg-white p-5 shadow-[10px_10px_0px_0px_#0f172a]">
                        <p className="text-sm font-black uppercase tracking-widest text-slate-900">
                            Aponte a camera para o codigo de barras
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                            Encoste a carteirinha na area da camera e aguarde a leitura automatica.
                        </p>

                        <div className="mt-4 overflow-hidden rounded-[1.2rem] border-[3px] border-slate-900 bg-slate-200 aspect-video">
                            <video
                                ref={scannerVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={handleCloseScanner}
                                className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-900"
                            >
                                Fechar scanner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
