export async function fetchLattesPreviewByLink(link) {
    const response = await fetch('/api/lattes/extract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ link: String(link || '').trim() })
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

