async function requestLattesExtraction(body) {
    const response = await fetch('/api/lattes/extract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(
            payload?.error
            || payload?.message
            || 'Falha ao consultar os dados do Lattes.'
        );
    }

    return payload;
}

export async function fetchLattesPreviewByLink(link) {
    return requestLattesExtraction({
        link: String(link || '').trim()
    });
}

export async function fetchLattesPreviewByHtml({ link, html }) {
    return requestLattesExtraction({
        link: String(link || '').trim(),
        html: String(html || '')
    });
}

