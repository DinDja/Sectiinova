import React, { useId } from 'react';

export default function PioneerSealSymbol({
    className = 'h-24 w-24',
    title = 'Selo Pioneiros'
}) {
    const safeId = useId().replace(/:/g, '');
    const awardGradientId = `${safeId}-awardGradient`;
    const pioneerGlowId = `${safeId}-pioneerGlow`;

    return (
        <svg
            viewBox="0 0 500 500"
            className={className}
            role="img"
            aria-label={title}
        >
            <defs>
                <linearGradient id={awardGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fef3c7" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                </linearGradient>

                <filter id={pioneerGlowId} x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            <circle cx="250" cy="230" r="185" fill="#111827" stroke={`url(#${awardGradientId})`} strokeWidth="4" />

            <circle cx="250" cy="230" r="195" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="8 20" opacity="0.5">
                <animateTransform attributeName="transform" type="rotate" from="0 250 230" to="360 250 230" dur="90s" repeatCount="indefinite" />
            </circle>

            <g fill="none" stroke="#fbbf24" strokeWidth="2">
                <path d="M 120 300 Q 150 350 250 350" opacity="0.6" />
                <path d="M 380 300 Q 350 350 250 350" opacity="0.6" />
                <polygon points="120,300 115,290 125,285" fill="#fef3c7" opacity="0.8" />
                <polygon points="380,300 385,290 375,285" fill="#fef3c7" opacity="0.8" />
                <path d="M 140 318 A 8 8 0 0 1 155 330" />
                <path d="M 360 318 A 8 8 0 0 0 345 330" />
            </g>

            <g transform="translate(250, 215)" filter={`url(#${pioneerGlowId})`}>
                <animate attributeName="opacity" values="1; 0.8; 1" dur="4s" repeatCount="indefinite" />
                <path d="M 0 -90 L 25 -30 L 90 -20 L 40 20 L 60 85 L 0 50 L -60 85 L -40 20 L -90 -20 L -25 -30 Z" fill="#0f172a" stroke={`url(#${awardGradientId})`} strokeWidth="5" />

                <path d="M 0 -70 L -10 -35 L 10 -35 Z" fill="#fef3c7" />
                <line x1="0" y1="-70" x2="0" y2="30" stroke="#fef3c7" strokeWidth="3" />

                <circle cx="0" cy="0" r="10" fill="#fef3c7" />
            </g>

            <text
                x="250"
                y="445"
                fontFamily="Verdana, Geneva, sans-serif"
                fontWeight="700"
                fontSize="18"
                fill="#fef3c7"
                letterSpacing="8"
                textAnchor="middle"
            >
                CLUBES DE CIENCIAS
            </text>

            <text
                x="250"
                y="480"
                fontFamily="Verdana, Geneva, sans-serif"
                fontWeight="900"
                fontSize="30"
                fill={`url(#${awardGradientId})`}
                letterSpacing="12"
                textAnchor="middle"
            >
                PIONEIROS
            </text>
        </svg>
    );
}